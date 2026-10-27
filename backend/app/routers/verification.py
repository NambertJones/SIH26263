"""Verification cases router for review workflow, assignment, and resolution."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.services.privacy import mask_apaar
from app.database import get_db
from app.models.user import User
from app.models.verification import VerificationCase, CaseEvent
from app.schemas.verification import (
    AssignCaseRequest,
    CaseCommentRequest,
    ResolveCaseRequest,
    RejectCaseRequest,
    ClarificationRequest,
)
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id, require_central_user, is_central_user
from app.models.student import Student
from app.services.case_manager import (
    get_cases,
    assign_case,
    add_case_comment,
    request_clarification,
    resolve_case,
    reject_case,
)
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/cases", tags=["Verification Cases"])


@router.get("")
def list_cases(
    institution_id: str | None = None,
    status: str | None = None,
    issue_type: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List verification cases with filters."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    cases, total = get_cases(
        db=db,
        institution_id=eff_id,
        status=status,
        issue_type=issue_type,
        priority=priority,
        search=search,
        limit=limit,
        offset=offset,
    )
    return {"total": total, "items": cases}


@router.get("/{case_id}")
def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single verification case details including event timeline."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    get_effective_institution_id(current_user, case.institution_id)

    events = db.query(CaseEvent).filter(CaseEvent.case_id == case.id).order_by(CaseEvent.created_at.asc()).all()
    events_list = []
    for ev in events:
        actor = db.query(User).filter(User.id == ev.actor_id).first() if ev.actor_id else None
        events_list.append({
            "id": ev.id,
            "case_id": ev.case_id,
            "actor_id": ev.actor_id,
            "actor_name": actor.name if actor else "System",
            "actor_role": actor.role if actor else None,
            "event_type": ev.event_type,
            "description": ev.description,
            "old_value": ev.old_value,
            "new_value": ev.new_value,
            "created_at": ev.created_at,
        })

    assigned_user = db.query(User).filter(User.id == case.assigned_to).first() if case.assigned_to else None
    resolved_user = db.query(User).filter(User.id == case.resolved_by).first() if case.resolved_by else None

    return {
        "id": case.id,
        "student_id": case.student_id,
        "student_name": case.student.name if case.student else None,
        "student_apaar_id": mask_apaar(case.student.apaar_id) if case.student else None,
        "student_programme": case.student.programme.name if (case.student and case.student.programme) else None,
        "submission_id": case.submission_id,
        "institution_id": case.institution_id,
        "institution_name": case.institution.name if case.institution else None,
        "issue_type": case.issue_type,
        "title": case.title,
        "description": case.description,
        "status": case.status,
        "assigned_to": case.assigned_to,
        "assigned_user_name": assigned_user.name if assigned_user else None,
        "resolved_by": case.resolved_by,
        "resolved_user_name": resolved_user.name if resolved_user else None,
        "resolution_reason": case.resolution_reason,
        "priority": case.priority,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "resolved_at": case.resolved_at,
        "events": events_list,
        "matched_records": _matched_records(db, case, current_user),
    }


def _matched_records(db: Session, case: VerificationCase, current_user: User) -> list[dict]:
    """Other current records sharing this student's APAAR ID, for side-by-side review.

    Institution users only learn that a record exists elsewhere; the other
    institution's name and the student's details are shown to oversight users only.
    """
    student = case.student
    if case.issue_type != "duplicate_enrollment" or not student or not student.apaar_id:
        return []
    others = (
        db.query(Student)
        .filter(
            Student.apaar_id == student.apaar_id,
            Student.is_latest.is_(True),
            Student.id != student.id,
        )
        .all()
    )
    central = is_central_user(current_user)
    out = []
    for o in others:
        same_inst = o.institution_id == student.institution_id
        visible = central or same_inst
        out.append({
            "id": o.id if visible else None,
            "same_institution": same_inst,
            "institution_name": (o.institution.name if o.institution else None) if visible else "Another institution (hidden)",
            "name": o.name if visible else "Hidden",
            "apaar_masked": mask_apaar(o.apaar_id),
            "programme": (o.programme.name if o.programme else None) if visible else None,
            "enrollment_status": o.enrollment_status if visible else None,
            "enrollment_date": o.enrollment_date if visible else None,
            "date_of_birth_matches": (o.date_of_birth == student.date_of_birth) if (o.date_of_birth and student.date_of_birth) else None,
            "name_matches": o.name.strip().lower() == student.name.strip().lower(),
            "row_number": o.row_number if visible else None,
            "validation_status": o.validation_status if visible else None,
        })
    return out


@router.post("/{case_id}/assign")
def assign(
    case_id: str,
    request: AssignCaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign case to a reviewer."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    require_central_user(current_user)
    get_effective_institution_id(current_user, case.institution_id)

    try:
        updated = assign_case(db, case_id, current_user.id, request.assigned_to)
        log_event(
            db=db,
            action="case_assigned",
            actor_id=current_user.id,
            actor_email=current_user.email,
            entity_type="case",
            entity_id=case_id,
            description=f"Assigned case {case_id} to user {request.assigned_to}.",
        )
        return {"message": "Case assigned successfully", "status": updated.status, "assigned_to": updated.assigned_to}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{case_id}/comment")
def add_comment(
    case_id: str,
    request: CaseCommentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a comment or observation to case timeline."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    get_effective_institution_id(current_user, case.institution_id)

    event = add_case_comment(db, case_id, current_user.id, request.comment)
    return {
        "id": event.id,
        "event_type": event.event_type,
        "description": event.description,
        "created_at": event.created_at,
    }


@router.post("/{case_id}/request-clarification")
def request_case_clarification(
    case_id: str,
    request: ClarificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request clarification for a case."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    get_effective_institution_id(current_user, case.institution_id)

    updated = request_clarification(db, case_id, current_user.id, request.note)
    log_event(
        db=db,
        action="clarification_requested",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="case",
        entity_id=case_id,
        description=f"Requested clarification on case {case_id}: {request.note}",
    )
    return {"message": "Clarification requested", "status": updated.status}


@router.post("/{case_id}/resolve")
def resolve(
    case_id: str,
    request: ResolveCaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resolve verification case with mandatory reason."""
    if not request.reason or len(request.reason.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A substantive resolution justification reason is mandatory.",
        )

    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    require_central_user(current_user)
    get_effective_institution_id(current_user, case.institution_id)

    updated = resolve_case(db, case_id, current_user.id, request.reason)
    log_event(
        db=db,
        action="case_resolved",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="case",
        entity_id=case_id,
        description=f"Resolved case {case_id}. Reason: {request.reason}",
    )
    return {"message": "Case resolved successfully", "status": updated.status}


@router.post("/{case_id}/reject")
def reject(
    case_id: str,
    request: RejectCaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject verification case with mandatory reason."""
    if not request.reason or len(request.reason.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rejection reason is mandatory.",
        )

    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    require_central_user(current_user)
    get_effective_institution_id(current_user, case.institution_id)

    updated = reject_case(db, case_id, current_user.id, request.reason)
    log_event(
        db=db,
        action="case_rejected",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="case",
        entity_id=case_id,
        description=f"Rejected case {case_id}. Reason: {request.reason}",
    )
    return {"message": "Case rejected", "status": updated.status}
