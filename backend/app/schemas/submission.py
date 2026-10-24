"""Submission schemas."""

from datetime import datetime
from pydantic import BaseModel


class SubmissionResponse(BaseModel):
    id: str
    institution_id: str
    uploaded_by: str
    uploader_name: str | None = None
    file_name: str | None = None
    academic_year: str | None = None
    programme_id: str | None = None
    programme_name: str | None = None
    total_records: int
    valid_records: int
    error_records: int
    warning_records: int
    status: str
    column_mapping: dict | None = None
    submitted_at: datetime
    validated_at: datetime | None = None

    class Config:
        from_attributes = True


class ColumnMappingRequest(BaseModel):
    mapping: dict[str, str]  # { "required_field": "file_column_name" }
    academic_year: str | None = None
    programme_id: str | None = None


class SubmissionPreviewRow(BaseModel):
    row_number: int
    data: dict
    status: str | None = None
    issues: list[str] = []
