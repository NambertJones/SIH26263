"""Students router for student records, details, versioned corrections, and cases."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.institution import Institution, Programme
from app.models.validation import ValidationIssue
from app.models.verification import VerificationCase, CaseEvent
from app.models.audit import AuditLog
from app.schemas.student import StudentResponse, StudentCorrection, StudentDetailResponse
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id
from app.services.audit_service import log_event
from app.services.privacy import mask_apaar, apaar_status
from app.middleware.tenant import is_central_user, require_institution_member
from pydantic import BaseModel
from datetime import date
from app.models.submission import Submission
from app.models.reference import ReferenceRecord
from app.services.validation_engine import (
    committed, latest_version, version_chain_ids, revalidate_student, open_case_if_needed, norm_name, case_title,
)

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get("")
def list_students(
    institution_id: str | None = None,
    submission_id: str | None = None,
    programme_id: str | None = None,
    validation_status: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List students with filtering and search."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    query = db.query(Student).filter(Student.is_latest.is_(True))
    # Records are "on record" once their file is submitted; a file's own validation page may show its drafts
    if not submission_id:
        query = committed(query)

    if eff_id:
        query = query.filter(Student.institution_id == eff_id)

    if submission_id:
        query = query.filter(Student.submission_id == submission_id)

    if programme_id:
        query = query.filter(Student.programme_id == programme_id)

    if validation_status and validation_status != "all":
        # Comma-separated values let dashboard cards link to exactly the records they count
        statuses = [v.strip() for v in validation_status.split(",") if v.strip()]
        query = query.filter(Student.validation_status.in_(statuses))

    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                Student.name.ilike(s_term),
                Student.apaar_id.ilike(s_term),
                Student.institute_roll_no.ilike(s_term),
                Student.email.ilike(s_term),
            )
        )

    total = query.count()
    students = query.order_by(Student.row_number, Student.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for s in students:
        prog = db.query(Programme).filter(Programme.id == s.programme_id).first() if s.programme_id else None
        items.append({
            "id": s.id,
            "institution_id": s.institution_id,
            "submission_id": s.submission_id,
            "apaar_masked": mask_apaar(s.apaar_id),
            "apaar_status": apaar_status(s.apaar_id),
            "name": s.name,
            "gender": s.gender,
            "programme_id": s.programme_id,
            "programme_name": prog.name if prog else None,
            "programme_code": prog.code if prog else None,
            "enrollment_date": s.enrollment_date,
            "enrollment_status": s.enrollment_status,
            "category": s.category,
            "institute_roll_no": s.institute_roll_no,
            "row_number": s.row_number,
            "validation_status": s.validation_status,
            "remarks": s.remarks,
            "version": s.version,
            "is_latest": s.is_latest,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        })

    return {"total": total, "items": items}


@router.get("/{student_id}")
def get_student(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get complete student record details with issues, cases, and versions."""
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    get_effective_institution_id(current_user, s.institution_id)

    prog = db.query(Programme).filter(Programme.id == s.programme_id).first() if s.programme_id else None
    inst = db.query(Institution).filter(Institution.id == s.institution_id).first() if s.institution_id else None

    # Fetch issues
    issues = db.query(ValidationIssue).filter(ValidationIssue.student_id == s.id).all()
    issues_list = [{
        "id": i.id,
        "rule_code": i.rule_code,
        "severity": i.severity,
        "field_name": i.field_name,
        "description": i.description,
        "row_number": i.row_number,
        "status": i.status,
        "created_at": i.created_at,
    } for i in issues]

    # Cases follow the student across versions
    chain = version_chain_ids(db, s)
    current = latest_version(db, s)
    cases = db.query(VerificationCase).filter(VerificationCase.student_id.in_(chain)).all()
    cases_list = [{
        "id": c.id,
        "issue_type": c.issue_type,
        "title": c.title,
        "description": c.description,
        "status": c.status,
        "assigned_to": c.assigned_to,
        "assigned_user_name": c.assigned_user.name if c.assigned_user else None,
        "priority": c.priority,
        "resolution_reason": c.resolution_reason,
        "created_at": c.created_at,
        "resolved_at": c.resolved_at,
    } for c in cases]

    # Fetch version history chain
    version_history = []
    curr = s
    while curr:
        version_history.append({
            "id": curr.id,
            "version": curr.version,
            "name": curr.name,
            "apaar_masked": mask_apaar(curr.apaar_id),
            "validation_status": curr.validation_status,
            "remarks": curr.remarks,
            "updated_at": curr.updated_at,
            "is_latest": curr.is_latest,
        })
        if curr.previous_version_id:
            curr = db.query(Student).filter(Student.id == curr.previous_version_id).first()
        else:
            break

    return {
        "id": s.id,
        "institution_id": s.institution_id,
        "institution_name": inst.name if inst else None,
        "submission_id": s.submission_id,
        "apaar_masked": mask_apaar(s.apaar_id),
        "apaar_status": apaar_status(s.apaar_id),
        "can_reveal_apaar": _can_reveal(current_user),
        "name": s.name,
        "date_of_birth": s.date_of_birth,
        "gender": s.gender,
        "programme_id": s.programme_id,
        "programme_name": prog.name if prog else None,
        "programme_code": prog.code if prog else None,
        "enrollment_date": s.enrollment_date,
        "enrollment_status": s.enrollment_status,
        "category": s.category,
        "institute_roll_no": s.institute_roll_no,
        "email": s.email,
        "phone": s.phone,
        "row_number": s.row_number,
        "validation_status": s.validation_status,
        "remarks": s.remarks,
        "version": s.version,
        "is_latest": s.is_latest,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
        "issues": issues_list,
        "is_current": current.id == s.id,
        "latest_version_id": current.id,
        "cases": cases_list,
        "version_history": version_history,
    }


