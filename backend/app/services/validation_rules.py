"""Validation rule settings: defaults, the catalogue shown in the UI, and per-institution overrides.

Integrity checks (APAAR format, duplicates, intake) are always on. Admins can
change which extra fields are mandatory, the age limits and the format checks.
"""

from copy import deepcopy
from sqlalchemy.orm import Session

from app.models.rules import ValidationRuleConfig

# Fields an admin may make mandatory, in addition to the always-required ones
OPTIONAL_REQUIRED_FIELDS = {
    "date_of_birth": "Date of birth",
    "gender": "Gender",
    "institute_roll_no": "Roll number",
    "enrollment_date": "Admission date",
    "email": "Email",
    "phone": "Phone",
}
ALWAYS_REQUIRED = {"name": "Student name", "apaar_id": "APAAR ID"}

DEFAULT_CONFIG = {
    "required_fields": ["date_of_birth"],
    "age_check": {"enabled": True, "min_age": 15, "review_below_age": 16},
    "gender_format": {"enabled": True, "severity": "warning"},
    "email_format": {"enabled": True, "severity": "warning"},
    "admission_date_check": {"enabled": True},
}

LOCKED_RULES = [
    {"code": "FMT_APAAR", "label": "APAAR ID must be exactly 12 digits"},
    {"code": "DUP_APAAR_SAME", "label": "Same APAAR ID repeated within one file"},
    {"code": "DUP_APAAR_CROSS", "label": "APAAR ID already active at another institution"},
    {"code": "INTAKE_EXCEED", "label": "Enrolment above the programme's intake reference"},
]


def _merge(base: dict, override: dict) -> dict:
    out = deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = {**out[key], **value}
        else:
            out[key] = value
    return out


def get_rule_config(db: Session, institution_id: str | None) -> dict:
    if not institution_id:
        return deepcopy(DEFAULT_CONFIG)
    row = db.query(ValidationRuleConfig).filter(ValidationRuleConfig.institution_id == institution_id).first()
    return _merge(DEFAULT_CONFIG, row.config if row else {})


def clean_rule_config(payload: dict) -> dict:
    """Validate an admin's submitted settings; raises ValueError with a readable message."""
    cfg = _merge(DEFAULT_CONFIG, payload)
    required = [f for f in cfg.get("required_fields", []) if f in OPTIONAL_REQUIRED_FIELDS]
    cfg["required_fields"] = sorted(set(required))

    age = cfg["age_check"]
    min_age, review = int(age.get("min_age", 15)), int(age.get("review_below_age", 16))
    if not (10 <= min_age <= 30) or not (min_age <= review <= 35):
        raise ValueError("Age limits must satisfy 10 ≤ minimum age ≤ review age ≤ 35.")
    cfg["age_check"] = {"enabled": bool(age.get("enabled", True)), "min_age": min_age, "review_below_age": review}

    for key in ("gender_format", "email_format"):
        sev = cfg[key].get("severity", "warning")
        if sev not in ("warning", "error"):
            raise ValueError("Severity must be 'warning' or 'error'.")
        cfg[key] = {"enabled": bool(cfg[key].get("enabled", True)), "severity": sev}
    cfg["admission_date_check"] = {"enabled": bool(cfg["admission_date_check"].get("enabled", True))}
    return {k: cfg[k] for k in DEFAULT_CONFIG}


def save_rule_config(db: Session, institution_id: str, config: dict, user_id: str) -> dict:
    row = db.query(ValidationRuleConfig).filter(ValidationRuleConfig.institution_id == institution_id).first()
    if row:
        row.config = config
        row.updated_by = user_id
    else:
        row = ValidationRuleConfig(institution_id=institution_id, config=config, updated_by=user_id)
        db.add(row)
    db.commit()
    return config


def rule_catalogue() -> dict:
    return {
        "always_required": [{"field": k, "label": v} for k, v in ALWAYS_REQUIRED.items()],
        "optional_required": [{"field": k, "label": v} for k, v in OPTIONAL_REQUIRED_FIELDS.items()],
        "locked_rules": LOCKED_RULES,
    }
