"""Submission model for file uploads."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_path = Column(Text, nullable=True)
    file_checksum = Column(String(64), nullable=True)
    academic_year = Column(String(10), nullable=True)
    programme_id = Column(String(36), ForeignKey("programmes.id"), nullable=True)
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    error_records = Column(Integer, default=0)
    warning_records = Column(Integer, default=0)
    skipped_records = Column(Integer, default=0)  # rows already on record or repeated in the file
    status = Column(String(30), default="uploaded")  # uploaded, mapping, validating, validated, submitted
    column_mapping = Column(JSON, nullable=True)  # User's column mapping config
    submitted_at = Column(DateTime, default=datetime.utcnow)
    validated_at = Column(DateTime, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="submissions")
    uploaded_by_user = relationship("User", back_populates="submissions")
    programme = relationship("Programme")
    students = relationship("Student", back_populates="submission", lazy="dynamic")
    validation_issues = relationship("ValidationIssue", back_populates="submission", lazy="dynamic")
    verification_cases = relationship("VerificationCase", back_populates="submission", lazy="dynamic")
