"""Institutions and Programmes router."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.institution import Institution, Programme
from app.models.intake import IntakeReference
from app.schemas.institution import (
    InstitutionResponse,
    InstitutionUpdate,
    ProgrammeResponse,
    ProgrammeCreate,
)
from app.middleware.auth import get_current_user, require_role
from app.middleware.tenant import is_aicte_admin
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/institutions", tags=["Institutions"])


@router.get("", response_model=list[InstitutionResponse])
def list_institutions(db: Session = Depends(get_db)):
    """List all institutions (public or authenticated)."""
    return db.query(Institution).filter(Institution.status == "active").all()


@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution(institution_id: str, db: Session = Depends(get_db)):
    """Get single institution profile details."""
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst


@router.put("/{institution_id}", response_model=InstitutionResponse)
def update_institution(
    institution_id: str,
    request: InstitutionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update institution details and profile."""
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    if not is_aicte_admin(current_user) and current_user.institution_id != inst.id:
        raise HTTPException(status_code=403, detail="Permission denied.")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the institution admin can change the institution profile or programmes.")

    if request.name:
        inst.name = request.name.strip()
    if request.address is not None:
        inst.address = request.address.strip()
    if request.city is not None:
        inst.city = request.city.strip()
    if request.state is not None:
        inst.state = request.state.strip()
    if request.type is not None:
        inst.type = request.type.strip()
    if request.logo_url is not None:
        inst.logo_url = request.logo_url.strip()

    db.commit()
    db.refresh(inst)

    log_event(
        db=db,
        action="update_institution",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="institution",
        entity_id=inst.id,
        description=f"Updated profile settings for institution '{inst.name}'.",
    )

    return inst


@router.get("/{institution_id}/programmes", response_model=list[ProgrammeResponse])
def list_programmes(institution_id: str, db: Session = Depends(get_db)):
    """List all programmes for an institution."""
    return db.query(Programme).filter(Programme.institution_id == institution_id).all()


@router.post("/{institution_id}/programmes", response_model=ProgrammeResponse)
def add_programme(
    institution_id: str,
    request: ProgrammeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new academic programme and approved intake."""
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    if not is_aicte_admin(current_user) and current_user.institution_id != inst.id:
        raise HTTPException(status_code=403, detail="Permission denied.")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the institution admin can change the institution profile or programmes.")

    prog = Programme(
        institution_id=institution_id,
        code=request.code.upper().strip(),
        name=request.name.strip(),
        degree_type=request.degree_type or "B.Tech",
        duration_years=request.duration_years,
        approved_intake=request.approved_intake,
        academic_year=request.academic_year,
        supernumerary_seats=request.supernumerary_seats,
        nri_seats=request.nri_seats,
        status="active",
    )
    db.add(prog)
    db.flush()

    # Create baseline intake reference entry
    intake_ref = IntakeReference(
        programme_id=prog.id,
        academic_year=request.academic_year,
        approved_intake=request.approved_intake,
        supernumerary_quota=request.supernumerary_seats,
        nri_quota=request.nri_seats,
        source="Entered by institution admin (unverified)",
    )
    db.add(intake_ref)
    db.commit()
    db.refresh(prog)

    log_event(
        db=db,
        action="add_programme",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="programme",
        entity_id=prog.id,
        description=f"Added programme '{prog.name}' ({prog.code}) with intake {prog.approved_intake}.",
    )

    return prog
