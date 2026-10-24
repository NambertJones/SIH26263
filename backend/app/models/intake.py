"""Intake reference model for approved intake figures."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class IntakeReference(Base):
    __tablename__ = "intake_reference"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    programme_id = Column(String(36), ForeignKey("programmes.id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    approved_intake = Column(Integer, nullable=False)
    supernumerary_quota = Column(Integer, default=0)
    nri_quota = Column(Integer, default=0)
    oci_quota = Column(Integer, default=0)
    fn_quota = Column(Integer, default=0)
    source = Column(String(100), nullable=True)  # "AICTE Approval Letter 2025"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    programme = relationship("Programme", back_populates="intake_references")

    @property
    def effective_total(self):
        """Calculate total permissible intake including all quotas."""
        return (
            self.approved_intake
            + self.supernumerary_quota
            + self.nri_quota
            + self.oci_quota
            + self.fn_quota
        )
