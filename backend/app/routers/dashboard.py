"""Dashboard analytics router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id
from app.services.report_generator import (
    get_dashboard_stats,
    get_recent_activity,
    get_enrollment_by_program,
    get_submission_status_breakdown,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def stats(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get aggregated statistics for dashboard cards."""
    eff_inst_id = get_effective_institution_id(current_user, institution_id)
    return get_dashboard_stats(db, eff_inst_id)


@router.get("/recent-activity")
def recent_activity(
    institution_id: str | None = None,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent activity audit trail feed."""
    eff_inst_id = get_effective_institution_id(current_user, institution_id)
    return get_recent_activity(db, eff_inst_id, limit)


@router.get("/enrollment-by-program")
def enrollment_by_program(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get program-wise enrollment vs approved intake."""
    eff_inst_id = get_effective_institution_id(current_user, institution_id)
    return get_enrollment_by_program(db, eff_inst_id)


@router.get("/submission-status")
def submission_status(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get submission breakdown: valid, issues, pending."""
    eff_inst_id = get_effective_institution_id(current_user, institution_id)
    return get_submission_status_breakdown(db, eff_inst_id)
