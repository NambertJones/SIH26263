"""Users management router."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.institution import Institution
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.middleware.auth import get_current_user, require_role
from app.middleware.tenant import is_aicte_admin
from app.services.auth_service import hash_password
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    role: str | None = None,
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List users based on role and permissions."""
    query = db.query(User)

    if not is_aicte_admin(current_user):
        # College admins / staff / reviewers only see users in their own scope
        if current_user.institution_id:
            query = query.filter(User.institution_id == current_user.institution_id)
        else:
            query = query.filter(User.id == current_user.id)
    else:
        if institution_id:
            query = query.filter(User.institution_id == institution_id)

    if role and role != "all":
        query = query.filter(User.role == role)

    users = query.order_by(User.created_at.desc()).all()

    results = []
    for u in users:
        inst = db.query(Institution).filter(Institution.id == u.institution_id).first() if u.institution_id else None
        results.append(
            UserResponse(
                id=u.id,
                email=u.email,
                name=u.name,
                role=u.role,
                status=u.status,
                institution_id=u.institution_id,
                institution_name=inst.name if inst else None,
                created_at=u.created_at,
                last_login=u.last_login,
            )
        )
    return results


@router.post("", response_model=UserResponse)
def create_user(
    request: UserCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Create a new user account (Admin only)."""
    if not is_aicte_admin(current_user):
        # College admins can only create staff/admins inside their own institution
        if request.role not in ("institution_user", "admin") or request.institution_id != current_user.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="College administrators can only create users for their own institution.",
            )
    existing = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{request.email}' already exists.",
        )

    new_user = User(
        email=request.email.lower().strip(),
        password_hash=hash_password(request.password),
        name=request.name.strip(),
        role=request.role,
        institution_id=request.institution_id,
        status="active",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_event(
        db=db,
        action="create_user",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="user",
        entity_id=new_user.id,
        description=f"Admin created user {new_user.email} with role {new_user.role}.",
    )

    inst = db.query(Institution).filter(Institution.id == new_user.institution_id).first() if new_user.institution_id else None

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        status=new_user.status,
        institution_id=new_user.institution_id,
        institution_name=inst.name if inst else None,
        created_at=new_user.created_at,
        last_login=new_user.last_login,
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    request: UserUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Update a user's role, status, or details."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if not is_aicte_admin(current_user):
        if u.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Cannot modify users of another institution.")
        if (request.role and request.role not in ("institution_user", "admin")) or (
            request.institution_id is not None and request.institution_id != current_user.institution_id
        ):
            raise HTTPException(status_code=403, detail="College administrators cannot grant AICTE roles or move users.")

    if request.name:
        u.name = request.name.strip()
    if request.role:
        u.role = request.role
    if request.status:
        u.status = request.status
    if request.institution_id is not None:
        u.institution_id = request.institution_id

    db.commit()
    db.refresh(u)

    log_event(
        db=db,
        action="update_user",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="user",
        entity_id=u.id,
        description=f"Admin updated user {u.email}.",
    )

    inst = db.query(Institution).filter(Institution.id == u.institution_id).first() if u.institution_id else None

    return UserResponse(
        id=u.id,
        email=u.email,
        name=u.name,
        role=u.role,
        status=u.status,
        institution_id=u.institution_id,
        institution_name=inst.name if inst else None,
        created_at=u.created_at,
        last_login=u.last_login,
    )


@router.delete("/{user_id}")
def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Deactivate a user account."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if not is_aicte_admin(current_user) and u.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Cannot deactivate users of another institution.")

    if u.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")

    u.status = "inactive"
    db.commit()

    log_event(
        db=db,
        action="deactivate_user",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="user",
        entity_id=u.id,
        description=f"Admin deactivated user {u.email}.",
    )

    return {"message": "User deactivated successfully"}
