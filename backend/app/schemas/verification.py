"""Verification case schemas."""

from datetime import datetime
from pydantic import BaseModel


class CaseResponse(BaseModel):
    id: str
    student_id: str | None = None
    student_name: str | None = None
    student_apaar_id: str | None = None
    submission_id: str | None = None
    institution_id: str
    issue_type: str
    title: str | None = None
    description: str | None = None
    status: str
    assigned_to: str | None = None
    assigned_user_name: str | None = None
    resolved_by: str | None = None
    resolved_user_name: str | None = None
    resolution_reason: str | None = None
    priority: str
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None
    events: list["CaseEventResponse"] = []

    class Config:
        from_attributes = True


class CaseEventResponse(BaseModel):
    id: str
    case_id: str
    actor_id: str
    actor_name: str | None = None
    event_type: str
    description: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssignCaseRequest(BaseModel):
    assigned_to: str


class CaseCommentRequest(BaseModel):
    evidence: bool = False
    comment: str


class ResolveCaseRequest(BaseModel):
    reason: str


class RejectCaseRequest(BaseModel):
    reason: str


class ClarificationRequest(BaseModel):
    note: str


# Rebuild forward references
CaseResponse.model_rebuild()
