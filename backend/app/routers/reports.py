"""Reports and analytics router."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.institution import Institution
from app.models.student import Student
from app.services.validation_engine import committed
from app.middleware.auth import get_current_user
from app.middleware.tenant import get_effective_institution_id, is_central_user
from app.services.report_generator import (
    get_dashboard_stats,
    get_enrollment_by_program,
    get_discrepancy_report,
    get_compliance_report,
    get_intake_reconciliation,
)
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/enrollment-summary")
def enrollment_summary(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get overall enrollment summary and program-wise data."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    stats = get_dashboard_stats(db, eff_id)
    programmes = get_enrollment_by_program(db, eff_id)
    return {
        "stats": stats,
        "programmes": programmes,
    }


@router.get("/intake-reconciliation")
def intake_reconciliation(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Per-programme intake comparison with the calculation shown."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    return {"items": get_intake_reconciliation(db, eff_id)}


@router.get("/discrepancy")
def discrepancy_report(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Detailed discrepancy report across all submissions."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    return get_discrepancy_report(db, eff_id)


@router.get("/compliance")
def compliance_report(
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compliance assessment against AICTE guidelines."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    return get_compliance_report(db, eff_id)


@router.get("/institution-wise")
def institution_wise_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Comparison table across all institutions (for reviewers/admins)."""
    # AICTE users see every institution; college users only their own row
    if is_central_user(current_user):
        institutions = db.query(Institution).all()
    else:
        institutions = db.query(Institution).filter(Institution.id == current_user.institution_id).all()
    results = []

    for inst in institutions:
        total_students = committed(db.query(Student)).filter(
            Student.institution_id == inst.id,
            Student.is_latest.is_(True),
        ).count()

        valid_students = committed(db.query(Student)).filter(
            Student.institution_id == inst.id,
            Student.is_latest.is_(True),
            Student.validation_status == "valid",
        ).count()

        issues_count = committed(db.query(Student)).filter(
            Student.institution_id == inst.id,
            Student.is_latest.is_(True),
            Student.validation_status.in_(["invalid", "duplicate"]),
        ).count()

        results.append({
            "institution_id": inst.id,
            "aicte_id": inst.aicte_id,
            "name": inst.name,
            "city": inst.city,
            "state": inst.state,
            "type": inst.type,
            "total_students": total_students,
            "valid_students": valid_students,
            "issues_count": issues_count,
            "valid_percentage": round((valid_students / total_students * 100), 1) if total_students > 0 else 0.0,
            "status": inst.status,
        })

    return results


@router.post("/export")
def export_report(
    report_type: str = "discrepancy",
    institution_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export discrepancy report in CSV format."""
    eff_id = get_effective_institution_id(current_user, institution_id)
    data = get_discrepancy_report(db, eff_id, limit=None)

    log_event(
        db=db,
        action="export_report",
        actor_id=current_user.id,
        actor_email=current_user.email,
        entity_type="report",
        description=f"Exported {report_type} report with {len(data)} rows.",
    )

    import csv
    import io

    def safe(value) -> str:
        """Neutralise spreadsheet formulas (CSV injection) in exported text."""
        text = "" if value is None else str(value)
        return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Issue ID", "Rule Code", "Severity", "Student Name", "Roll No", "APAAR ID (masked)", "Description", "Row Number", "Status"])
    for row in data:
        writer.writerow([safe(row["issue_id"]), safe(row["rule_code"]), safe(row["severity"]), safe(row["student_name"]),
                         safe(row.get("roll_no")), safe(row["student_apaar_id"]), safe(row["description"]),
                         safe(row["row_number"] or ""), safe(row["status"])])
    csv_data = "\ufeff" + buf.getvalue()  # BOM so Excel opens UTF-8 correctly
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=discrepancy_report_{report_type}.csv"},
    )