class RevealRequest(BaseModel):
    reason: str


def _can_reveal(user: User) -> bool:
    """College staff and institution admins investigate records and may view a full ID with a reason.
    Oversight reviewers monitor the process and work with masked IDs."""
    return bool(user.institution_id) and user.role in ("admin", "institution_user")


@router.post("/{student_id}/reveal-apaar")
def reveal_apaar(
    student_id: str,
    body: RevealRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the full APAAR ID for one record. Requires a reason and is always audited."""
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    get_effective_institution_id(current_user, s.institution_id)

    if not _can_reveal(current_user):
        raise HTTPException(status_code=403, detail="Your role cannot view full APAAR IDs.")
    if not body.reason or len(body.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A reason (at least 5 characters) is required to view the full APAAR ID.")

    # The audit entry records who looked and why, never the identifier itself
    log_event(
        db=db,
        action="apaar_revealed",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="student",
        entity_id=s.id,
        description=f"Full APAAR ID viewed for {s.name}. Reason: {body.reason.strip()}",
    )
    return {"apaar_id": s.apaar_id, "visible_seconds": 30}


@router.get("/{student_id}/cases")
def get_student_cases(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get cases for a specific student."""
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    get_effective_institution_id(current_user, s.institution_id)
    cases = db.query(VerificationCase).filter(VerificationCase.student_id == student_id).all()
    return cases


@router.get("/{student_id}/audit-trail")
def get_student_audit_trail(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get audit trail records for a student."""
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")

    get_effective_institution_id(current_user, s.institution_id)

    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "student",
        AuditLog.entity_id.in_(version_chain_ids(db, s)),
    ).order_by(AuditLog.created_at.desc()).all()

    return logs


CORRECTABLE = ["name", "apaar_id", "date_of_birth", "gender", "enrollment_status", "category", "institute_roll_no", "email",
               "programme_id"]


def _shown(field: str, value) -> str:
    if value is None or value == "":
        return "—"
    return mask_apaar(value) if field == "apaar_id" else str(value)


@router.put("/{student_id}/correct")
def correct_student_record(
    student_id: str,
    correction: StudentCorrection,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Correct a record by creating a new version. Works from any version's ID: the change is applied
    to the student's current version, the previous version is preserved, and the record is re-checked."""
    requested = db.query(Student).filter(Student.id == student_id).first()
    if not requested:
        raise HTTPException(status_code=404, detail="Student record not found")
    require_institution_member(current_user, "correct student records")
    get_effective_institution_id(current_user, requested.institution_id)

    old = latest_version(db, requested)
    if not old.is_latest:
        raise HTTPException(status_code=409, detail="This record is not active (it was skipped or superseded) and cannot be corrected.")
    if not correction.reason or len(correction.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A reason (at least 5 characters) is required for every correction.")

    updates = {f: getattr(correction, f) for f in CORRECTABLE if getattr(correction, f) is not None}
    if isinstance(updates.get("apaar_id"), str):
        updates["apaar_id"] = updates["apaar_id"].replace(" ", "").replace("-", "").strip() or None
    if isinstance(updates.get("institute_roll_no"), str):
        updates["institute_roll_no"] = updates["institute_roll_no"].strip().upper()
    if updates.get("programme_id") and not db.query(Programme).filter(
            Programme.id == updates["programme_id"], Programme.institution_id == old.institution_id).first():
        raise HTTPException(status_code=400, detail="That programme does not belong to this college.")
    changed = {f: (getattr(old, f), v) for f, v in updates.items() if getattr(old, f) != v}
    if not changed:
        raise HTTPException(status_code=400, detail="Nothing to change: the values entered match the current record.")

    old.is_latest = False
    old.updated_at = datetime.utcnow()
    new = Student(
        institution_id=old.institution_id,
        submission_id=old.submission_id,
        apaar_id=old.apaar_id, name=old.name, date_of_birth=old.date_of_birth, gender=old.gender,
        programme_id=old.programme_id, enrollment_date=old.enrollment_date, enrollment_status=old.enrollment_status,
        category=old.category, institute_roll_no=old.institute_roll_no, email=old.email, phone=old.phone,
        row_number=old.row_number, version=old.version + 1, is_latest=True, previous_version_id=old.id,
    )
    for f, (_, v) in changed.items():
        setattr(new, f, v)
    db.add(new)
    db.flush()

    # The older version's open issues are superseded; the new version is re-checked against the rules
    old_issues = db.query(ValidationIssue).filter(ValidationIssue.student_id == old.id, ValidationIssue.status == "open")
    old_issues.update({"status": "superseded"}, synchronize_session=False)
    status_after, issues = revalidate_student(db, new)
    new.remarks = f"Corrected: {correction.reason.strip()}" + ("" if status_after == "valid" else f" — {new.remarks}")

    # Open cases move to the new version so their history stays with the student
    summary = ", ".join(f"{f}: {_shown(f, a)} → {_shown(f, b)}" for f, (a, b) in changed.items())
    open_cases = db.query(VerificationCase).filter(
        VerificationCase.student_id.in_(version_chain_ids(db, old)),
        VerificationCase.status.in_(["open", "under_review", "pending", "escalated"]),
    ).all()
    for case in open_cases:
        case.student_id = new.id
        case.title = case_title(new)
        db.add(CaseEvent(case_id=case.id, actor_id=current_user.id, event_type="correction",
                         description=f"Record corrected to version {new.version} ({summary}). Reason: {correction.reason.strip()}. "
                                     f"Re-check result: {status_after}."))
    db.commit()
    db.refresh(new)

    log_event(
        db=db,
        action="correction",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="student",
        entity_id=new.id,
        description=f"Version {new.version} of {new.name} ({new.institute_roll_no}): {summary}. Reason: {correction.reason.strip()}",
        metadata={"role": current_user.role, "previous_version_id": old.id, "changed_fields": list(changed),
                  "validation_status": status_after},
    )
    return {
        "message": "Correction saved as a new version.",
        "student_id": new.id,
        "previous_version_id": old.id,
        "version": new.version,
        "validation_status": status_after,
        "remaining_issues": [i["description"] for i in issues],
    }


class StudentCreate(BaseModel):
    name: str
    programme_id: str
    institute_roll_no: str
    apaar_id: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    enrollment_date: date | None = None
    category: str | None = None
    email: str | None = None
    phone: str | None = None


@router.post("")
def create_student(
    body: StudentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add one student by hand. The record is checked with the same rules as an upload."""
    require_institution_member(current_user, "add student records")
    prog = db.query(Programme).filter(Programme.id == body.programme_id,
                                      Programme.institution_id == current_user.institution_id).first()
    if not prog:
        raise HTTPException(status_code=400, detail="Choose one of your institution's programmes.")
    if not body.name.strip() or not body.institute_roll_no.strip():
        raise HTTPException(status_code=400, detail="Name and roll number are required.")

    manual = db.query(Submission).filter(Submission.institution_id == current_user.institution_id,
                                         Submission.file_name == "Manual entry").first()
    if not manual:
        manual = Submission(institution_id=current_user.institution_id, uploaded_by=current_user.id,
                            file_name="Manual entry", status="submitted", academic_year=prog.academic_year)
        db.add(manual)
        db.flush()

    s = Student(
        institution_id=current_user.institution_id, submission_id=manual.id, programme_id=prog.id,
        name=body.name.strip(), institute_roll_no=body.institute_roll_no.strip().upper(),
        apaar_id=(body.apaar_id or "").replace(" ", "").replace("-", "") or None,
        date_of_birth=body.date_of_birth, gender=body.gender, enrollment_date=body.enrollment_date,
        category=body.category, email=body.email, phone=body.phone,
        enrollment_status="active", is_latest=True, version=1,
    )
    db.add(s)
    db.flush()
    status_after, issues = revalidate_student(db, s)
    db.flush()
    case_opened = open_case_if_needed(db, s, current_user.id)
    manual.total_records = (manual.total_records or 0) + 1
    db.commit()
    log_event(db=db, action="student_created", actor_id=current_user.id, actor_email=current_user.email,
              entity_type="student", entity_id=s.id,
              description=f"Added {s.name} ({s.institute_roll_no}) to {prog.code} by manual entry. Check result: {status_after}.",
              metadata={"role": current_user.role})
    return {"student_id": s.id, "validation_status": status_after, "issues": [i["description"] for i in issues],
            "case_opened": case_opened}


@router.get("/{student_id}/reference-comparison")
def reference_comparison(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Field-by-field comparison with the sandbox reference record for this APAAR ID, if one exists."""
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    get_effective_institution_id(current_user, s.institution_id)
    ref = db.query(ReferenceRecord).filter(ReferenceRecord.apaar_id == (s.apaar_id or "").strip()).first() if s.apaar_id else None
    if not ref:
        return {"available": False, "source": None, "fields": []}

    def row(label, ours, theirs, same):
        return {"field": label, "institution_value": ours, "reference_value": theirs, "match": same}

    fields = [
        row("Name", s.name, ref.name, norm_name(s.name) == norm_name(ref.name)),
        row("Date of birth", s.date_of_birth.isoformat() if s.date_of_birth else None,
            ref.date_of_birth.isoformat() if ref.date_of_birth else None,
            None if not (s.date_of_birth and ref.date_of_birth) else s.date_of_birth == ref.date_of_birth),
        row("Gender", s.gender, ref.gender,
            None if not (s.gender and ref.gender) else s.gender.strip().lower() == ref.gender.strip().lower()),
    ]
    return {"available": True, "source": ref.source, "apaar_masked": mask_apaar(ref.apaar_id), "fields": fields}
