"""User model with role-based access."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)  # admin, institution_user, reviewer
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="users")
    submissions = relationship("Submission", back_populates="uploaded_by_user", lazy="dynamic")
    assigned_cases = relationship(
        "VerificationCase",
        foreign_keys="VerificationCase.assigned_to",
        back_populates="assigned_user",
        lazy="dynamic",
    )
    resolved_cases = relationship(
        "VerificationCase",
        foreign_keys="VerificationCase.resolved_by",
        back_populates="resolved_user",
        lazy="dynamic",
    )
    audit_logs = relationship("AuditLog", back_populates="actor", lazy="dynamic")
    case_events = relationship("CaseEvent", back_populates="actor", lazy="dynamic")
