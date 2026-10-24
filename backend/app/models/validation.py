"""Validation issue model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey

from app.database import Base


class ValidationIssue(Base):
    __tablename__ = "validation_issues"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id"), nullable=True)
    rule_code = Column(String(30), nullable=False)  # DUP_APAAR, FMT_APAAR, MISSING_FIELD, etc.
    severity = Column(String(20), nullable=False)  # error, warning, info
    field_name = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    row_number = Column(Integer, nullable=True)
    status = Column(String(20), default="open")  # open, resolved, dismissed
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    from sqlalchemy.orm import relationship
    submission = relationship("Submission", back_populates="validation_issues")
    student = relationship("Student", back_populates="validation_issues")
