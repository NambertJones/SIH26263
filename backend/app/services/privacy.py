"""Privacy helpers for national identifiers (DPDP data minimisation)."""


def mask_apaar(apaar_id: str | None) -> str:
    """Mask a 12-digit APAAR ID as '1234-****-9012'.

    Anything that is not a clean 12-digit ID is masked except its last 2 chars,
    so malformed IDs are never echoed in full either.
    """
    if not apaar_id:
        return "N/A"
    value = apaar_id.strip()
    if len(value) == 12 and value.isdigit():
        return f"{value[:4]}-****-{value[-4:]}"
    if len(value) <= 2:
        return "*" * len(value)
    return "*" * (len(value) - 2) + value[-2:]
