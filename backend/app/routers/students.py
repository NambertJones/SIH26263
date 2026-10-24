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

    if eff_id:
        query = query.filter(Student.institution_id == eff_id)

    if submission_id:
        query = query.filter(Student.submission_id == submission_id)

    if programme_id:
        query = query.filter(Student.programme_id == programme_id)

    if validation_status and validation_status != "all":
        query = query.filter(Student.validation_status == validation_status)

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
            "apaar_id": s.apaar_id,
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

    # Fetch cases
    cases = db.query(VerificationCase).filter(VerificationCase.student_id == s.id).all()
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
            "apaar_id": curr.apaar_id,
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
        "apaar_id": s.apaar_id,
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
        "cases": cases_list,
        "version_history": version_history,
    }


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
        AuditLog.entity_id == student_id,
    ).order_by(AuditLog.created_at.desc()).all()

    return logs


@router.put("/{student_id}/correct")
def correct_student_record(
    student_id: str,
    correction: StudentCorrection,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a correction creating a new immutable version of student record."""
    old_student = db.query(Student).filter(Student.id == student_id, Student.is_latest.is_(True)).first()
    if not old_student:
        raise HTTPException(status_code=404, detail="Active student record not found")

    get_effective_institution_id(current_user, old_student.institution_id)

    if not correction.reason or len(correction.reason.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A detailed justification reason is mandatory for record corrections.",
        )

    # Mark old version as not latest
    old_student.is_latest = False
    old_student.updated_at = datetime.utcnow()

    # Create new version
    new_student = Student(
        institution_id=old_student.institution_id,
        submission_id=old_student.submission_id,
        apaar_id=correction.apaar_id if correction.apaar_id is not None else old_student.apaar_id,
        name=correction.name if correction.name is not None else old_student.name,
        date_of_birth=correction.date_of_birth if correction.date_of_birth is not None else old_student.date_of_birth,
        gender=correction.gender if correction.gender is not None else old_student.gender,
        programme_id=old_student.programme_id,
        enrollment_date=old_student.enrollment_date,
        enrollment_status=correction.enrollment_status if correction.enrollment_status is not None else old_student.enrollment_status,
        category=correction.category if correction.category is not None else old_student.category,
        institute_roll_no=correction.institute_roll_no if correction.institute_roll_no is not None else old_student.institute_roll_no,
        email=correction.email if correction.email is not None else old_student.email,
        phone=old_student.phone,
        row_number=old_student.row_number,
        validation_status="valid",  # Correction marks as verified
        remarks=f"Corrected: {correction.reason}",
        version=old_student.version + 1,
        is_latest=True,
        previous_version_id=old_student.id,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # Audit log
    log_event(
        db=db,
        action="correction",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="student",
        entity_id=new_student.id,
        description=f"Created version {new_student.version} for student {new_student.name}. Reason: {correction.reason}",
    )

    return {
        "message": "Student record updated successfully (new version created)",
        "student_id": new_student.id,
        "version": new_student.version,
    }
