"""Sandbox reference records used for reconciliation (not an official registry)."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Date, DateTime

from app.database import Base


class ReferenceRecord(Base):
    __tablename__ = "reference_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    apaar_id = Column(String(12), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    source = Column(String(100), default="Sandbox reference dataset")
    created_at = Column(DateTime, default=datetime.utcnow)
