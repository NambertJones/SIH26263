"""Privacy helpers for national identifiers (DPDP data minimisation)."""

import re

_APAAR_RE = re.compile(r"^\d{12}$")


def normalise_apaar(apaar_id: str | None) -> str:
    """Strip spaces and hyphens so '1234 5678-9012' compares equal to '123456789012'."""
    return re.sub(r"[\s-]", "", apaar_id or "")


def apaar_status(apaar_id: str | None) -> str:
    """Format-only status of an APAAR value. Never implies identity verification."""
    value = normalise_apaar(apaar_id)
    if not value:
        return "MISSING"
    return "FORMAT_VALID" if _APAAR_RE.match(value) else "FORMAT_INVALID"


def mask_apaar(apaar_id: str | None) -> str:
    """Mask an APAAR ID down to its last 4 digits, e.g. 'XXXX-XXXX-9012'.

    Malformed values are never echoed: only their length is shown so the
    record can still be found and corrected.
    """
    value = normalise_apaar(apaar_id)
    if not value:
        return "N/A"
    if _APAAR_RE.match(value):
        return f"XXXX-XXXX-{value[-4:]}"
    return f"Invalid format ({len(value)} chars)"
