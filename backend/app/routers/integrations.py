"""Integrations router for registry connectors (sandbox mode)."""

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.middleware.auth import get_current_user
from app.services.mock_integrations import MockIntegrations
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/integrations", tags=["External Integrations"])

INTEGRATIONS_CATALOG = [
    {
        "id": "apaar",
        "service_name": "apaar",
        "display_name": "APAAR Verification",
        "description": "APAAR ID lookup. Sandbox mode validates the 12-digit format; registry verification requires authorised access to the APAAR registry.",
        "status": "active",
        "is_mock": True,
        "endpoint": "sandbox://apaar",
        "last_checked": "Sandbox — production not connected",
        "badge": "Sandbox",
    },
    {
        "id": "digilocker",
        "service_name": "digilocker",
        "display_name": "DigiLocker / NAD",
        "description": "Academic-award lookup. Sandbox mode returns fixed sample responses; production requires DigiLocker onboarding.",
        "status": "active",
        "is_mock": True,
        "endpoint": "sandbox://digilocker",
        "last_checked": "Sandbox — production not connected",
        "badge": "Sandbox",
    },
    {
        "id": "aicte",
        "service_name": "aicte",
        "display_name": "AICTE Approval Data",
        "description": "Approval-status lookup. Sandbox mode returns fixed sample responses; production requires authorised AICTE data access.",
        "status": "active",
        "is_mock": True,
        "endpoint": "sandbox://aicte",
        "last_checked": "Sandbox — production not connected",
        "badge": "Sandbox",
    },
    {
        "id": "aishe",
        "service_name": "aishe",
        "display_name": "AISHE Registry",
        "description": "Institution-code lookup. Sandbox mode returns fixed sample responses; production requires AISHE data access.",
        "status": "active",
        "is_mock": True,
        "endpoint": "sandbox://aishe",
        "last_checked": "Sandbox — production not connected",
        "badge": "Sandbox",
    },
]


@router.get("")
def list_integrations(current_user: User = Depends(get_current_user)):
    """List all registry connectors."""
    return INTEGRATIONS_CATALOG


@router.post("/{service}/mock-check")
def run_mock_check(
    service: str,
    payload: dict = Body(default={}),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run a sandbox query against a connector."""
    service_clean = service.lower().strip()

    if service_clean == "apaar":
        apaar_id = payload.get("apaar_id", "234567890123")
        res = MockIntegrations.verify_apaar_id(apaar_id)
    elif service_clean == "digilocker":
        apaar_id = payload.get("apaar_id", "234567890123")
        student_name = payload.get("student_name", "Aarav Sharma")
        res = MockIntegrations.verify_digilocker_awards(apaar_id, student_name)
    elif service_clean == "aicte":
        aicte_id = payload.get("aicte_id", "1-3324567891")
        prog = payload.get("programme_code", "CSE")
        res = MockIntegrations.verify_aicte_approval(aicte_id, prog)
    elif service_clean == "aishe":
        aishe_code = payload.get("aishe_code", "C-12345")
        res = MockIntegrations.verify_aishe(aishe_code)
    else:
        res = {"error": f"Unknown service {service}", "sandbox": True}

    log_event(
        db=db,
        action="mock_check",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="integration",
        description=f"Executed sandbox test for {service_clean}.",
    )

    return res


@router.put("/{service}/configure")
def configure_integration(
    service: str,
    config: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update settings for an integration."""
    log_event(
        db=db,
        action="configure_integration",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="integration",
        description=f"Updated mock configuration for {service}.",
    )
    return {"service": service, "message": "Configuration updated (sandbox connector)", "config": config}
