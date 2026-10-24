"""User schemas."""

from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    institution_id: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    status: str | None = None
    institution_id: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    institution_id: str | None = None
    institution_name: str | None = None
    created_at: datetime
    last_login: datetime | None = None

    class Config:
        from_attributes = True
