"""Validation and reconciliation engine.

One rule set (`check_student`) is used everywhere:
  * batch validation of an uploaded file (`validate_submission`),
  * committing a validated file (`commit_submission`), which creates review cases,
  * re-checking one record after a correction, manual entry or case decision
    (`revalidate_student`).

Records only count as "on record" once their file is submitted (committed).
Drafts are previews: they never appear in Student Records, dashboards or cases.
"""

import re
from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import func, or_, true
from sqlalchemy.orm import Session

from app.services.privacy import mask_apaar
from app.models.student import Student
from app.models.submission import Submission
from app.models.institution import Programme, Institution
from app.models.validation import ValidationIssue
from app.models.verification import VerificationCase, CaseEvent
from app.models.reference import ReferenceRecord
from app.services.validation_rules import get_rule_config, OPTIONAL_REQUIRED_FIELDS

ALLOWED_GENDERS = {"male", "female", "other", "transgender", "non-binary"}
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")
APAAR_RE = re.compile(r"^\d{12}$")

# Rules that need a human decision and therefore open a review case when committed
CASE_RULES = {
    "MISSING_REQUIRED": "invalid_data",
    "FMT_APAAR": "invalid_data",
    "FMT_DOB": "invalid_data",
    "DATE_INCONSIST": "invalid_data",
    "DUP_APAAR_SAME": "duplicate_enrollment",
    "DUP_APAAR_CROSS": "duplicate_enrollment",
    "DUP_ROLL": "duplicate_enrollment",
    "POSSIBLE_DUP_PERSON": "duplicate_enrollment",
    "REF_MISMATCH": "reference_mismatch",
    "INTAKE_EXCEED": "intake_mismatch",
}
# Judgement-based flags a reviewer may dismiss; the rest are definite data errors to correct
DISMISSABLE_RULES = {"DUP_APAAR_SAME", "DUP_APAAR_CROSS", "DUP_ROLL", "POSSIBLE_DUP_PERSON", "REF_MISMATCH", "INTAKE_EXCEED"}
SKIP_RULES = {"SKIP_DUP_ROW", "SKIP_EXISTING"}


# ----------------------------------------------------------------------------- helpers

def committed(query):
    """Limit a Student query to records that are on record (no file, or a submitted file)."""
    return query.outerjoin(Submission, Student.submission_id == Submission.id).filter(
        or_(Student.submission_id.is_(None), Submission.status == "submitted")
    )


def norm_name(name: str | None) -> str:
    tokens = re.sub(r"[^a-z ]", " ", (name or "").lower()).split()
    return " ".join(sorted(tokens))


def clean(value) -> str:
    return (value or "").strip() if isinstance(value, str) else ("" if value is None else str(value))


def version_chain_ids(db: Session, student: Student) -> set[str]:
    """IDs of every version of this student (older and newer)."""
    ids = {student.id}
    cur = student
    while cur.previous_version_id:
        ids.add(cur.previous_version_id)
        cur = db.query(Student).filter(Student.id == cur.previous_version_id).first()
        if not cur:
            break
    frontier = [student.id]
    while frontier:
        newer = db.query(Student.id).filter(Student.previous_version_id.in_(frontier)).all()
        frontier = [n[0] for n in newer if n[0] not in ids]
        ids.update(frontier)
    return ids


def latest_version(db: Session, student: Student) -> Student:
    """Follow the version chain forward to the current record."""
    cur = student
    while True:
        newer = db.query(Student).filter(Student.previous_version_id == cur.id).order_by(Student.version.desc()).first()
        if not newer:
            return cur
        cur = newer


@dataclass
class Context:
    cfg: dict
    today: date
    by_roll: dict = field(default_factory=dict)
    by_apaar: dict = field(default_factory=dict)
    by_person: dict = field(default_factory=dict)
    cross_by_apaar: dict = field(default_factory=dict)
    references: dict = field(default_factory=dict)
    batch_apaar: dict = field(default_factory=dict)
    batch_roll: dict = field(default_factory=dict)
    seen_rows: dict = field(default_factory=dict)
    batch_person: dict = field(default_factory=dict)
    dismissed: set = field(default_factory=set)


