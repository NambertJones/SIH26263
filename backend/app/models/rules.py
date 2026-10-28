"""Per-institution validation rule settings, configured by the institution admin."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, JSON

from app.database import Base


class ValidationRuleConfig(Base):
    __tablename__ = "validation_rule_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id"), unique=True, nullable=False)
    config = Column(JSON, nullable=False)
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
