"""Simulated external integrations for demo purposes."""

import re
from datetime import datetime


class MockIntegrations:
    """Mock integration adapters returning realistic simulated responses."""

    @staticmethod
    def verify_apaar_id(apaar_id: str) -> dict:
        """Simulate APAAR registry verification."""
        clean_id = (apaar_id or "").replace("-", "").strip()
        is_valid_format = bool(re.match(r"^\d{12}$", clean_id))

        if not is_valid_format:
            return {
                "service": "APAAR",
                "apaar_id": apaar_id,
                "status": "INVALID_FORMAT",
                "message": "SIMULATED: APAAR ID must be exactly 12 numeric digits (format check only)",
                "verified": False,
                "timestamp": datetime.utcnow().isoformat(),
                "simulated": True,
                "data_mode": "DEMO_MOCK",
                "notice": "Simulated response from a local mock adapter. Not an official result.",
            }

        # Deterministic simulation based on last digit
        last_digit = int(clean_id[-1]) if clean_id[-1].isdigit() else 0
        if last_digit == 9:
            return {
                "service": "APAAR",
                "apaar_id": clean_id,
                "status": "NOT_FOUND",
                "message": "SIMULATED: demo rule returns not-found for IDs ending in 9. No registry was contacted.",
                "verified": False,
                "timestamp": datetime.utcnow().isoformat(),
                "simulated": True,
                "data_mode": "DEMO_MOCK",
                "notice": "Simulated response from a local mock adapter. Not an official result.",
            }
        elif last_digit == 8:
            return {
                "service": "APAAR",
                "apaar_id": clean_id,
                "status": "FLAGGED",
                "message": "SIMULATED: demo rule flags IDs ending in 8 as a possible multiple enrolment. No registry was contacted.",
                "verified": True,
                "cross_enrollment_detected": True,
                "timestamp": datetime.utcnow().isoformat(),
                "simulated": True,
                "data_mode": "DEMO_MOCK",
                "notice": "Simulated response from a local mock adapter. Not an official result.",
            }

        return {
            "service": "APAAR",
            "apaar_id": clean_id,
            "status": "ACTIVE_VERIFIED",
            "message": "SIMULATED: demo rule returns a match. This is not verification by the APAAR registry.",
            "verified": True,
            "timestamp": datetime.utcnow().isoformat(),
            "simulated": True,
            "data_mode": "DEMO_MOCK",
            "notice": "Simulated response from a local mock adapter. Not an official result.",
        }

    @staticmethod
    def verify_digilocker_awards(apaar_id: str, student_name: str) -> dict:
        """Simulate DigiLocker / NAD academic award verification."""
        return {
            "service": "DigiLocker / NAD",
            "apaar_id": apaar_id,
            "student_name": student_name,
            "awards_found": [
                {
                    "award_type": "Class XII Marksheet",
                    "issuing_board": "CBSE",
                    "year_of_passing": 2024,
                    "verified": True,
                },
                {
                    "award_type": "Class X Marksheet",
                    "issuing_board": "CBSE",
                    "year_of_passing": 2022,
                    "verified": True,
                },
            ],
            "verified": True,
            "timestamp": datetime.utcnow().isoformat(),
            "simulated": True,
            "data_mode": "DEMO_MOCK",
            "notice": "Simulated response from a local mock adapter. Not an official result.",
        }

    @staticmethod
    def verify_aicte_approval(aicte_id: str, programme_code: str | None = None) -> dict:
        """Simulate AICTE Approval portal check."""
        return {
            "service": "AICTE Approval System",
            "institution_id": aicte_id,
            "status": "APPROVED",
            "approval_year": "2025-2026",
            "eoa_issued": True,
            "programme": programme_code,
            "complaint_status": "CLEARED",
            "timestamp": datetime.utcnow().isoformat(),
            "simulated": True,
            "data_mode": "DEMO_MOCK",
            "notice": "Simulated response from a local mock adapter. Not an official result.",
        }

    @staticmethod
    def verify_aishe(aishe_code: str) -> dict:
        """Simulate AISHE portal check."""
        return {
            "service": "AISHE Portal",
            "aishe_code": aishe_code,
            "status": "REGISTERED",
            "category": "Affiliated College",
            "survey_submitted": True,
            "timestamp": datetime.utcnow().isoformat(),
            "simulated": True,
            "data_mode": "DEMO_MOCK",
            "notice": "Simulated response from a local mock adapter. Not an official result.",
        }