def build_context(db: Session, institution_id: str, exclude_ids: set[str]) -> Context:
    ctx = Context(cfg=get_rule_config(db, institution_id), today=date.today())
    own = committed(db.query(Student)).filter(
        Student.institution_id == institution_id,
        Student.is_latest.is_(True),
        ~Student.id.in_(exclude_ids) if exclude_ids else true(),
    ).all()
    for s in own:
        if s.institute_roll_no:
            ctx.by_roll.setdefault(clean(s.institute_roll_no).upper(), s)
        if s.apaar_id and APAAR_RE.match(clean(s.apaar_id)):
            ctx.by_apaar.setdefault(clean(s.apaar_id), s)
        if s.name and s.date_of_birth:
            ctx.by_person.setdefault((norm_name(s.name), s.date_of_birth), s)

    cross = committed(db.query(Student, Institution.name)).join(Institution, Student.institution_id == Institution.id).filter(
        Student.institution_id != institution_id,
        Student.is_latest.is_(True),
        Student.enrollment_status == "active",
        Student.apaar_id.isnot(None),
    ).all()
    for s, inst_name in cross:
        ctx.cross_by_apaar.setdefault(clean(s.apaar_id), inst_name)

    ctx.references = {r.apaar_id: r for r in db.query(ReferenceRecord).all()}
    return ctx


def _row_signature(s: Student) -> tuple:
    return (clean(s.name).lower(), clean(s.apaar_id), s.date_of_birth, clean(s.gender).lower(),
            clean(s.institute_roll_no).upper(), s.programme_id, s.enrollment_date, clean(s.email).lower(), clean(s.phone))


def _issue(rule, severity, field_name, description):
    return {"rule_code": rule, "severity": severity, "field_name": field_name, "description": description}


# ----------------------------------------------------------------------------- the rule set

