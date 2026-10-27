"""Submissions router for file upload, column mapping, and submission lifecycle."""

import os
import hashlib
import uuid
from datetime import datetime, date
from dateutil import parser as date_parser
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.submission import Submission
from app.models.student import Student
from app.models.institution import Programme
from app.schemas.submission import SubmissionResponse, ColumnMappingRequest
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id
from app.services.file_processor import get_file_preview, parse_rows_with_mapping
from app.services.validation_engine import validate_submission
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/submissions", tags=["Submissions"])


def _ensure_own_programme(db: Session, programme_id: str | None, institution_id: str) -> None:
    """A submission can only be attached to a programme of the same institution."""
    if not programme_id:
        return
    prog = db.query(Programme).filter(Programme.id == programme_id).first()
    if not prog or prog.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected programme does not belong to this institution.",
        )


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    programme_id: str | None = Form(None),
    academic_year: str | None = Form("2025-26"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a CSV or XLSX student data file."""
    if not current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to an institution to upload data.",
        )

    _ensure_own_programme(db, programme_id, current_user.institution_id)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_filename = f"{uuid.uuid4()}_{os.path.basename(file.filename or 'upload')}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB.",
        )

    checksum = hashlib.sha256(content).hexdigest()

    with open(file_path, "wb") as f:
        f.write(content)

    # Inspect file headers and rows
    try:
        preview_data = get_file_preview(file_path, limit=10)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}",
        )

    submission = Submission(
        institution_id=current_user.institution_id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        file_path=file_path,
        file_checksum=checksum,
        academic_year=academic_year,
        programme_id=programme_id if programme_id else None,
        total_records=preview_data["total_rows"],
        status="mapping",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    log_event(
        db=db,
        action="upload",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="submission",
        entity_id=submission.id,
        description=f"Uploaded file '{file.filename}' with {preview_data['total_rows']} rows.",
    )

    return {
        "submission_id": submission.id,
        "file_name": submission.file_name,
        "total_records": submission.total_records,
        "status": submission.status,
        "academic_year": submission.academic_year,
        "columns": preview_data["columns"],
        "auto_mappings": preview_data["auto_mappings"],
        "preview_rows": preview_data["preview_rows"],
    }


@router.get("", response_model=list[SubmissionResponse])
def list_submissions(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List submissions scoped to institution."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    query = db.query(Submission)
    if eff_id:
        query = query.filter(Submission.institution_id == eff_id)

    submissions = query.order_by(Submission.submitted_at.desc()).all()
    results = []
    for s in submissions:
        prog = db.query(Programme).filter(Programme.id == s.programme_id).first() if s.programme_id else None
        results.append(
            SubmissionResponse(
                id=s.id,
                institution_id=s.institution_id,
                uploaded_by=s.uploaded_by,
                uploader_name=s.uploaded_by_user.name if s.uploaded_by_user else None,
                file_name=s.file_name,
                academic_year=s.academic_year,
                programme_id=s.programme_id,
                programme_name=prog.name if prog else None,
                total_records=s.total_records or 0,
                valid_records=s.valid_records or 0,
                error_records=s.error_records or 0,
                warning_records=s.warning_records or 0,
                status=s.status,
                column_mapping=s.column_mapping,
                submitted_at=s.submitted_at,
                validated_at=s.validated_at,
            )
        )
    return results


@router.get("/{submission_id}")
def get_submission(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get submission details."""
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    get_effective_institution_id(current_user, s.institution_id)
    prog = db.query(Programme).filter(Programme.id == s.programme_id).first() if s.programme_id else None

    return {
        "id": s.id,
        "institution_id": s.institution_id,
        "uploaded_by": s.uploaded_by,
        "uploader_name": s.uploaded_by_user.name if s.uploaded_by_user else None,
        "file_name": s.file_name,
        "academic_year": s.academic_year,
        "programme_id": s.programme_id,
        "programme_name": prog.name if prog else None,
        "total_records": s.total_records or 0,
        "valid_records": s.valid_records or 0,
        "error_records": s.error_records or 0,
        "warning_records": s.warning_records or 0,
        "status": s.status,
        "column_mapping": s.column_mapping,
        "submitted_at": s.submitted_at,
        "validated_at": s.validated_at,
    }


@router.get("/{submission_id}/preview")
def preview_submission(
    submission_id: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get preview rows from the uploaded file."""
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    get_effective_institution_id(current_user, s.institution_id)
    if not s.file_path or not os.path.exists(s.file_path):
        raise HTTPException(status_code=400, detail="File on disk not found.")

    return get_file_preview(s.file_path, limit=limit)


@router.post("/{submission_id}/map-columns")
def map_columns(
    submission_id: str,
    request: ColumnMappingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save column mapping and populate student records from file."""
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    get_effective_institution_id(current_user, s.institution_id)

    if request.programme_id:
        _ensure_own_programme(db, request.programme_id, s.institution_id)
        s.programme_id = request.programme_id
    if request.academic_year:
        s.academic_year = request.academic_year

    s.column_mapping = request.mapping
    s.status = "mapped"

    # Parse all rows from file using mapping
    parsed_rows = parse_rows_with_mapping(s.file_path, request.mapping)

    # Delete existing student records for this submission
    db.query(Student).filter(Student.submission_id == s.id).delete()

    students_to_add = []
    for r in parsed_rows:
        # Parse date of birth
        dob = None
        if r.get("date_of_birth"):
            try:
                dob = date_parser.parse(str(r["date_of_birth"]), dayfirst=True).date()
            except Exception:
                dob = None

        # Parse enrollment date
        enr_date = None
        if r.get("enrollment_date"):
            try:
                enr_date = date_parser.parse(str(r["enrollment_date"]), dayfirst=True).date()
            except Exception:
                enr_date = None

        student = Student(
            institution_id=s.institution_id,
            submission_id=s.id,
            apaar_id=r.get("apaar_id"),
            name=r.get("name") or "Unknown Candidate",
            date_of_birth=dob,
            gender=r.get("gender"),
            programme_id=s.programme_id,
            enrollment_date=enr_date,
            enrollment_status=r.get("enrollment_status") or "active",
            category=r.get("category") or "General",
            institute_roll_no=r.get("institute_roll_no"),
            email=r.get("email"),
            phone=r.get("phone"),
            row_number=r.get("row_number"),
            validation_status="pending",
        )
        students_to_add.append(student)

    db.add_all(students_to_add)
    s.total_records = len(students_to_add)
    db.commit()

    log_event(
        db=db,
        action="map_columns",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="submission",
        entity_id=s.id,
        description=f"Mapped columns and loaded {len(students_to_add)} records for submission {s.id}.",
    )

    return {
        "submission_id": s.id,
        "total_records": len(students_to_add),
        "status": s.status,
        "mapping": s.column_mapping,
    }


@router.post("/{submission_id}/validate")
def validate(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run validation engine on submission records."""
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    get_effective_institution_id(current_user, s.institution_id)

    results = validate_submission(db, s.id)

    log_event(
        db=db,
        action="validate",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="submission",
        entity_id=s.id,
        description=f"Validated {results['total_records']} records. Valid: {results['valid_records']}, Errors: {results['error_records']}, Warnings: {results['warning_records']}.",
    )

    return results


@router.post("/{submission_id}/submit")
def submit_final(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Finalize submission."""
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    get_effective_institution_id(current_user, s.institution_id)

    s.status = "submitted"
    db.commit()

    log_event(
        db=db,
        action="submit",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="submission",
        entity_id=s.id,
        description=f"Finalized and submitted submission {s.id}.",
    )

    return {"submission_id": s.id, "status": s.status, "message": "Submission submitted successfully"}
