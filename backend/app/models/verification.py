"""Verification case and case event models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class VerificationCase(Base):
    __tablename__ = "verification_cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True)
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    issue_type = Column(String(50), nullable=False)  # duplicate_enrollment, invalid_data, intake_mismatch, missing_documents
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="open")  # open, under_review, pending, resolved, rejected
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_reason = Column(Text, nullable=True)
    priority = Column(String(20), default="medium")  # low, medium, high, critical
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="verification_cases")
    submission = relationship("Submission", back_populates="verification_cases")
    institution = relationship("Institution", back_populates="verification_cases")
    assigned_user = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_cases")
    resolved_user = relationship("User", foreign_keys=[resolved_by], back_populates="resolved_cases")
    events = relationship("CaseEvent", back_populates="case", order_by="CaseEvent.created_at", lazy="dynamic")


class CaseEvent(Base):
    __tablename__ = "case_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("verification_cases.id"), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # created, assigned, comment, clarification_requested, correction, resolved, rejected, escalated
    description = Column(Text, nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    evidence_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("VerificationCase", back_populates="events")
    actor = relationship("User", back_populates="case_events")