def check_student(s: Student, ctx: Context, batch: bool) -> list[dict]:
    """All checks for one record. Returns issue dicts (rule_code, severity, field_name, description)."""
    cfg = ctx.cfg
    required = set(cfg["required_fields"])
    age_cfg = cfg["age_check"]
    issues: list[dict] = []
    apaar = clean(s.apaar_id)
    roll = clean(s.institute_roll_no).upper()

    if batch:
        sig = _row_signature(s)
        if sig in ctx.seen_rows:
            return [_issue("SKIP_DUP_ROW", "info", None,
                           f"Exact repeat of row {ctx.seen_rows[sig]} in this file; it will not be imported again.")]
        ctx.seen_rows[sig] = s.row_number

    existing = ctx.by_roll.get(roll) if roll else None

    def same_or_blank(incoming, current) -> bool:
        return incoming in (None, "") or incoming == current

    if existing and batch and same_or_blank(clean(s.name).lower(), clean(existing.name).lower()) \
            and same_or_blank(apaar, clean(existing.apaar_id)) \
            and same_or_blank(s.date_of_birth, existing.date_of_birth):
        newer = (not apaar and clean(existing.apaar_id)) or (not s.date_of_birth and existing.date_of_birth)
        return [_issue("SKIP_EXISTING", "info", None,
                       f"Already on record (roll {roll})"
                       + ("; the record on file has since been corrected" if newer else "; no changes in this row")
                       + ", so it will not be imported again. Use Submit Correction to change a record.")]

    if not clean(s.name):
        issues.append(_issue("MISSING_REQUIRED", "error", "name", "Student name is required."))

    if not s.programme_id:
        issues.append(_issue("MISSING_REQUIRED", "error", "programme",
                             "Programme is missing or is not one of this college's programmes. Use a programme code "
                             "from Programmes & Intake, or choose a default programme when mapping columns."))

    if not apaar:
        issues.append(_issue("MISSING_REQUIRED", "error", "apaar_id", "APAAR ID is missing."))
    elif not APAAR_RE.match(apaar):
        issues.append(_issue("FMT_APAAR", "error", "apaar_id",
                             f"Invalid APAAR ID format ({len(apaar)} characters). Must be exactly 12 digits (format check only)."))
    else:
        if batch and ctx.batch_apaar.get(apaar, 0) > 1:
            issues.append(_issue("DUP_APAAR_SAME", "error", "apaar_id",
                                 f"APAAR ID {mask_apaar(apaar)} appears {ctx.batch_apaar[apaar]} times in this file."))
        other = ctx.by_apaar.get(apaar)
        if other and clean(other.institute_roll_no).upper() != roll:
            issues.append(_issue("DUP_APAAR_SAME", "error", "apaar_id",
                                 f"APAAR ID {mask_apaar(apaar)} is already used by roll {other.institute_roll_no} ({other.name}) at this institution."))
        if apaar in ctx.cross_by_apaar:
            issues.append(_issue("DUP_APAAR_CROSS", "error", "apaar_id",
                                 f"Possible cross-institution duplicate — review required: APAAR ID {mask_apaar(apaar)} has an active record at '{ctx.cross_by_apaar[apaar]}'."))
        ref = ctx.references.get(apaar)
        if ref:
            diffs = []
            if norm_name(ref.name) != norm_name(s.name):
                diffs.append("name")
            if ref.date_of_birth and s.date_of_birth and ref.date_of_birth != s.date_of_birth:
                diffs.append("date of birth")
            if ref.gender and s.gender and clean(ref.gender).lower() != clean(s.gender).lower():
                diffs.append("gender")
            if diffs:
                issues.append(_issue("REF_MISMATCH", "warning", diffs[0].replace(" ", "_"),
                                     f"Differs from the sandbox reference record for this APAAR ID: {', '.join(diffs)}. Review required."))

    if roll:
        if batch and ctx.batch_roll.get(roll, 0) > 1:
            issues.append(_issue("DUP_ROLL", "error", "institute_roll_no",
                                 f"Roll number {roll} appears {ctx.batch_roll[roll]} times in this file with different details."))
        if existing:
            issues.append(_issue("DUP_ROLL", "error", "institute_roll_no",
                                 f"Roll number {roll} already belongs to an active record ({existing.name}) with different details."))

    if s.name and s.date_of_birth:
        key = (norm_name(s.name), s.date_of_birth)
        twin = ctx.by_person.get(key)
        if twin and clean(twin.institute_roll_no).upper() != roll and clean(twin.apaar_id) != apaar:
            issues.append(_issue("POSSIBLE_DUP_PERSON", "warning", "name",
                                 f"Same name and date of birth as roll {twin.institute_roll_no}. Check whether this is the same student."))
        elif batch:
            earlier = ctx.batch_person.get(key)
            if earlier and earlier[0] != roll and earlier[1] != apaar:
                issues.append(_issue("POSSIBLE_DUP_PERSON", "warning", "name",
                                     f"Same name and date of birth as roll {earlier[0]} (row {earlier[2]} of this file). "
                                     "Check whether this is the same student."))
            else:
                ctx.batch_person.setdefault(key, (roll, apaar, s.row_number))

    for fld in sorted(required - {"date_of_birth"}):
        value = getattr(s, fld, None)
        if value is None or (isinstance(value, str) and not value.strip()):
            issues.append(_issue("MISSING_REQUIRED", "error", fld,
                                 f"{OPTIONAL_REQUIRED_FIELDS[fld]} is required by this institution's validation rules."))

    if not s.date_of_birth:
        if "date_of_birth" in required:
            issues.append(_issue("MISSING_REQUIRED", "error", "date_of_birth", "Date of birth is required (or could not be read)."))
    elif s.date_of_birth >= ctx.today:
        issues.append(_issue("FMT_DOB", "error", "date_of_birth", f"Date of birth ({s.date_of_birth}) cannot be today or in the future."))
    elif age_cfg["enabled"]:
        age = ctx.today.year - s.date_of_birth.year - ((ctx.today.month, ctx.today.day) < (s.date_of_birth.month, s.date_of_birth.day))
        if age < age_cfg["min_age"]:
            issues.append(_issue("FMT_DOB", "error", "date_of_birth",
                                 f"Candidate age is {age} years ({s.date_of_birth}), below the minimum of {age_cfg['min_age']}."))
        elif age < age_cfg["review_below_age"]:
            issues.append(_issue("FMT_DOB", "warning", "date_of_birth", f"Candidate age is {age} years ({s.date_of_birth}). Please verify."))

    if cfg["admission_date_check"]["enabled"] and s.enrollment_date:
        if s.date_of_birth and s.enrollment_date <= s.date_of_birth:
            issues.append(_issue("DATE_INCONSIST", "error", "enrollment_date",
                                 f"Admission date ({s.enrollment_date}) is on or before the date of birth ({s.date_of_birth})."))
        elif s.enrollment_date > ctx.today:
            issues.append(_issue("DATE_INCONSIST", "warning", "enrollment_date", f"Admission date ({s.enrollment_date}) is in the future."))

    if s.gender and cfg["gender_format"]["enabled"] and clean(s.gender).lower() not in ALLOWED_GENDERS:
        issues.append(_issue("FMT_GENDER", cfg["gender_format"]["severity"], "gender",
                             f"Unrecognised gender '{s.gender}'. Allowed: Male, Female, Other, Transgender, Non-binary."))

    if s.email and cfg["email_format"]["enabled"] and not EMAIL_REGEX.match(clean(s.email)):
        issues.append(_issue("FMT_EMAIL", cfg["email_format"]["severity"], "email", f"Invalid email format: '{s.email}'."))

    return [i for i in issues if i["rule_code"] not in ctx.dismissed]


