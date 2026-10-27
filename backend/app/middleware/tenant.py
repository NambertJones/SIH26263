"""Tenant isolation helper for multi-institution data segregation."""

from fastapi import HTTPException, status
from app.models.user import User


def is_aicte_admin(user: User) -> bool:
    """AICTE-level super admin: role 'admin' with no institution attached.

    A college administrator also has role 'admin' but is bound to an
    institution, so it must never get cross-institution powers.
    """
    return user.role == "admin" and not user.institution_id


def is_central_user(user: User) -> bool:
    """AICTE-side users (reviewers and AICTE super admins) who may see all institutions."""
    return user.role == "reviewer" or is_aicte_admin(user)


def require_central_user(user: User) -> None:
    """Only AICTE reviewers / AICTE admins may adjudicate verification cases."""
    if not is_central_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only AICTE verification officers can decide verification cases.",
        )


def get_effective_institution_id(
    current_user: User,
    requested_institution_id: str | None = None,
) -> str | None:
    """
    Determine the effective institution ID.
    - AICTE reviewers and AICTE admins can inspect any institution (or all if None).
    - Institution users and college admins are strictly bound to their own institution.
    """
    if is_central_user(current_user):
        return requested_institution_id or current_user.institution_id

    # Institution user / college admin is locked to their institution
    if not current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with an institution.",
        )

    if requested_institution_id and requested_institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-institution access is prohibited for institution users.",
        )

    return current_user.institution_id
