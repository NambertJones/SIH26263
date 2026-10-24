"""Certificate preview router for Screen 12."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.institution import Institution, Programme
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/certificate", tags=["Certificate"])


@router.get("/{student_id}/preview")
def get_certificate_preview(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate verification certificate data for a verified student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    inst = db.query(Institution).filter(Institution.id == student.institution_id).first()
    prog = db.query(Programme).filter(Programme.id == student.programme_id).first() if student.programme_id else None

    cert_number = f"AICTE-APAAR-{datetime.utcnow().year}-{student.id[:8].upper()}"

    return {
        "certificate_id": cert_number,
        "title": "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION",
        "subtitle": "Student Enrollment & APAAR Verification Certificate",
        "status": "VERIFIED_PROTOTYPE",
        "is_prototype": True,
        "disclaimer": "This is a prototype certificate for demo purposes. Not valid for legal or statutory certification.",
        "student": {
            "name": student.name,
            "apaar_id": student.apaar_id or "N/A",
            "roll_no": student.institute_roll_no or "N/A",
            "dob": student.date_of_birth.isoformat() if student.date_of_birth else "N/A",
            "gender": student.gender or "N/A",
            "category": student.category or "General",
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
        "qr_code_data": f"https://apaar.aicte-india.org/verify?cert={cert_number}&apaar={student.apaar_id}",
    }
