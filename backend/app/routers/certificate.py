"""Certificate preview router (Screen 12) and public verification endpoint."""

import base64
import io
from datetime import datetime

import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.institution import Institution, Programme
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id
from app.services.privacy import mask_apaar

router = APIRouter(prefix="/api/certificate", tags=["Certificate"])
public_router = APIRouter(prefix="/api/public", tags=["Public Verification"])

CERT_PREFIX = "AICTE-APAAR-"


def _certificate_number(student: Student) -> str:
    year = (student.created_at or datetime.utcnow()).year
    return f"{CERT_PREFIX}{year}-{student.id[:8].upper()}"


def _verify_url(cert_number: str) -> str:
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/verify/{cert_number}"


def _qr_svg_data_uri(text: str) -> str:
    img = qrcode.make(text, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=1)
    buf = io.BytesIO()
    img.save(buf)
    return "data:image/svg+xml;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@router.get("/{student_id}/preview")
def get_certificate_preview(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate verification certificate data for a student of the caller's institution."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Tenant isolation: institution users can only preview their own students
    get_effective_institution_id(current_user, student.institution_id)

    inst = db.query(Institution).filter(Institution.id == student.institution_id).first()
    prog = db.query(Programme).filter(Programme.id == student.programme_id).first() if student.programme_id else None

    cert_number = _certificate_number(student)
    verify_url = _verify_url(cert_number)

    return {
        "certificate_id": cert_number,
        "title": "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION",
        "subtitle": "Student Enrollment & APAAR Verification Certificate",
        "status": "VERIFIED_PROTOTYPE" if student.validation_status == "valid" else "NOT_VERIFIED",
        "is_prototype": True,
        "disclaimer": "This is a prototype certificate for demo purposes. Not valid for legal or statutory certification.",
        "student": {
            "name": student.name,
            "apaar_id": student.apaar_id or "N/A",
            "apaar_id_masked": mask_apaar(student.apaar_id),
            "roll_no": student.institute_roll_no or "N/A",
            "dob": student.date_of_birth.isoformat() if student.date_of_birth else "N/A",
            "gender": student.gender or "N/A",
            "enrollment_date": student.enrollment_date.isoformat() if student.enrollment_date else "N/A",
        },
        "institution": {
            "name": inst.name if inst else "N/A",
            "aicte_id": inst.aicte_id if inst else "N/A",
            "city": inst.city if inst else "N/A",
            "state": inst.state if inst else "N/A",
        },
        "programme": {
            "name": prog.name if prog else "Engineering & Technology",
            "code": prog.code if prog else "N/A",
            "degree": prog.degree_type if prog else "B.Tech",
            "academic_year": prog.academic_year if prog else "2025-26",
        },
        "issued_at": datetime.utcnow().strftime("%d %B %Y"),
        # QR carries only the certificate number — never the APAAR ID itself
        "verify_url": verify_url,
        "qr_code_data": verify_url,
        "qr_svg": _qr_svg_data_uri(verify_url),
    }


@public_router.get("/verify/{certificate_id}")
def public_verify(certificate_id: str, db: Session = Depends(get_db)):
    """Public verification for employers / regulators (no login).

    Returns only the minimum needed to confirm a record: masked APAAR,
    name, institution, programme and current status. No DOB, contact
    details or category are exposed.
    """
    cert = certificate_id.strip().upper()
    parts = cert.split("-")
    if not cert.startswith(CERT_PREFIX) or len(parts) != 4 or len(parts[3]) != 8:
        raise HTTPException(status_code=404, detail="Certificate not found")

    id_prefix = parts[3].lower()
    student = (
        db.query(Student)
        .filter(Student.id.like(f"{id_prefix}%"), Student.is_latest.is_(True))
        .first()
    )
    if not student or _certificate_number(student) != cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    inst = db.query(Institution).filter(Institution.id == student.institution_id).first()
    prog = db.query(Programme).filter(Programme.id == student.programme_id).first() if student.programme_id else None

    is_valid = student.validation_status == "valid" and student.enrollment_status == "active"

    return {
        "certificate_id": cert,
        "result": "VALID" if is_valid else "NOT_VERIFIED",
        "student_name": student.name,
        "apaar_id_masked": mask_apaar(student.apaar_id),
        "institution": inst.name if inst else None,
        "aicte_id": inst.aicte_id if inst else None,
        "programme": prog.name if prog else None,
        "academic_year": prog.academic_year if prog else None,
        "enrollment_status": student.enrollment_status,
        "checked_at": datetime.utcnow().isoformat() + "Z",
        "demo_mode": True,
        "notice": "Prototype verification on synthetic data. Not an official AICTE/APAAR service.",
    }
