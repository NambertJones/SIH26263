"""Validation and reconciliation engine."""

from datetime import date, datetime
import re
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.services.privacy import mask_apaar
from app.models.student import Student
from app.models.submission import Submission
from app.models.institution import Programme, Institution
from app.models.validation import ValidationIssue
from app.models.verification import VerificationCase, CaseEvent
from app.models.intake import IntakeReference


ALLOWED_GENDERS = {"male", "female", "other", "transgender", "non-binary"}
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")


def validate_submission(db: Session, submission_id: str) -> dict:
    """Run full deterministic validation rules on a submission's students."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission {submission_id} not found")

    students = db.query(Student).filter(
        Student.submission_id == submission_id,
        Student.is_latest.is_(True),
    ).order_by(Student.row_number).all()

    if not students:
        return {
            "submission_id": submission_id,
            "total_records": 0,
            "valid_records": 0,
            "error_records": 0,
            "warning_records": 0,
            "status": "validated",
        }

    # Delete existing validation issues for this submission
    db.query(ValidationIssue).filter(ValidationIssue.submission_id == submission_id).delete()

    # Pre-fetch cross-institution APAAR IDs
    current_apaar_ids = [s.apaar_id.strip() for s in students if s.apaar_id]
    cross_institution_matches = {}
    if current_apaar_ids:
        cross_students = db.query(Student, Institution.name).join(
            Institution, Student.institution_id == Institution.id
        ).filter(
            Student.apaar_id.in_(current_apaar_ids),
            Student.institution_id != submission.institution_id,
            Student.enrollment_status == "active",
            Student.is_latest.is_(True),
        ).all()

        for cs, inst_name in cross_students:
            if cs.apaar_id:
                cross_institution_matches[cs.apaar_id] = inst_name

    # Check intra-file APAAR counts
    apaar_counts: dict[str, int] = {}
    for s in students:
        if s.apaar_id:
            cleaned = s.apaar_id.strip()
            apaar_counts[cleaned] = apaar_counts.get(cleaned, 0) + 1

    # Programme intake limit — counted cumulatively across ALL finalized submissions
    # of this programme, not just this one file (otherwise a college could split
    # 200 students into two uploads of 100 against a 120-seat programme).
    approved_intake = None
    permitted_total = None
    already_enrolled = 0
    programme_name = "Selected Programme"
    if submission.programme_id:
        prog = db.query(Programme).filter(
            Programme.id == submission.programme_id,
            Programme.institution_id == submission.institution_id,
        ).first()
        if prog:
            approved_intake = prog.approved_intake
            permitted_total = (
                (prog.approved_intake or 0)
                + (prog.supernumerary_seats or 0)
                + (prog.nri_seats or 0)
            )
            programme_name = prog.name
            already_enrolled = (
                db.query(func.count(Student.id))
                .outerjoin(Submission, Student.submission_id == Submission.id)
                .filter(
                    Student.programme_id == prog.id,
                    Student.institution_id == submission.institution_id,
                    Student.is_latest.is_(True),
                    Student.enrollment_status == "active",
                    Student.submission_id.is_distinct_from(submission.id),
                    # records loaded directly, or from submissions that were finalized
                    (Student.submission_id.is_(None)) | (Submission.status == "submitted"),
                )
                .scalar()
            ) or 0

    new_issues: list[ValidationIssue] = []
    student_issues_map: dict[str, list[ValidationIssue]] = {}

    today = date.today()

    # Rule checks per student
    for s in students:
        s_issues = []

        # 1. Required Fields
        if not s.name or not s.name.strip():
            s_issues.append(ValidationIssue(
                submission_id=submission.id,
                student_id=s.id,
                rule_code="MISSING_REQUIRED",
                severity="error",
                field_name="name",
                description="Student name is required.",
                row_number=s.row_number,
            ))

        if not s.apaar_id or not s.apaar_id.strip():
            s_issues.append(ValidationIssue(
                submission_id=submission.id,
                student_id=s.id,
                rule_code="MISSING_REQUIRED",
                severity="error",
                field_name="apaar_id",
                description="APAAR ID is mandatory for registration.",
                row_number=s.row_number,
            ))
        else:
            clean_apaar = s.apaar_id.strip()
            # 2. APAAR Format Check (12 digits)
            if not re.match(r"^\d{12}$", clean_apaar):
                s_issues.append(ValidationIssue(
                    submission_id=submission.id,
                    student_id=s.id,
                    rule_code="FMT_APAAR",
                    severity="error",
                    field_name="apaar_id",
                    description=f"Invalid APAAR ID format ({len(s.apaar_id.strip())} characters). Must be exactly 12 numeric digits (format check only).",
                    row_number=s.row_number,
                ))
            else:
                # 3. Duplicate APAAR within file
                if apaar_counts.get(clean_apaar, 0) > 1:
                    s_issues.append(ValidationIssue(
                        submission_id=submission.id,
                        student_id=s.id,
                        rule_code="DUP_APAAR_SAME",
                        severity="error",
                        field_name="apaar_id",
                        description=f"Duplicate APAAR ID '{clean_apaar}' appears {apaar_counts[clean_apaar]} times in this submission.",
                        row_number=s.row_number,
                    ))

                # 4. Cross-Institution Duplicate
                if clean_apaar in cross_institution_matches:
                    other_inst = cross_institution_matches[clean_apaar]
                    s_issues.append(ValidationIssue(
                        submission_id=submission.id,
                        student_id=s.id,
                        rule_code="DUP_APAAR_CROSS",
                        severity="error",
                        field_name="apaar_id",
                        description=f"Cross-institution duplicate: APAAR ID '{clean_apaar}' is actively enrolled at '{other_inst}'.",
                        row_number=s.row_number,
                    ))

        # 5. Date of Birth Check
        if not s.date_of_birth:
            s_issues.append(ValidationIssue(
                submission_id=submission.id,
                student_id=s.id,
                rule_code="MISSING_REQUIRED",
                severity="error",
                field_name="date_of_birth",
                description="Date of birth is required.",
                row_number=s.row_number,
            ))
        else:
            if s.date_of_birth >= today:
                s_issues.append(ValidationIssue(
                    submission_id=submission.id,
                    student_id=s.id,
                    rule_code="FMT_DOB",
                    severity="error",
                    field_name="date_of_birth",
                    description=f"Date of birth ({s.date_of_birth}) cannot be today or in the future.",
                    row_number=s.row_number,
                ))
            else:
                age = today.year - s.date_of_birth.year - (
                    (today.month, today.day) < (s.date_of_birth.month, s.date_of_birth.day)
                )
                if age < 15:
                    s_issues.append(ValidationIssue(
                        submission_id=submission.id,
                        student_id=s.id,
                        rule_code="FMT_DOB",
                        severity="error",
                        field_name="date_of_birth",
                        description=f"Candidate age is {age} years ({s.date_of_birth}), below the plausible minimum for technical education.",
                        row_number=s.row_number,
                    ))
                elif age < 16:
                    s_issues.append(ValidationIssue(
                        submission_id=submission.id,
                        student_id=s.id,
                        rule_code="FMT_DOB",
                        severity="warning",
                        field_name="date_of_birth",
                        description=f"Candidate age is {age} years ({s.date_of_birth}). Please verify.",
                        row_number=s.row_number,
                    ))

        # 6. Enrollment Date Inconsistency
        if s.enrollment_date and s.date_of_birth:
            if s.enrollment_date <= s.date_of_birth:
                s_issues.append(ValidationIssue(
                    submission_id=submission.id,
                    student_id=s.id,
                    rule_code="DATE_INCONSIST",
                    severity="error",
                    field_name="enrollment_date",
                    description=f"Enrollment date ({s.enrollment_date}) cannot be on or before date of birth ({s.date_of_birth}).",
                    row_number=s.row_number,
                ))
            elif s.enrollment_date > today:
                s_issues.append(ValidationIssue(
                    submission_id=submission.id,
                    student_id=s.id,
                    rule_code="DATE_INCONSIST",
                    severity="warning",
                    field_name="enrollment_date",
                    description=f"Enrollment date ({s.enrollment_date}) is in the future.",
                    row_number=s.row_number,
                ))

        # 7. Gender format
        if s.gender:
            if s.gender.lower().strip() not in ALLOWED_GENDERS:
                s_issues.append(ValidationIssue(
                    submission_id=submission.id,
                    student_id=s.id,
                    rule_code="FMT_GENDER",
                    severity="warning",
                    field_name="gender",
                    description=f"Unrecognized gender '{s.gender}'. Allowed: Male, Female, Other, Transgender.",
                    row_number=s.row_number,
                ))

        # 8. Email format
        if s.email and not EMAIL_REGEX.match(s.email.strip()):
            s_issues.append(ValidationIssue(
                submission_id=submission.id,
                student_id=s.id,
                rule_code="FMT_EMAIL",
                severity="warning",
                field_name="email",
                description=f"Invalid email format: '{s.email}'.",
                row_number=s.row_number,
            ))

        new_issues.extend(s_issues)
        student_issues_map[s.id] = s_issues

    # 9. Intake Capacity Exceeded Check (cumulative across finalized submissions)
    active_in_file = [s for s in students if (s.enrollment_status or "active") == "active"]
    if permitted_total is not None and already_enrolled + len(active_in_file) > permitted_total:
        remaining = max(permitted_total - already_enrolled, 0)
        total_after = already_enrolled + len(active_in_file)
        exceeded_by = total_after - permitted_total
        for s in active_in_file[remaining:]:
            intake_issue = ValidationIssue(
                submission_id=submission.id,
                student_id=s.id,
                rule_code="INTAKE_EXCEED",
                severity="error",
                field_name="programme",
                description=(
                    f"Potential intake discrepancy — review required: intake reference for '{programme_name}' is "
                    f"{permitted_total} seats (reference {approved_intake} + supernumerary/NRI). {already_enrolled} already enrolled, "
                    f"this file adds {len(active_in_file)} → {total_after} (+{exceeded_by}). Flagged for oversight review."
                ),
                row_number=s.row_number,
            )
            new_issues.append(intake_issue)
            student_issues_map.setdefault(s.id, []).append(intake_issue)

    # Save validation issues
    if new_issues:
        db.add_all(new_issues)

    # Update individual student validation status
    valid_count = 0
    error_count = 0
    warning_count = 0

    for s in students:
        issues = student_issues_map.get(s.id, [])
        errors = [i for i in issues if i.severity == "error"]
        warnings = [i for i in issues if i.severity == "warning"]

        if errors:
            has_dup = any("DUP" in i.rule_code for i in errors)
            s.validation_status = "duplicate" if has_dup else "invalid"
            s.remarks = "; ".join([e.description for e in errors[:2]])
            error_count += 1
        elif warnings:
            s.validation_status = "warning"
            s.remarks = "; ".join([w.description for w in warnings[:2]])
            warning_count += 1
        else:
            s.validation_status = "valid"
            s.remarks = "All checks passed successfully."
            valid_count += 1

    # Update submission statistics
    submission.total_records = len(students)
    submission.valid_records = valid_count
    submission.error_records = error_count
    submission.warning_records = warning_count
    submission.status = "validated"
    submission.validated_at = datetime.utcnow()

    # Generate verification cases for records needing manual review
    _create_verification_cases_for_errors(db, submission, students, student_issues_map)

    db.commit()
    db.refresh(submission)

    return {
        "submission_id": submission.id,
        "total_records": len(students),
        "valid_records": valid_count,
        "error_records": error_count,
        "warning_records": warning_count,
        "status": submission.status,
    }


def _create_verification_cases_for_errors(
    db: Session,
    submission: Submission,
    students: list[Student],
    student_issues_map: dict[str, list[ValidationIssue]],
):
    """Automatically create verification cases for students with critical errors."""
    for s in students:
        issues = student_issues_map.get(s.id, [])
        error_issues = [i for i in issues if i.severity == "error"]
        if not error_issues:
            continue

        # Check if an open case already exists for this student
        existing_case = db.query(VerificationCase).filter(
            VerificationCase.student_id == s.id,
            VerificationCase.status.in_(["open", "under_review", "pending"]),
        ).first()

        if existing_case:
            continue

        primary_issue = error_issues[0]
        issue_type = "invalid_data"
        priority = "medium"

        if "DUP" in primary_issue.rule_code:
            issue_type = "duplicate_enrollment"
            priority = "high"
        elif "INTAKE" in primary_issue.rule_code:
            issue_type = "intake_mismatch"
            priority = "critical"

        new_case = VerificationCase(
            student_id=s.id,
            submission_id=submission.id,
            institution_id=submission.institution_id,
            issue_type=issue_type,
            title=f"Verification needed for {s.name} ({mask_apaar(s.apaar_id) if s.apaar_id else 'No APAAR'})",
            description=f"{primary_issue.rule_code}: {primary_issue.description}",
            priority=priority,
            status="open",
        )
        db.add(new_case)
        db.flush()

        # Log case created event
        initial_event = CaseEvent(
            case_id=new_case.id,
            actor_id=submission.uploaded_by,
            event_type="created",
            description=f"Case automatically generated from validation rule {primary_issue.rule_code}.",
        )
        db.add(initial_event)
