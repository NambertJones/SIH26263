"""Audit logging service."""

from typing import Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def log_event(
    db: Session,
    action: str,
    actor_id: str | None = None,
    actor_email: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    description: str | None = None,
    ip_address: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    """Record an audit trail event."""
    log_entry = AuditLog(
        action=action,
        actor_id=actor_id,
        actor_email=actor_email,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
        metadata_json=metadata,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
