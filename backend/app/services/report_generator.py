"""Report and analytics aggregation service."""

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.services.privacy import mask_apaar
from app.models.student import Student
from app.models.submission import Submission
from app.models.institution import Programme, Institution
from app.models.validation import ValidationIssue
from app.models.verification import VerificationCase, CaseEvent
from app.models.audit import AuditLog


def get_dashboard_stats(db: Session, institution_id: str | None = None) -> dict:
    """Calculate summary dashboard stats."""
    student_query = db.query(Student).filter(Student.is_latest.is_(True))
    submission_query = db.query(Submission)
    case_query = db.query(VerificationCase)
    prog_query = db.query(Programme)

    if institution_id:
        student_query = student_query.filter(Student.institution_id == institution_id)
        submission_query = submission_query.filter(Submission.institution_id == institution_id)
        case_query = case_query.filter(VerificationCase.institution_id == institution_id)
        prog_query = prog_query.filter(Programme.institution_id == institution_id)

    total_students = student_query.count()
    valid_records = student_query.filter(Student.validation_status == "valid").count()
    issues_found = student_query.filter(Student.validation_status.in_(["invalid", "duplicate"])).count()
    pending_verification = student_query.filter(Student.validation_status.in_(["pending", "warning"])).count()

    total_submissions = submission_query.count()
    total_programmes = prog_query.count()
    open_cases = case_query.filter(VerificationCase.status.in_(["open", "under_review", "pending"])).count()

    valid_pct = round((valid_records / total_students * 100), 1) if total_students > 0 else 0.0
    pending_pct = round((pending_verification / total_students * 100), 1) if total_students > 0 else 0.0
    issues_pct = round((issues_found / total_students * 100), 1) if total_students > 0 else 0.0

    return {
        "total_students": total_students,
        "valid_records": valid_records,
        "valid_percentage": valid_pct,
        "pending_verification": pending_verification,
        "pending_percentage": pending_pct,
        "issues_found": issues_found,
        "issues_percentage": issues_pct,
        "total_submissions": total_submissions,
        "total_programmes": total_programmes,
        "open_cases": open_cases,
    }


def get_enrollment_by_program(db: Session, institution_id: str | None = None) -> list[dict]:
    """Enrollment figures compared with approved intake per programme."""
    prog_query = db.query(Programme)
    if institution_id:
        prog_query = prog_query.filter(Programme.institution_id == institution_id)

    programmes = prog_query.all()
    data = []

    for p in programmes:
        enrolled_count = db.query(Student).filter(
            Student.programme_id == p.id,
            Student.is_latest.is_(True),
            Student.enrollment_status == "active",
        ).count()

        utilization = round((enrolled_count / p.approved_intake * 100), 1) if p.approved_intake > 0 else 0.0

        name = p.name
        if not institution_id and p.institution is not None:
            name = f"{p.name} — {p.institution.name}"

        data.append({
            "programme_id": p.id,
            "programme_code": p.code,
            "programme_name": name,
            "approved_intake": p.approved_intake,
            "enrolled_count": enrolled_count,
            "utilization_percentage": utilization,
        })

    if not institution_id:
        data.sort(key=lambda d: d["utilization_percentage"], reverse=True)
    return data


def get_submission_status_breakdown(db: Session, institution_id: str | None = None) -> dict:
    """Pie/Donut chart data for valid, issues, and pending."""
    stats = get_dashboard_stats(db, institution_id)
    return {
        "valid": stats["valid_records"],
        "issues": stats["issues_found"],
        "pending": stats["pending_verification"],
    }


