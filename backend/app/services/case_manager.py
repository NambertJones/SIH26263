"""Verification case management service."""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.services.privacy import mask_apaar
from app.models.validation import ValidationIssue
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


import re as _re

# A reason that says evidence is still outstanding is not a resolution
_OUTSTANDING = _re.compile(
    r"(still|yet to be|not yet|awaiting|pending|waiting for|to be (submitted|provided|received))[^.]{0,40}"
    r"(evidence|document|proof|card|certificate|confirmation)"
    r"|(evidence|document|proof|card|certificate|copy|copies)s?[^.]{0,30}(still )?"
    r"(required|needed|awaited|pending|outstanding|missing|not (yet )?(received|submitted|provided))",
    _re.IGNORECASE,
)

CASE_RULE_CODES = {
    "duplicate_enrollment": {"DUP_APAAR_SAME", "DUP_APAAR_CROSS", "DUP_ROLL", "POSSIBLE_DUP_PERSON"},
    "reference_mismatch": {"REF_MISMATCH"},
    "intake_mismatch": {"INTAKE_EXCEED"},
}


class CaseDecisionError(ValueError):
    """The decision is inconsistent with the record or the evidence; shown to the user as 409."""


def _current_student(db: Session, case: VerificationCase):
    from app.services.validation_engine import latest_version
    if not case.student_id:
        return None
    s = db.query(Student).filter(Student.id == case.student_id).first()
    return latest_version(db, s) if s else None


def _ensure_not_awaiting_evidence(case: VerificationCase) -> None:
    """A case marked 'Awaiting evidence' is decided only after the evidence is added to it."""
    if case.status == "pending":
        raise CaseDecisionError(
            "This case is awaiting evidence. Add the evidence to the case first (tick 'Add as evidence' when "
            "posting the note), then decide it."
        )


def resolve_case(db: Session, case_id: str, actor_id: str, resolution_reason: str) -> VerificationCase:
    """Resolve only when the record now passes the checks behind the case and the reason is a real outcome."""
    from app.services.validation_engine import revalidate_student

    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")
    if case.status in ("resolved", "rejected"):
        raise CaseDecisionError("This case is already closed.")
    _ensure_not_awaiting_evidence(case)
    if _OUTSTANDING.search(resolution_reason or ""):
        raise CaseDecisionError(
            "Your reason says evidence is still outstanding. Use 'Mark awaiting evidence' instead, "
            "and resolve the case once the evidence has been checked."
        )

    student = _current_student(db, case)
    if student:
        accepted = CASE_RULE_CODES.get(case.issue_type, set()) & {"POSSIBLE_DUP_PERSON", "REF_MISMATCH"}
        _, issues = revalidate_student(db, student)
        blocking = [i for i in issues if i["severity"] == "error"]
        if blocking:
            db.commit()  # keep the refreshed check results visible
            raise CaseDecisionError(
                "The record still fails these checks: "
                + "; ".join(i["description"] for i in blocking[:3])
                + " Correct the record with Submit Correction, mark the case Awaiting evidence, "
                "or Dismiss it if the flag itself is wrong."
            )
        # Warnings this case was about are accepted by the reviewer's decision
        for issue in db.query(ValidationIssue).filter(ValidationIssue.student_id == student.id,
                                                      ValidationIssue.status == "open",
                                                      ValidationIssue.rule_code.in_(accepted or {"__none__"})).all():
            issue.status = "accepted"
        db.flush()
        revalidate_student(db, student)
        case.student_id = student.id

    case.status = "resolved"
    case.resolved_by = actor_id
    case.resolution_reason = resolution_reason
    case.resolved_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()
    db.add(CaseEvent(case_id=case.id, actor_id=actor_id, event_type="resolved",
                     description=f"Resolved with reason: {resolution_reason}"))
    db.commit()
    db.refresh(case)
    return case


def reject_case(db: Session, case_id: str, actor_id: str, rejection_reason: str) -> VerificationCase:
    """Dismiss a flag that was raised wrongly. Definite data errors must be corrected, not dismissed."""
    from app.services.validation_engine import revalidate_student

    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")
    if case.status in ("resolved", "rejected"):
        raise CaseDecisionError("This case is already closed.")
    _ensure_not_awaiting_evidence(case)
    codes = CASE_RULE_CODES.get(case.issue_type)
    if not codes:
        raise CaseDecisionError(
            "This flag reports a definite data error (a missing or invalid field). It cannot be dismissed: "
            "correct the record with Submit Correction, then resolve the case."
        )

    student = _current_student(db, case)
    if student:
        for issue in db.query(ValidationIssue).filter(ValidationIssue.student_id == student.id,
                                                      ValidationIssue.status == "open",
                                                      ValidationIssue.rule_code.in_(codes)).all():
            issue.status = "dismissed"
        db.flush()
        revalidate_student(db, student)
        case.student_id = student.id

    case.status = "rejected"
    case.resolved_by = actor_id
    case.resolution_reason = rejection_reason
    case.resolved_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()
    db.add(CaseEvent(case_id=case.id, actor_id=actor_id, event_type="rejected",
                     description=f"Dismissed: {rejection_reason}"))
    db.commit()
    db.refresh(case)
    return case


def add_evidence(db: Session, case_id: str, actor_id: str, note: str) -> CaseEvent:
    """Record evidence on a case; a case waiting for evidence goes back to review."""
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")
    event = CaseEvent(case_id=case.id, actor_id=actor_id, event_type="evidence_added", description=f"Evidence: {note}")
    db.add(event)
    if case.status == "pending":
        case.status = "under_review"
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return event


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
