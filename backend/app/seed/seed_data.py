"""Seed data generator for immediate demo availability."""

import random
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from app.services.privacy import mask_apaar
from app.models.user import User
from app.models.institution import Institution, Programme
from app.models.student import Student
from app.models.submission import Submission
from app.models.validation import ValidationIssue
from app.models.verification import VerificationCase, CaseEvent
from app.models.audit import AuditLog
from app.models.integration import IntegrationConfig
from app.models.intake import IntakeReference
from app.services.auth_service import hash_password

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Shaurya", "Atharva", "Dhruv", "Kabir", "Rohan", "Ananya", "Diya", "Saanvi", "Aadhya", "Pari",
    "Ananya", "Myra", "Ira", "Riya", "Ahana", "Prisha", "Tanvi", "Kavya", "Sneha", "Pooja",
    "Rahul", "Rohit", "Sneha", "Karan", "Pooja", "Vikram", "Suresh", "Divya", "Swati", "Naveen"
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Rao", "Kumar", "Gupta", "Singh",
    "Mishra", "Joshi", "Bose", "Chatterjee", "Mukherjee", "Deshmukh", "Kulkarni", "Chauhan", "Mehta", "Pillai"
]

CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"]


def seed_database(db: Session):
    """Seed synthetic data for the prototype."""
    # Check if already seeded
    if db.query(User).filter(User.email == "admin@college.edu.in").first():
        print("[SEED] Database already seeded. Skipping.")
        return

    print("[SEED] Seeding institutions...")
    inst1 = Institution(
        aicte_id="1-1234567B",
        name="St. Joseph's College of Engineering",
        address="OMR, Kamraj Nagar, Semmancheri",
        city="Chennai",
        state="Tamil Nadu",
        type="Self-Financing",
        status="active",
    )
    inst2 = Institution(
        aicte_id="1-9876543A",
        name="ABC Institute of Technology",
        address="Electronic City Phase 1",
        city="Bangalore",
        state="Karnataka",
        type="Private Autonomous",
        status="active",
    )
    inst3 = Institution(
        aicte_id="1-5544332C",
        name="National Engineering College",
        address="K.R. Nagar, Nalattinputhur",
        city="Kovilpatti",
        state="Tamil Nadu",
        type="Government Aided",
        status="active",
    )
    db.add_all([inst1, inst2, inst3])
    db.flush()

    print("[SEED] Seeding programmes...")
    programmes_data = [
        ("CSE", "Computer Science & Engineering", 120),
        ("AIML", "Artificial Intelligence & Machine Learning", 60),
        ("ECE", "Electronics & Communication Engineering", 120),
        ("EEE", "Electrical & Electronics Engineering", 60),
        ("MECH", "Mechanical Engineering", 60),
        ("CIVIL", "Civil Engineering", 60),
    ]

    all_progs = []
    for inst in [inst1, inst2, inst3]:
        for code, name, intake in programmes_data:
            p = Programme(
                institution_id=inst.id,
                code=code,
                name=name,
                degree_type="B.Tech",
                duration_years=4,
                approved_intake=intake,
                academic_year="2025-26",
                supernumerary_seats=6,
                nri_seats=3,
                status="active",
            )
            all_progs.append(p)

    db.add_all(all_progs)
    db.flush()

    print("[SEED] Seeding users...")
    admin_user = User(
        institution_id=inst1.id,
        email="admin@college.edu.in",
        password_hash=hash_password("admin123"),
        name="Dr. S. K. Ramanathan",
        role="admin",
        status="active",
    )
    staff_user = User(
        institution_id=inst1.id,
        email="staff@college.edu.in",
        password_hash=hash_password("staff123"),
        name="Priya Natarajan",
        role="institution_user",
        status="active",
    )
    officer_user = User(
        institution_id=None,
        email="officer1@aicte.gov.in",
        password_hash=hash_password("officer123"),
        name="Shri R. K. Verma (AICTE Officer)",
        role="reviewer",
        status="active",
    )
    db.add_all([admin_user, staff_user, officer_user])
    db.flush()

    print("[SEED] Seeding submissions and students...")
    cse_prog_inst1 = next(p for p in all_progs if p.institution_id == inst1.id and p.code == "CSE")
    aiml_prog_inst1 = next(p for p in all_progs if p.institution_id == inst1.id and p.code == "AIML")
    cse_prog_inst2 = next(p for p in all_progs if p.institution_id == inst2.id and p.code == "CSE")

    # Cross-institution students at ABC Institute (to trigger cross-duplicate)
    cross_students = []
    shared_apaars = ["998877665544", "887766554433", "776655443322"]
    for i, apaar in enumerate(shared_apaars):
        cs = Student(
            institution_id=inst2.id,
            apaar_id=apaar,
            name=f"Student Cross {i+1}",
            date_of_birth=date(2004, 3, 10 + i),
            gender="Male" if i % 2 == 0 else "Female",
            programme_id=cse_prog_inst2.id,
            enrollment_date=date(2025, 7, 15),
            enrollment_status="active",
            category="General",
            institute_roll_no=f"ABC25CS00{i+1}",
            validation_status="valid",
            is_latest=True,
        )
        cross_students.append(cs)
    db.add_all(cross_students)
    db.flush()

    # Submission 1: CSE batch at St. Joseph's (115 students - valid intake)
    sub1 = Submission(
        institution_id=inst1.id,
        uploaded_by=staff_user.id,
        file_name="CSE_2025_Admissions_Final.csv",
        academic_year="2025-26",
        programme_id=cse_prog_inst1.id,
        total_records=115,
        valid_records=105,
        error_records=7,
        warning_records=3,
        status="submitted",  # finalized earlier — counts towards intake
        submitted_at=datetime.utcnow() - timedelta(days=3),
        validated_at=datetime.utcnow() - timedelta(days=3),
    )
    db.add(sub1)
    db.flush()

    sub1_students = []
    sub1_issues = []
    random.seed(42)

    for i in range(1, 116):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        name = f"{fn} {ln}"
        cat = random.choice(CATEGORIES)
        gender = "Male" if i % 2 == 0 else "Female"
        dob = date(2003 + (i % 3), 1 + (i % 12), 1 + (i % 28))
        roll = f"312325104{i:03d}"

        # Inject specific edge cases:
        if i in [5, 12]:
            # Intra-file duplicate APAAR
            apaar = "554433221100"
            status = "duplicate"
            remarks = "Duplicate APAAR ID within submission"
        elif i == 18:
            # Cross-institution duplicate
            apaar = shared_apaars[0]
            status = "duplicate"
            remarks = "Cross-institution duplicate: actively enrolled at ABC Institute of Technology"
        elif i == 25:
            # Format error (10 digits)
            apaar = "1234567890"
            status = "invalid"
            remarks = "Invalid APAAR format: must be 12 digits"
        elif i == 33:
            # Missing APAAR
            apaar = None
            status = "invalid"
            remarks = "APAAR ID is mandatory"
        elif i == 42:
            # Future DOB
            dob = date(2027, 1, 1)
            apaar = f"2400{i:08d}"
            status = "invalid"
            remarks = "Date of birth cannot be in future"
        elif i in [50, 60, 70]:
            # Warning: underage
            dob = date(2013, 5, 1)
            apaar = f"2400{i:08d}"
            status = "warning"
            remarks = "Candidate age is under 14 years"
        else:
            apaar = f"2400{i:08d}"
            status = "valid"
            remarks = "All checks passed successfully."

        st = Student(
            institution_id=inst1.id,
            submission_id=sub1.id,
            apaar_id=apaar,
            name=name,
            date_of_birth=dob,
            gender=gender,
            programme_id=cse_prog_inst1.id,
            enrollment_date=date(2025, 7, 20),
            enrollment_status="active",
            category=cat,
            institute_roll_no=roll,
            email=f"{fn.lower()}.{ln.lower()}{i}@college.edu.in",
            phone=f"98765{i:05d}",
            row_number=i,
            validation_status=status,
            remarks=remarks,
            is_latest=True,
        )
        sub1_students.append(st)

    db.add_all(sub1_students)
    db.flush()

    # Generate validation issues for flagged students
    for st in sub1_students:
        if st.validation_status in ["invalid", "duplicate", "warning"]:
            rule = "MISSING_REQUIRED" if not st.apaar_id else ("FMT_APAAR" if len(st.apaar_id) != 12 else ("DUP_APAAR_CROSS" if st.apaar_id == shared_apaars[0] else "DUP_APAAR_SAME"))
            sev = "warning" if st.validation_status == "warning" else "error"
            issue = ValidationIssue(
                submission_id=sub1.id,
                student_id=st.id,
                rule_code=rule,
                severity=sev,
                field_name="apaar_id" if "APAAR" in rule else "date_of_birth",
                description=st.remarks or "Validation issue flagged",
                row_number=st.row_number,
                status="open",
            )
            sub1_issues.append(issue)

    db.add_all(sub1_issues)
    db.flush()

    print("[SEED] Seeding verification cases...")
    # Cases for sub1 flagged students
    for idx, st in enumerate([s for s in sub1_students if s.validation_status in ["invalid", "duplicate"]]):
        case_status = "resolved" if idx == 0 else ("under_review" if idx == 1 else "open")
        issue_type = "duplicate_enrollment" if st.validation_status == "duplicate" else "invalid_data"

        vc = VerificationCase(
            student_id=st.id,
            submission_id=sub1.id,
            institution_id=inst1.id,
            issue_type=issue_type,
            title=f"Verification for {st.name} ({mask_apaar(st.apaar_id) if st.apaar_id else 'No APAAR'})",
            description=st.remarks,
            status=case_status,
            assigned_to=officer_user.id if case_status != "open" else None,
            priority="high" if issue_type == "duplicate_enrollment" else "medium",
            resolution_reason="Candidate provided verified DigiLocker Aadhaar eKYC certificate." if case_status == "resolved" else None,
            resolved_by=officer_user.id if case_status == "resolved" else None,
            resolved_at=datetime.utcnow() - timedelta(hours=5) if case_status == "resolved" else None,
        )
        db.add(vc)
        db.flush()

        ev1 = CaseEvent(
            case_id=vc.id,
            actor_id=staff_user.id,
            event_type="created",
            description="Case automatically opened after CSV reconciliation check.",
        )
        db.add(ev1)

        if case_status != "open":
            ev2 = CaseEvent(
                case_id=vc.id,
                actor_id=admin_user.id,
                event_type="assigned",
                description=f"Assigned to {officer_user.name} for official AICTE verification.",
            )
            db.add(ev2)

        if case_status == "resolved":
            ev3 = CaseEvent(
                case_id=vc.id,
                actor_id=officer_user.id,
                event_type="resolved",
                description="Verified via DigiLocker. Reconciled and approved.",
            )
            db.add(ev3)

    print("[SEED] Seeding external integrations...")
    integrations = [
        IntegrationConfig(institution_id=inst1.id, service_name="apaar", display_name="APAAR Verification", status="active", is_mock=True),
        IntegrationConfig(institution_id=inst1.id, service_name="digilocker", display_name="DigiLocker / NAD", status="active", is_mock=True),
        IntegrationConfig(institution_id=inst1.id, service_name="aicte", display_name="AICTE Approval Data", status="active", is_mock=True),
        IntegrationConfig(institution_id=inst1.id, service_name="aishe", display_name="AISHE Data", status="active", is_mock=True),
    ]
    db.add_all(integrations)

    print("[SEED] Seeding audit logs...")
    for action, desc in [
        ("login", "User admin@college.edu.in logged into portal."),
        ("upload", "File CSE_2025_Admissions_Final.csv uploaded successfully."),
        ("map_columns", "Column mapping auto-configured and approved."),
        ("validate", "Validation engine completed: 115 records processed."),
        ("case_assigned", "Verification case assigned to Shri R. K. Verma."),
        ("case_resolved", "Case resolved with DigiLocker proof."),
    ]:
        log_entry = AuditLog(
            action=action,
            actor_id=admin_user.id,
            actor_email=admin_user.email,
            description=desc,
        )
        db.add(log_entry)

    db.commit()
    print("[SEED] Synthetic database seeding completed successfully!")