def get_recent_activity(db: Session, institution_id: str | None = None, limit: int = 10) -> list[dict]:
    """Combined recent activity feed from audit logs and case events."""
    audit_query = db.query(AuditLog)
    if institution_id:
        # Institution views only show actions taken by that institution's own users
        from app.models.user import User
        own_user_ids = db.query(User.id).filter(User.institution_id == institution_id)
        audit_query = audit_query.filter(AuditLog.actor_id.in_(own_user_ids))
    logs = audit_query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    feed = []
    for log in logs:
        feed.append({
            "id": log.id,
            "type": "audit",
            "action": log.action,
            "actor_email": log.actor_email or "System",
            "description": log.description or f"Action {log.action} on {log.entity_type or 'system'}",
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return feed


def get_discrepancy_report(db: Session, institution_id: str | None = None) -> list[dict]:
    """Generate detailed discrepancy items for export and reports screen."""
    query = db.query(ValidationIssue, Student).outerjoin(
        Student, ValidationIssue.student_id == Student.id
    )

    if institution_id:
        query = query.filter(Student.institution_id == institution_id)

    issues = query.order_by(ValidationIssue.created_at.desc()).limit(200).all()

    report = []
    for issue, student in issues:
        report.append({
            "issue_id": issue.id,
            "rule_code": issue.rule_code,
            "severity": issue.severity,
            "field_name": issue.field_name,
            "description": issue.description,
            "row_number": issue.row_number,
            "status": issue.status,
            "student_name": student.name if student else "N/A",
            "student_apaar_id": mask_apaar(student.apaar_id) if student else None,
            "created_at": issue.created_at.isoformat() if issue.created_at else None,
        })

    return report


def get_compliance_report(db: Session, institution_id: str | None = None) -> dict:
    """Generate compliance summary and metrics."""
    stats = get_dashboard_stats(db, institution_id)
    programmes = get_enrollment_by_program(db, institution_id)

    exceeded_count = sum(1 for p in programmes if p["enrolled_count"] > p["approved_intake"])
    duplicate_count = db.query(Student).filter(
        Student.is_latest.is_(True),
        Student.validation_status == "duplicate",
    )
    if institution_id:
        duplicate_count = duplicate_count.filter(Student.institution_id == institution_id)

    dup_count = duplicate_count.count()

    # Calculate compliance score out of 100
    score = 100
    if dup_count > 0:
        score -= min(30, dup_count * 5)
    if exceeded_count > 0:
        score -= min(40, exceeded_count * 15)
    if stats["issues_found"] > 0:
        score -= min(20, stats["issues_found"] * 2)

    return {
        "compliance_score": max(10, score),
        "status": "COMPLIANT" if score >= 80 else ("NEEDS_ATTENTION" if score >= 50 else "NON_COMPLIANT"),
        "total_students": stats["total_students"],
        "valid_percentage": stats["valid_percentage"],
        "duplicate_count": dup_count,
        "programmes_exceeded": exceeded_count,
        "open_verification_cases": stats["open_cases"],
        "programmes": programmes,
    }


INTAKE_COUNTED_STATUSES = ["active"]


def get_intake_reconciliation(db: Session, institution_id: str | None = None) -> list[dict]:
    """Per-programme intake comparison with an explicit, reproducible calculation.

    Reference = approved intake + supernumerary + NRI seats (the same total the
    validation engine uses). Outcomes are review prompts, never violations.
    """
    from app.models.intake import IntakeReference

    prog_query = db.query(Programme)
    if institution_id:
        prog_query = prog_query.filter(Programme.institution_id == institution_id)

    rows = []
    for p in prog_query.all():
        ref = (
            db.query(IntakeReference)
            .filter(IntakeReference.programme_id == p.id, IntakeReference.academic_year == p.academic_year)
            .order_by(IntakeReference.created_at.desc())
            .first()
        )
        enrolled = db.query(Student).filter(
            Student.programme_id == p.id,
            Student.is_latest.is_(True),
            Student.enrollment_status.in_(INTAKE_COUNTED_STATUSES),
        ).count()
        excluded = db.query(Student).filter(
            Student.programme_id == p.id,
            Student.is_latest.is_(True),
            ~Student.enrollment_status.in_(INTAKE_COUNTED_STATUSES),
        ).count()

        approved = p.approved_intake or 0
        supernumerary = p.supernumerary_seats or 0
        nri = p.nri_seats or 0
        reference_total = approved + supernumerary + nri

        if approved <= 0:
            outcome = "CANNOT_DETERMINE_MISSING_REFERENCE"
        elif enrolled > reference_total:
            outcome = "POTENTIAL_DISCREPANCY"
        else:
            outcome = "WITHIN_REFERENCE"

        open_cases = db.query(VerificationCase).filter(
            VerificationCase.institution_id == p.institution_id,
            VerificationCase.issue_type == "intake_mismatch",
            VerificationCase.status.in_(["open", "under_review", "pending"]),
        ).count()

        rows.append({
            "programme_id": p.id,
            "programme_code": p.code,
            "programme_name": p.name,
            "institution_id": p.institution_id,
            "institution_name": p.institution.name if p.institution else None,
            "academic_year": p.academic_year,
            "approved_intake": approved,
            "supernumerary_seats": supernumerary,
            "nri_seats": nri,
            "reference_total": reference_total,
            "enrolled_count": enrolled,
            "excluded_count": excluded,
            "difference": enrolled - reference_total,
            "counted_statuses": INTAKE_COUNTED_STATUSES,
            "outcome": outcome,
            "source": (ref.source if ref and ref.source else "Programme record (institution-entered)"),
            "source_status": "INSTITUTION_ENTERED",
            "reference_recorded_at": (ref.created_at.isoformat() if ref and ref.created_at else (p.created_at.isoformat() if p.created_at else None)),
            "open_intake_cases": open_cases,
        })

    rows.sort(key=lambda r: (r["outcome"] != "POTENTIAL_DISCREPANCY", r["institution_name"] or "", r["programme_code"]))
    return rows