def status_from(issues: list[dict]) -> tuple[str, str]:
    """Record status and remark from its issues."""
    codes = {i["rule_code"] for i in issues}
    if codes & SKIP_RULES:
        return "skipped", issues[0]["description"]
    errors = [i for i in issues if i["severity"] == "error"]
    warnings = [i for i in issues if i["severity"] == "warning"]
    if errors:
        has_dup = any(i["rule_code"].startswith("DUP") for i in errors)
        return ("duplicate" if has_dup else "invalid"), "; ".join(e["description"] for e in errors[:2])
    if warnings:
        dup_like = any(i["rule_code"] in ("POSSIBLE_DUP_PERSON",) for i in warnings)
        return ("duplicate" if dup_like else "warning"), "; ".join(w["description"] for w in warnings[:2])
    return "valid", "All checks passed."


# ----------------------------------------------------------------------------- batch validation

def validate_submission(db: Session, submission_id: str) -> dict:
    """Validate every row of an uploaded file. Nothing becomes 'on record' until it is submitted."""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission {submission_id} not found")

    students = db.query(Student).filter(Student.submission_id == submission_id, Student.is_latest.is_(True)) \
        .order_by(Student.row_number).all()
    db.query(ValidationIssue).filter(ValidationIssue.submission_id == submission_id).delete()
    if not students:
        submission.status = "validated"
        db.commit()
        return _summary(submission, 0, 0, 0, 0, 0)

    ctx = build_context(db, submission.institution_id, {s.id for s in students})

    # Counts used for in-file duplicate checks ignore exact repeated rows
    unique_rows, seen = [], set()
    for s in students:
        sig = _row_signature(s)
        if sig not in seen:
            seen.add(sig)
            unique_rows.append(s)
    for s in unique_rows:
        if clean(s.apaar_id):
            ctx.batch_apaar[clean(s.apaar_id)] = ctx.batch_apaar.get(clean(s.apaar_id), 0) + 1
        if clean(s.institute_roll_no):
            r = clean(s.institute_roll_no).upper()
            ctx.batch_roll[r] = ctx.batch_roll.get(r, 0) + 1

    per_student: dict[str, list[dict]] = {}
    for s in students:
        per_student[s.id] = check_student(s, ctx, batch=True)

    # Intake: rows that would be added (not skipped, active) against each programme's reference
    for programme_id in sorted({s.programme_id for s in students if s.programme_id}):
        prog = db.query(Programme).filter(Programme.id == programme_id,
                                          Programme.institution_id == submission.institution_id).first()
        if prog:
            permitted = (prog.approved_intake or 0) + (prog.supernumerary_seats or 0) + (prog.nri_seats or 0)
            enrolled = committed(db.query(func.count(Student.id))).filter(
                Student.programme_id == prog.id,
                Student.institution_id == submission.institution_id,
                Student.is_latest.is_(True),
                Student.enrollment_status == "active",
                Student.submission_id.is_distinct_from(submission.id),
            ).scalar() or 0
            adding = [s for s in students if s.programme_id == prog.id and (s.enrollment_status or "active") == "active"
                      and not ({i["rule_code"] for i in per_student[s.id]} & SKIP_RULES)]
            if enrolled + len(adding) > permitted:
                remaining = max(permitted - enrolled, 0)
                total = enrolled + len(adding)
                for s in adding[remaining:]:
                    per_student[s.id].append(_issue(
                        "INTAKE_EXCEED", "error", "programme",
                        f"Potential intake discrepancy — review required: {prog.name} has an intake reference of {permitted} "
                        f"(approved {prog.approved_intake} + supernumerary/NRI). {enrolled} already enrolled; this file "
                        f"would take it to {total} (+{total - permitted})."))

    counts = {"valid": 0, "invalid": 0, "duplicate": 0, "warning": 0, "skipped": 0}
    for s in students:
        issues = per_student[s.id]
        for i in issues:
            db.add(ValidationIssue(submission_id=submission.id, student_id=s.id, row_number=s.row_number, status="open", **i))
        s.validation_status, s.remarks = status_from(issues)
        counts[s.validation_status] += 1

    submission.total_records = len(students)
    submission.valid_records = counts["valid"]
    submission.error_records = counts["invalid"] + counts["duplicate"]
    submission.warning_records = counts["warning"]
    submission.skipped_records = counts["skipped"]
    submission.status = "validated"
    submission.validated_at = datetime.utcnow()
    db.commit()
    return _summary(submission, len(students), counts["valid"], counts["invalid"] + counts["duplicate"],
                    counts["warning"], counts["skipped"])


def _summary(sub, total, valid, errors, warnings, skipped):
    return {"submission_id": sub.id, "total_records": total, "valid_records": valid, "error_records": errors,
            "warning_records": warnings, "skipped_records": skipped, "status": sub.status}


