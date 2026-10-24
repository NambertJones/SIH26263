"""Authentication router."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.institution import Institution
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import verify_password, create_access_token
from app.services.audit_service import log_event
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password."""
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your administrator.",
        )

    user.last_login = datetime.utcnow()
    db.commit()

    inst_name = None
    if user.institution_id:
        inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
        if inst:
            inst_name = inst.name

    token_payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "institution_id": user.institution_id,
        "institution_name": inst_name,
    }
    access_token = create_access_token(token_payload)

    # Audit log
    log_event(
        db=db,
        action="login",
        actor_id=user.id,
        actor_email=user.email,
        entity_type="user",
        entity_id=user.id,
        description=f"User {user.email} logged in successfully.",
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        institution_id=user.institution_id,
        institution_name=inst_name,
        status=user.status,
        created_at=user.created_at,
        last_login=user.last_login,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the currently authenticated user's profile."""
    inst_name = None
    if current_user.institution_id:
        inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        if inst:
            inst_name = inst.name

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        institution_id=current_user.institution_id,
        institution_name=inst_name,
        status=current_user.status,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Refresh an active token."""
    inst_name = None
    if current_user.institution_id:
        inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        if inst:
            inst_name = inst.name

    token_payload = {
        "sub": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "institution_id": current_user.institution_id,
        "institution_name": inst_name,
    }
    access_token = create_access_token(token_payload)

    user_resp = UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        institution_id=current_user.institution_id,
        institution_name=inst_name,
        status=current_user.status,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp,
    )
