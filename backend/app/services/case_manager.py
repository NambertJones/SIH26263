"""Verification case management service."""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.services.privacy import mask_apaar
from app.models.verification import VerificationCase, CaseEvent
from app.models.student import Student
from app.models.user import User


def get_cases(
    db: Session,
    institution_id: str | None = None,
    status: str | None = None,
    issue_type: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Query verification cases with filters and pagination."""
    query = db.query(VerificationCase)

    if institution_id:
        query = query.filter(VerificationCase.institution_id == institution_id)

    if status and status != "all":
        query = query.filter(VerificationCase.status == status)

    if issue_type and issue_type != "all":
        query = query.filter(VerificationCase.issue_type == issue_type)

    if priority and priority != "all":
        query = query.filter(VerificationCase.priority == priority)

    if search:
        search_term = f"%{search}%"
        query = query.outerjoin(Student, VerificationCase.student_id == Student.id).filter(
            or_(
                VerificationCase.title.ilike(search_term),
                VerificationCase.description.ilike(search_term),
                Student.name.ilike(search_term),
                Student.apaar_id.ilike(search_term),
            )
        )

    total = query.count()
    cases = query.order_by(VerificationCase.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for c in cases:
        student = db.query(Student).filter(Student.id == c.student_id).first() if c.student_id else None
        assigned = db.query(User).filter(User.id == c.assigned_to).first() if c.assigned_to else None

        results.append({
            "id": c.id,
            "student_id": c.student_id,
            "student_name": student.name if student else None,
            "student_apaar_id": mask_apaar(student.apaar_id) if student else None,
            "student_programme": student.programme.name if (student and student.programme) else None,
            "institution_id": c.institution_id,
            "submission_id": c.submission_id,
            "issue_type": c.issue_type,
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "assigned_to": c.assigned_to,
            "assigned_user_name": assigned.name if assigned else None,
            "resolved_by": c.resolved_by,
            "resolution_reason": c.resolution_reason,
            "priority": c.priority,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "resolved_at": c.resolved_at,
        })

    return results, total


def assign_case(db: Session, case_id: str, actor_id: str, assigned_to_user_id: str) -> VerificationCase:
    """Assign a verification case to a reviewer."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    assignee = db.query(User).filter(User.id == assigned_to_user_id).first()
    if not assignee:
        raise ValueError(f"User {assigned_to_user_id} not found")

    old_assignee = case.assigned_to
    case.assigned_to = assignee.id
    if case.status == "open":
        case.status = "under_review"
    case.updated_at = datetime.utcnow()

    event = CaseEvent(
        case_id=case.id,
        actor_id=actor_id,
        event_type="assigned",
        description=f"Case assigned to {assignee.name} ({assignee.role})",
        old_value=old_assignee,
        new_value=assignee.id,
    )
    db.add(event)
    db.commit()
    db.refresh(case)
    return case


def add_case_comment(db: Session, case_id: str, actor_id: str, comment: str) -> CaseEvent:
    """Add a comment/event to a case timeline."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    event = CaseEvent(
        case_id=case.id,
        actor_id=actor_id,
        event_type="comment",
        description=comment,
    )
    db.add(event)
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return event


def request_clarification(db: Session, case_id: str, actor_id: str, note: str) -> VerificationCase:
    """Request clarification from institution staff."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    case.status = "pending"
    case.updated_at = datetime.utcnow()

    event = CaseEvent(
        case_id=case.id,
        actor_id=actor_id,
        event_type="clarification_requested",
        description=f"Clarification requested: {note}",
    )
    db.add(event)
    db.commit()
    db.refresh(case)
    return case


def resolve_case(db: Session, case_id: str, actor_id: str, resolution_reason: str) -> VerificationCase:
    """Resolve a case with mandatory justification."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    case.status = "resolved"
    case.resolved_by = actor_id
    case.resolution_reason = resolution_reason
    case.resolved_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()

    event = CaseEvent(
        case_id=case.id,
        actor_id=actor_id,
        event_type="resolved",
        description=f"Resolved with reason: {resolution_reason}",
    )
    db.add(event)

    # If associated student is invalid/duplicate, update to valid if resolved
    if case.student_id:
        student = db.query(Student).filter(Student.id == case.student_id).first()
        if student:
            student.validation_status = "valid"
            student.remarks = f"Resolved via verification case: {resolution_reason}"
            student.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(case)
    return case


def reject_case(db: Session, case_id: str, actor_id: str, rejection_reason: str) -> VerificationCase:
    """Reject a case with reason."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    case.status = "rejected"
    case.resolved_by = actor_id
    case.resolution_reason = rejection_reason
    case.resolved_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()

    event = CaseEvent(
        case_id=case.id,
        actor_id=actor_id,
        event_type="rejected",
        description=f"Rejected: {rejection_reason}",
    )
    db.add(event)
    db.commit()
    db.refresh(case)
    return case


def escalate_case(db: Session, case_id: str, actor_id: str, reason: str) -> VerificationCase:
    """Oversight escalates a disputed or sensitive case; only the institution admin can then decide it."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")
    case.status = "escalated"
    case.priority = "high"
    case.updated_at = datetime.utcnow()
    db.add(CaseEvent(case_id=case.id, actor_id=actor_id, event_type="escalated", description=f"Escalated: {reason}"))
    db.commit()
    db.refresh(case)
    return case


def request_review(db: Session, case_id: str, actor_id: str, reason: str) -> VerificationCase:
    """Oversight asks the college to re-examine a decision. The original decision stays in the history."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")
    previous = case.status
    case.status = "under_review"
    case.updated_at = datetime.utcnow()
    db.add(CaseEvent(
        case_id=case.id,
        actor_id=actor_id,
        event_type="review_requested",
        description=f"Re-review requested (was {previous}): {reason}",
        old_value=previous,
        new_value="under_review",
    ))
    db.commit()
    db.refresh(case)
    return case