# ----------------------------------------------------------------------------- commit

def commit_submission(db: Session, submission: Submission, actor_id: str) -> dict:
    """Put a validated file on record: re-check it, drop skipped rows, open review cases."""
    result = validate_submission(db, submission.id)  # re-check against anything committed since validation
    students = db.query(Student).filter(Student.submission_id == submission.id, Student.is_latest.is_(True)).all()
    issues_by_student: dict[str, list[ValidationIssue]] = {}
    for i in db.query(ValidationIssue).filter(ValidationIssue.submission_id == submission.id).all():
        issues_by_student.setdefault(i.student_id, []).append(i)

    skipped = 0
    for s in students:
        if s.validation_status == "skipped":
            s.is_latest = False  # kept for the import history, but not an active record
            skipped += 1

    submission.status = "submitted"
    submission.submitted_at = datetime.utcnow()
    db.flush()

    cases = 0
    for s in students:
        if s.validation_status == "skipped":
            continue
        if _open_case_for(db, s, issues_by_student.get(s.id, []), submission, actor_id):
            cases += 1
    db.commit()

    inserted = len(students) - skipped
    return {
        "submission_id": submission.id,
        "status": submission.status,
        "inserted": inserted,
        "updated": 0,
        "skipped": skipped,
        "flagged": result["error_records"],
        "warnings": result["warning_records"],
        "cases_created": cases,
        "message": (f"{inserted} record(s) added, {skipped} skipped (already on record or repeated in the file), "
                    f"{result['error_records']} flagged for review, {cases} review case(s) opened. "
                    "Existing records are never overwritten by an import; use Submit Correction to change them."),
    }


def case_title(s: Student) -> str:
    return f"{s.name or 'Unnamed'} · {s.institute_roll_no or 'no roll no.'} ({mask_apaar(s.apaar_id) if s.apaar_id else 'No APAAR'})"


def _open_case_for(db: Session, s: Student, issues: list, submission: Submission, actor_id: str) -> bool:
    case_issues = [i for i in issues if i.rule_code in CASE_RULES and i.status == "open"
                   and (i.severity == "error" or i.rule_code in ("POSSIBLE_DUP_PERSON", "REF_MISMATCH"))]
    if not case_issues:
        return False
    chain = version_chain_ids(db, s)
    if db.query(VerificationCase).filter(VerificationCase.student_id.in_(chain),
                                         VerificationCase.status.in_(["open", "under_review", "pending", "escalated"])).first():
        return False
    errors = [i for i in case_issues if i.severity == "error"]
    primary = (errors or case_issues)[0]
    issue_type = CASE_RULES[primary.rule_code]
    vc = VerificationCase(
        student_id=s.id,
        submission_id=submission.id if submission else s.submission_id,
        institution_id=s.institution_id,
        rule_code=primary.rule_code,
        issue_type=issue_type,
        title=case_title(s),
        description=primary.description,
        priority="high" if issue_type in ("duplicate_enrollment", "intake_mismatch") else "medium",
        status="open",
    )
    db.add(vc)
    db.flush()
    db.add(CaseEvent(case_id=vc.id, actor_id=actor_id, event_type="created",
                     description=f"Case opened automatically ({primary.rule_code}): {primary.description}"))
    return True


# ----------------------------------------------------------------------------- single record

def revalidate_student(db: Session, s: Student, persist: bool = True) -> tuple[str, list[dict]]:
    """Re-check one current record against everything else on record. Optionally stores the result."""
    chain = version_chain_ids(db, s)
    ctx = build_context(db, s.institution_id, chain)
    ctx.dismissed = {code for (code,) in db.query(ValidationIssue.rule_code).filter(
        ValidationIssue.student_id.in_(chain), ValidationIssue.status.in_(["dismissed", "accepted"])).all()}
    issues = [i for i in check_student(s, ctx, batch=False) if i["rule_code"] not in SKIP_RULES]
    status, remarks = status_from(issues)
    if persist:
        db.query(ValidationIssue).filter(ValidationIssue.student_id == s.id, ValidationIssue.status == "open").delete()
        sub_id = s.submission_id
        for i in issues:
            db.add(ValidationIssue(submission_id=sub_id, student_id=s.id, row_number=s.row_number, status="open", **i))
        s.validation_status, s.remarks = status, remarks
    return status, issues


def open_case_if_needed(db: Session, s: Student, actor_id: str) -> bool:
    issues = db.query(ValidationIssue).filter(ValidationIssue.student_id == s.id, ValidationIssue.status == "open").all()
    return _open_case_for(db, s, issues, None, actor_id)
