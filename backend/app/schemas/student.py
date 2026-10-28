"""Student schemas."""

from datetime import date, datetime
from pydantic import BaseModel


class StudentResponse(BaseModel):
    id: str
    institution_id: str
    submission_id: str | None = None
    apaar_id: str | None = None
    name: str
    date_of_birth: date | None = None
    gender: str | None = None
    programme_id: str | None = None
    programme_name: str | None = None
    programme_code: str | None = None
    enrollment_date: date | None = None
    enrollment_status: str | None = None
    category: str | None = None
    institute_roll_no: str | None = None
    email: str | None = None
    phone: str | None = None
    row_number: int | None = None
    validation_status: str
    remarks: str | None = None
    version: int
    is_latest: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentCorrection(BaseModel):
    name: str | None = None
    apaar_id: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    enrollment_status: str | None = None
    category: str | None = None
    institute_roll_no: str | None = None
    email: str | None = None
    programme_id: str | None = None
    reason: str


class StudentDetailResponse(StudentResponse):
    institution_name: str | None = None
    issues: list["ValidationIssueResponse"] = []
    cases: list["VerificationCaseResponse"] = []


class ValidationIssueResponse(BaseModel):
    id: str
    rule_code: str
    severity: str
    field_name: str | None = None
    description: str
    row_number: int | None = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class VerificationCaseResponse(BaseModel):
    id: str
    issue_type: str
    title: str | None = None
    description: str | None = None
    status: str
    assigned_to: str | None = None
    assigned_user_name: str | None = None
    priority: str
    created_at: datetime
    resolved_at: datetime | None = None

    class Config:
        from_attributes = True


# Rebuild forward references
StudentDetailResponse.model_rebuild()
