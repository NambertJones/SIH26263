"""Report schemas."""

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_students: int
    valid_records: int
    valid_percentage: float
    pending_verification: int
    pending_percentage: float
    issues_found: int
    issues_percentage: float
    total_submissions: int


class EnrollmentByProgram(BaseModel):
    programme_code: str
    programme_name: str
    count: int


class StatusDistribution(BaseModel):
    status: str
    count: int


class ReportSummary(BaseModel):
    total_students: int
    valid_count: int
    valid_percentage: float
    issues_count: int
    issues_percentage: float
    pending_count: int
    pending_percentage: float
    enrollment_by_program: list[EnrollmentByProgram]
    status_distribution: list[StatusDistribution]


class RecentActivity(BaseModel):
    id: str
    action: str
    description: str
    actor_name: str | None = None
    created_at: str
    entity_type: str | None = None
