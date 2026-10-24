"""Audit logs router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


@router.get("")
def list_audit_logs(
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve audit logs."""
    query = db.query(AuditLog)

    if action and action != "all":
        query = query.filter(AuditLog.action == action)
    if entity_type and entity_type != "all":
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": l.id,
                "actor_id": l.actor_id,
                "actor_email": l.actor_email or (l.actor.email if l.actor else "System"),
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "description": l.description,
                "ip_address": l.ip_address,
                "metadata": l.metadata_json,
                "created_at": l.created_at,
            }
            for l in logs
        ],
    }
