"""Oversight monitoring: review decisions, escalations and recurring data-quality issues.

Read-only. Available to oversight reviewers (all institutions) and institution
admins (their own institution). College staff work from the case queue instead.
"""

from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.institution import Institution
from app.models.student import Student
from app.models.validation import ValidationIssue
from app.models.verification import VerificationCase, CaseEvent
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id, is_central_user

router = APIRouter(prefix="/api/oversight", tags=["Oversight"])

RULE_LABELS = {
    "MISSING_REQUIRED": "Missing mandatory field",
    "FMT_APAAR": "APAAR ID format",
    "DUP_APAAR_SAME": "Repeated APAAR ID in a file",
    "DUP_APAAR_CROSS": "APAAR ID active at another institution",
    "FMT_DOB": "Date of birth / age",
    "DOB_CHECK": "Date of birth / age",
    "DATE_INCONSIST": "Admission date inconsistency",
    "FMT_GENDER": "Gender value",
    "FMT_EMAIL": "Email format",
    "INTAKE_EXCEED": "Above intake reference",
}
OPEN_STATUSES = ["open", "under_review", "pending", "escalated"]


@router.get("/summary")
def oversight_summary(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (is_central_user(current_user) or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Oversight monitoring is available to reviewers and institution admins.")
    eff_id = get_effective_institution_id(current_user, institution_id)

    cases_q = db.query(VerificationCase)
    if eff_id:
        cases_q = cases_q.filter(VerificationCase.institution_id == eff_id)
    cases = cases_q.all()
    status_counts = Counter(c.status for c in cases)

    week_ago = datetime.utcnow() - timedelta(days=7)
    users = {u.id: u for u in db.query(User).all()}
    insts = {i.id: i.name for i in db.query(Institution).all()}

    decided = sorted(
        [c for c in cases if c.status in ("resolved", "rejected") and c.resolved_at],
        key=lambda c: c.resolved_at,
        reverse=True,
    )
    recent_decisions = []
    for c in decided[:12]:
        u = users.get(c.resolved_by)
        reviewed_again = db.query(CaseEvent).filter(CaseEvent.case_id == c.id, CaseEvent.event_type == "review_requested").count()
        recent_decisions.append({
            "case_id": c.id,
            "title": c.title,
            "issue_type": c.issue_type,
            "institution_name": insts.get(c.institution_id),
            "decision": "Resolved" if c.status == "resolved" else "Dismissed",
            "reason": c.resolution_reason,
            "decided_by": u.name if u else "Unknown",
            "decided_by_role": u.role if u else None,
            "decided_at": c.resolved_at.isoformat() + "Z",
            "short_reason": bool(c.resolution_reason) and len(c.resolution_reason.strip()) < 25,
            "rereview_count": reviewed_again,
        })

    escalated = [
        {
            "case_id": c.id,
            "title": c.title,
            "institution_name": insts.get(c.institution_id),
            "issue_type": c.issue_type,
            "updated_at": (c.updated_at or c.created_at).isoformat() + "Z",
        }
        for c in cases if c.status == "escalated"
    ]

    issue_q = (
        db.query(ValidationIssue.rule_code, Student.institution_id, func.count(ValidationIssue.id))
        .join(Student, ValidationIssue.student_id == Student.id)
        .filter(ValidationIssue.status == "open")
    )
    if eff_id:
        issue_q = issue_q.filter(Student.institution_id == eff_id)
    issue_rows = issue_q.group_by(ValidationIssue.rule_code, Student.institution_id).all()
    recurring = sorted(
        [
            {
                "rule_code": code,
                "label": RULE_LABELS.get(code, code),
                "institution_name": insts.get(inst_id),
                "count": n,
            }
            for code, inst_id, n in issue_rows
        ],
        key=lambda r: r["count"],
        reverse=True,
    )[:10]

    by_institution = []
    for inst_id, name in insts.items():
        if eff_id and inst_id != eff_id:
            continue
        ic = [c for c in cases if c.institution_id == inst_id]
        if not ic:
            continue
        open_cases = [c for c in ic if c.status in OPEN_STATUSES]
        oldest = min((c.created_at for c in open_cases if c.created_at), default=None)
        by_institution.append({
            "institution_name": name,
            "open": len(open_cases),
            "escalated": sum(1 for c in ic if c.status == "escalated"),
            "decided_last_7_days": sum(1 for c in ic if c.resolved_at and c.resolved_at >= week_ago),
            "oldest_open_days": (datetime.utcnow() - oldest).days if oldest else None,
        })
    by_institution.sort(key=lambda r: (-r["open"], r["institution_name"]))

    return {
        "status_counts": {s: status_counts.get(s, 0) for s in ["open", "under_review", "pending", "escalated", "resolved", "rejected"]},
        "decided_last_7_days": sum(1 for c in decided if c.resolved_at >= week_ago),
        "recent_decisions": recent_decisions,
        "escalated": escalated,
        "recurring_issues": recurring,
        "by_institution": by_institution,
    }
