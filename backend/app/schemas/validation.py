"""Validation schemas."""

from datetime import datetime
from pydantic import BaseModel
from app.schemas.student import ValidationIssueResponse


class ValidationSummary(BaseModel):
    submission_id: str
    total_records: int
    valid_records: int
    error_records: int
    warning_records: int
    duplicate_records: int = 0
    issues_by_severity: dict[str, int] = {}
    issues_by_rule: dict[str, int] = {}


class ValidationResultList(BaseModel):
    submission_id: str
    total_issues: int
    issues: list[ValidationIssueResponse]
