"""Institution and Programme models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    aicte_id = Column(String(20), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    type = Column(String(50))  # Self-Financing, Government, etc.
    status = Column(String(20), default="active")
    # AICTE-style profile details (as submitted by the institution)
    affiliating_university = Column(String(255))
    established_year = Column(Integer)
    approval_status = Column(String(30))  # Approved, Pending, Not submitted
    approval_reference = Column(String(60))
    approval_valid_till = Column(String(10))  # academic year, e.g. 2025-26
    contact_email = Column(String(255))
    logo_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    programmes = relationship("Programme", back_populates="institution", lazy="dynamic")
    users = relationship("User", back_populates="institution", lazy="dynamic")
    submissions = relationship("Submission", back_populates="institution", lazy="dynamic")
    students = relationship("Student", back_populates="institution", lazy="dynamic")
    verification_cases = relationship("VerificationCase", back_populates="institution", lazy="dynamic")
    integration_configs = relationship("IntegrationConfig", back_populates="institution", lazy="dynamic")


class Programme(Base):
    __tablename__ = "programmes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    code = Column(String(20), nullable=False)  # CSE, ECE, MECH
    name = Column(String(255), nullable=False)
    degree_type = Column(String(50))  # B.E., B.Tech, M.Tech
    duration_years = Column(Integer, default=4)
    approved_intake = Column(Integer, nullable=False)
    academic_year = Column(String(10), nullable=False)  # 2025-26
    supernumerary_seats = Column(Integer, default=0)
    nri_seats = Column(Integer, default=0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="programmes")
    students = relationship("Student", back_populates="programme", lazy="dynamic")
    intake_references = relationship("IntakeReference", back_populates="programme", lazy="dynamic")
