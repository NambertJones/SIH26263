"""Integration config model for mock external services."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship

from app.database import Base


class IntegrationConfig(Base):
    __tablename__ = "integration_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    service_name = Column(String(50), nullable=False)  # apaar, digilocker, aicte, aishe
    display_name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="simulated")  # simulated, configured, active, error
    is_mock = Column(Boolean, default=True)
    config = Column(JSON, nullable=True)
    last_checked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="integration_configs")
