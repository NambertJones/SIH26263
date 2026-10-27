"""Validation results router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.services.privacy import mask_apaar
from app.database import get_db
from app.models.user import User
from app.models.submission import Submission
from app.models.validation import ValidationIssue
from app.models.student import Student
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id

router = APIRouter(prefix="/api/validation", tags=["Validation"])


@router.get("/{submission_id}/results")
def get_validation_results(
    submission_id: str,
    severity: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all validation issues for a submission."""
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    get_effective_institution_id(current_user, s.institution_id)

    query = db.query(ValidationIssue, Student).outerjoin(
        Student, ValidationIssue.student_id == Student.id
    ).filter(ValidationIssue.submission_id == submission_id)

    if severity and severity != "all":
        query = query.filter(ValidationIssue.severity == severity)

    rows = query.order_by(ValidationIssue.row_number).all()

    issues = []
    for issue, student in rows:
        issues.append({
            "id": issue.id,
            "submission_id": issue.submission_id,
            "student_id": issue.student_id,
            "student_name": student.name if student else None,
            "student_apaar_id": mask_apaar(student.apaar_id) if student else None,
            "rule_code": issue.rule_code,
            "severity": issue.severity,
            "field_name": issue.field_name,
            "description": issue.description,
            "row_number": issue.row_number,
            "status": issue.status,
            "created_at": issue.created_at,
        })

    return {
        "submission_id": s.id,
        "total_records": s.total_records or 0,
        "valid_records": s.valid_records or 0,
        "error_records": s.error_records or 0,
        "warning_records": s.warning_records or 0,
        "issues_count": len(issues),
        "issues": issues,
    }


@router.get("/{submission_id}/errors")
def get_errors_only(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get only error severity issues."""
    return get_validation_results(submission_id, severity="error", current_user=current_user, db=db)


@router.get("/{submission_id}/warnings")
def get_warnings_only(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get only warning severity issues."""
    return get_validation_results(submission_id, severity="warning", current_user=current_user, db=db)


@router.get("/{submission_id}/duplicates")
def get_duplicates_only(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get only duplicate-related issues."""
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    get_effective_institution_id(current_user, s.institution_id)

    rows = db.query(ValidationIssue, Student).outerjoin(
        Student, ValidationIssue.student_id == Student.id
    ).filter(
        ValidationIssue.submission_id == submission_id,
        ValidationIssue.rule_code.like("%DUP%"),
    ).order_by(ValidationIssue.row_number).all()

    issues = []
    for issue, student in rows:
        issues.append({
            "id": issue.id,
            "submission_id": issue.submission_id,
            "student_id": issue.student_id,
            "student_name": student.name if student else None,
            "student_apaar_id": mask_apaar(student.apaar_id) if student else None,
            "rule_code": issue.rule_code,
            "severity": issue.severity,
            "field_name": issue.field_name,
            "description": issue.description,
            "row_number": issue.row_number,
            "status": issue.status,
            "created_at": issue.created_at,
        })

    return {
        "submission_id": s.id,
        "duplicates_count": len(issues),
        "issues": issues,
    }
