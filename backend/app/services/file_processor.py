"""File processing service for reading and parsing student data files."""

import os
from typing import Any
import pandas as pd


STANDARD_FIELDS = {
    "name": ["student_name", "student name", "name", "candidate_name", "full_name"],
    "apaar_id": ["apaar_id", "apaar id", "apaar", "abc_id", "one_nation_id", "apaar_no"],
    "date_of_birth": ["dob", "date_of_birth", "birth_date", "birthdate", "d.o.b", "date of birth"],
    "gender": ["gender", "sex"],
    "programme": ["programme", "program", "course", "branch", "department", "degree"],
    "enrollment_date": ["enrollment_date", "admission_date", "date_of_admission", "enrolled_on", "admission date"],
    "enrollment_status": ["status", "enrollment_status", "admission_status"],
    "category": ["category", "caste", "community", "social_category", "quota"],
    "institute_roll_no": ["roll_no", "roll_number", "reg_no", "registration_no", "student_id", "rollno", "roll number"],
    "email": ["email", "email_id", "student_email", "mail"],
    "phone": ["phone", "mobile", "contact", "phone_number", "mobile_no", "contact_no"],
}


def read_file_dataframe(file_path: str) -> pd.DataFrame:
    """Read CSV or Excel file into pandas DataFrame."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        # Read CSV with string dtype for APAAR ID / phone preservation
        return pd.read_csv(file_path, dtype=str, keep_default_na=False)
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(file_path, dtype=str, keep_default_na=False)
    else:
        raise ValueError(f"Unsupported file format: {ext}")


def detect_column_mappings(columns: list[str]) -> dict[str, str]:
    """Suggest intelligent auto-mapping from file columns to standard fields."""
    normalized_cols = {col.lower().strip().replace(" ", "_"): col for col in columns}
    mapping: dict[str, str] = {}

    for standard_field, aliases in STANDARD_FIELDS.items():
        matched = False
        for alias in aliases:
            norm_alias = alias.lower().strip().replace(" ", "_")
            if norm_alias in normalized_cols:
                mapping[standard_field] = normalized_cols[norm_alias]
                matched = True
                break
        if not matched:
            # Substring match fallback
            for norm_col, orig_col in normalized_cols.items():
                if standard_field in norm_col and orig_col not in mapping.values():
                    mapping[standard_field] = orig_col
                    break

    return mapping


def get_file_preview(file_path: str, limit: int = 10) -> dict[str, Any]:
    """Extract headers, total rows, auto-mappings, and first N rows."""
    df = read_file_dataframe(file_path)
    columns = [str(col).strip() for col in df.columns]
    auto_mappings = detect_column_mappings(columns)

    preview_rows = []
    for idx, row in df.head(limit).iterrows():
        preview_rows.append({
            "row_number": int(idx) + 1,
            "data": {str(k): str(v).strip() for k, v in row.items()},
        })

    return {
        "columns": columns,
        "total_rows": len(df),
        "auto_mappings": auto_mappings,
        "preview_rows": preview_rows,
    }


def parse_rows_with_mapping(
    file_path: str,
    mapping: dict[str, str],
) -> list[dict[str, Any]]:
    """Parse entire file into standardized records using provided column mapping."""
    df = read_file_dataframe(file_path)
    records = []

    # Invert mapping: file_column -> standard_field
    file_to_std = {v: k for k, v in mapping.items()}

    for idx, row in df.iterrows():
        record: dict[str, Any] = {
            "row_number": int(idx) + 1,
            "raw_data": {str(k): str(v).strip() for k, v in row.items()},
        }
        for file_col, std_field in file_to_std.items():
            if file_col in row:
                val = str(row[file_col]).strip()
                record[std_field] = val if val else None
            else:
                record[std_field] = None

        records.append(record)

    return records
