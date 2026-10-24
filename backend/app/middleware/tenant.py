"""Tenant isolation helper for multi-institution data segregation."""

from fastapi import HTTPException, status
from app.models.user import User


def get_effective_institution_id(
    current_user: User,
    requested_institution_id: str | None = None,
) -> str | None:
    """
    Determine the effective institution ID.
    - Admins and reviewers can inspect any institution (or all if None).
    - Institution users are strictly bound to their assigned institution.
    """
    if current_user.role in ["admin", "reviewer"]:
        return requested_institution_id or current_user.institution_id

    # Institution user is locked to their institution
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
