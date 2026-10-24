"""Student and Enrolment models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=True)
    apaar_id = Column(String(12), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    programme_id = Column(String(36), ForeignKey("programmes.id"), nullable=True)
    enrollment_date = Column(Date, nullable=True)
    enrollment_status = Column(String(30), default="active")  # active, withdrawn, transferred
    category = Column(String(30), nullable=True)  # General, OBC, SC, ST, EWS
    institute_roll_no = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    row_number = Column(Integer, nullable=True)  # Original CSV row number
    validation_status = Column(String(30), default="pending")  # pending, valid, invalid, duplicate, warning
    remarks = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)
    previous_version_id = Column(String(36), ForeignKey("students.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="students")
    submission = relationship("Submission", back_populates="students")
    programme = relationship("Programme", back_populates="students")
    validation_issues = relationship("ValidationIssue", back_populates="student", lazy="dynamic")
    verification_cases = relationship("VerificationCase", back_populates="student", lazy="dynamic")
    enrolments = relationship("Enrolment", back_populates="student", lazy="dynamic")
    previous_version = relationship("Student", remote_side="Student.id", uselist=False)


class Enrolment(Base):
    __tablename__ = "enrolments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id"), nullable=False)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    programme_id = Column(String(36), ForeignKey("programmes.id"), nullable=False)
    academic_year = Column(String(10), nullable=True)
    semester = Column(Integer, nullable=True)
    status = Column(String(30), default="active")
    enrolled_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="enrolments")
