"""Integrations router for simulated government registry adapters."""

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
        "display_name": "APAAR Verification (Simulated)",
        "description": "Validate 12-digit APAAR format and verify Aadhaar biometric linkage via NDEAR / DigiLocker Registry.",
        "status": "active",
        "is_mock": True,
        "endpoint": "https://api.ndear.gov.in/demo/apaar/v1",
        "last_checked": "Just now",
        "badge": "Simulated Adapter",
    },
    {
        "id": "digilocker",
        "service_name": "digilocker",
        "display_name": "DigiLocker / NAD (Simulated)",
        "description": "Cross-verify authentic academic awards, 10th/12th marksheets, and transfer certificates.",
        "status": "active",
        "is_mock": True,
        "endpoint": "https://nad.digilocker.gov.in/demo/v2",
        "last_checked": "Just now",
        "badge": "Simulated Adapter",
    },
    {
        "id": "aicte",
        "service_name": "aicte",
        "display_name": "AICTE Approval Portal (Simulated)",
        "description": "Verify Extension of Approval (EoA), sanctioned intake limits, and approved program matrix.",
        "status": "active",
        "is_mock": True,
        "endpoint": "https://aicte-india.org/demo/eoa/v1",
        "last_checked": "Just now",
        "badge": "Simulated Adapter",
    },
    {
        "id": "aishe",
        "service_name": "aishe",
        "display_name": "AISHE Registry (Simulated)",
        "description": "Cross-check All India Survey on Higher Education institution codes, category, and accreditation.",
        "status": "active",
        "is_mock": True,
        "endpoint": "https://aishe.gov.in/demo/api/v1",
        "last_checked": "Just now",
        "badge": "Simulated Adapter",
    },
]


@router.get("")
def list_integrations(current_user: User = Depends(get_current_user)):
    """List all available external simulated integrations."""
    return INTEGRATIONS_CATALOG


@router.post("/{service}/mock-check")
def run_mock_check(
    service: str,
    payload: dict = Body(default={}),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run an interactive mock verification against the simulated service."""
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
        res = {"error": f"Unknown service {service}", "simulated": True}

    log_event(
        db=db,
        action="mock_check",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="integration",
        description=f"Executed simulated test for {service_clean}.",
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
    return {"service": service, "message": "Configuration updated successfully (Demo mode)", "config": config}
