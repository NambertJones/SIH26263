"""Validation rule settings: readable by every role, editable by the institution admin."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id, require_institution_admin
from app.services.audit_service import log_event
from app.services.validation_rules import get_rule_config, clean_rule_config, save_rule_config, rule_catalogue

router = APIRouter(prefix="/api/validation-rules", tags=["Validation Rules"])


@router.get("")
def read_rules(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    eff_id = get_effective_institution_id(current_user, institution_id)
    return {
        "institution_id": eff_id,
        "config": get_rule_config(db, eff_id),
        "catalogue": rule_catalogue(),
        "can_edit": current_user.role == "admin" and bool(current_user.institution_id),
    }


@router.put("")
def update_rules(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_institution_admin(current_user, "change validation rules")
    try:
        config = clean_rule_config(payload.get("config", payload))
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    before = get_rule_config(db, current_user.institution_id)
    saved = save_rule_config(db, current_user.institution_id, config, current_user.id)
    changed = [k for k in saved if saved[k] != before.get(k)]
    log_event(
        db=db,
        action="rules_updated",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="validation_rules",
        entity_id=current_user.institution_id,
        description=f"Validation rules updated ({', '.join(changed) or 'no changes'}). Applies to the next validation run.",
        metadata={"changed": changed},
    )
    return {"config": saved, "changed": changed}
