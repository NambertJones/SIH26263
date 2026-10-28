"""Institution and Programme schemas."""

from datetime import datetime
from pydantic import BaseModel


class InstitutionResponse(BaseModel):
    id: str
    aicte_id: str
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    type: str | None = None
    status: str
    logo_url: str | None = None
    affiliating_university: str | None = None
    established_year: int | None = None
    approval_status: str | None = None
    approval_reference: str | None = None
    approval_valid_till: str | None = None
    contact_email: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InstitutionUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    type: str | None = None
    logo_url: str | None = None


class ProgrammeResponse(BaseModel):
    id: str
    institution_id: str
    code: str
    name: str
    degree_type: str | None = None
    duration_years: int
    approved_intake: int
    academic_year: str
    supernumerary_seats: int
    nri_seats: int
    status: str

    class Config:
        from_attributes = True


class ProgrammeCreate(BaseModel):
    code: str
    name: str
    degree_type: str | None = None
    duration_years: int = 4
    approved_intake: int
    academic_year: str
    supernumerary_seats: int = 0
    nri_seats: int = 0
