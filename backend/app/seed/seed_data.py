"""Synthetic seed data so the prototype is usable immediately.

All institutions, people and identifiers below are fictional. Institution
names are invented place names; codes use an RX- prefix so they can never be
mistaken for real AICTE permanent IDs.
"""

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

MALE_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharva', 'Dhruv', 'Kabir', 'Rohan', 'Rahul', 'Rohit', 'Karan', 'Vikram', 'Suresh', 'Naveen', 'Farhan', 'Imran', 'Joseph', 'Anil', 'Gurpreet', 'Tenzin', 'Karthik', 'Varun']
FEMALE_NAMES = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Pari', 'Myra', 'Ira', 'Riya', 'Ahana', 'Prisha', 'Tanvi', 'Kavya', 'Sneha', 'Pooja', 'Meera', 'Divya', 'Swati', 'Harini', 'Lakshmi', 'Ayesha', 'Zoya', 'Maria', 'Simran', 'Nisha']

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Rao", "Kumar", "Gupta", "Singh",
    "Mishra", "Joshi", "Bose", "Chatterjee", "Mukherjee", "Deshmukh", "Kulkarni", "Chauhan", "Mehta", "Pillai",
    "Menon", "Shetty", "Naidu", "Khan", "Fernandes", "Das", "Yadav", "Pandey", "Bhat", "Gill",
]

CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"]
CATEGORY_WEIGHTS = [40, 27, 15, 8, 10]

# Fictional institutions. index 0 is the college the demo admin/staff accounts belong to.
INSTITUTIONS = [
    dict(aicte_id="RX-1001", name="Ilampirai Institute of Technology", city="Chennai", state="Tamil Nadu",
         address="Old Mahabalipuram Road, Sholinganallur", type="Self-Financing", established_year=2001,
         affiliating_university="State Technical University", approval_status="Approved",
         slug="ilampirai", roll="IIT"),
    dict(aicte_id="RX-1002", name="Tamravarni College of Engineering", city="Tirunelveli", state="Tamil Nadu",
         address="Palayamkottai Road", type="Government Aided", established_year=1984,
         affiliating_university="State Technical University", approval_status="Approved",
         slug="tamravarni", roll="TCE"),
    dict(aicte_id="RX-1003", name="Navyagiri Institute of Engineering & Technology", city="Bengaluru", state="Karnataka",
         address="Hosur Road, Electronic City Phase 2", type="Private Autonomous", established_year=2008,
         affiliating_university="Autonomous (affiliated to State Technical University)", approval_status="Approved",
         slug="navyagiri", roll="NIET"),
    dict(aicte_id="RX-1004", name="Kesarvadi Institute of Technology", city="Pune", state="Maharashtra",
         address="Pune–Satara Road, Katraj", type="Self-Financing", established_year=2010,
         affiliating_university="State Technical University", approval_status="Approved",
         slug="kesarvadi", roll="KIT"),
    dict(aicte_id="RX-1005", name="Vellaranya College of Engineering", city="Kochi", state="Kerala",
         address="Seaport–Airport Road, Kakkanad", type="Self-Financing", established_year=2005,
         affiliating_university="State Technical University", approval_status="Approved",
         slug="vellaranya", roll="VCE"),
    dict(aicte_id="RX-1006", name="Sundarkhed Institute of Technology & Science", city="Hyderabad", state="Telangana",
         address="Outer Ring Road, Gandipet", type="Private Autonomous", established_year=1999,
         affiliating_university="Autonomous (affiliated to State Technical University)", approval_status="Approved",
         slug="sundarkhed", roll="SITS"),
    dict(aicte_id="RX-1007", name="Aranyaka Government Engineering College", city="Bhopal", state="Madhya Pradesh",
         address="Hoshangabad Road", type="Government", established_year=1972,
         affiliating_university="State Technical University", approval_status="Approved",
         slug="aranyaka", roll="AGEC"),
    dict(aicte_id="RX-1008", name="Meghavarna Institute of Technology", city="Jaipur", state="Rajasthan",
         address="Ajmer Road, Mahapura", type="Self-Financing", established_year=2012,
         affiliating_university="State Technical University", approval_status="Pending",
         slug="meghavarna", roll="MIT"),
]

BTECH = [
    ("CSE", "Computer Science & Engineering", 120),
    ("AIML", "Artificial Intelligence & Machine Learning", 60),
    ("ECE", "Electronics & Communication Engineering", 120),
    ("EEE", "Electrical & Electronics Engineering", 60),
    ("MECH", "Mechanical Engineering", 60),
    ("CIVIL", "Civil Engineering", 60),
]

# Extra programmes for some colleges: (code, name, degree, years, intake)
EXTRA_PROGRAMMES = {
    0: [("CSBS", "Computer Science & Business Systems", "B.Tech", 4, 60), ("MCA", "Master of Computer Applications", "MCA", 2, 60)],
    2: [("MBA", "Master of Business Administration", "MBA", 2, 120)],
    5: [("MBA", "Master of Business Administration", "MBA", 2, 60), ("MCA", "Master of Computer Applications", "MCA", 2, 60)],
}

# Programmes left empty so the sample upload files have somewhere to go
LEFT_FOR_UPLOAD = {(0, "CSBS"), (0, "MCA")}
# One programme deliberately above its reference so intake reconciliation has a case to show
OVER_INTAKE = {(2, "ECE"): 134}
# CSE at the main college keeps its hand-crafted edge cases (seeded separately)
HANDCRAFTED = {(0, "CSE")}

SHARED_APAARS = ["998877665544", "887766554433", "776655443322"]


def _seats(intake: int) -> tuple[int, int]:
    """Supernumerary (TFW) and NRI seats: about 5% each."""
    return max(1, round(intake * 0.05)), max(1, round(intake * 0.05))


def _unique_apaar(rng: random.Random, used: set[str]) -> str:
    while True:
        value = str(rng.randint(2_000_000_00000, 9_899_999_99999))
        if value not in used and value not in SHARED_APAARS:
            used.add(value)
            return value


def seed_database(db: Session):
    """Seed synthetic data for the prototype."""
    if db.query(User).filter(User.email == "admin@college.edu.in").first():
        print("[SEED] Database already seeded. Skipping.")
        return

    rng = random.Random(42)
    used_apaars: set[str] = set()

    print("[SEED] Seeding institutions...")
    institutions: list[Institution] = []
    for spec in INSTITUTIONS:
        inst = Institution(
            aicte_id=spec["aicte_id"],
            name=spec["name"],
            address=spec["address"],
            city=spec["city"],
            state=spec["state"],
            type=spec["type"],
            status="active",
            affiliating_university=spec["affiliating_university"],
            established_year=spec["established_year"],
            approval_status=spec["approval_status"],
            approval_reference=f"EoA/2025-26/{spec['aicte_id']}" if spec["approval_status"] == "Approved" else None,
            approval_valid_till="2025-26" if spec["approval_status"] == "Approved" else None,
            contact_email=f"principal@{spec['slug']}.edu.in",
        )
        institutions.append(inst)
    db.add_all(institutions)
    db.flush()

    print("[SEED] Seeding programmes and intake references...")
    programmes: dict[tuple[int, str], Programme] = {}
    for idx, inst in enumerate(institutions):
        plan = [(c, n, "B.Tech", 4, i) for c, n, i in BTECH] + EXTRA_PROGRAMMES.get(idx, [])
        for code, name, degree, years, intake in plan:
            supernumerary, nri = _seats(intake)
            p = Programme(
                institution_id=inst.id,
                code=code,
                name=name,
                degree_type=degree,
                duration_years=years,
                approved_intake=intake,
                academic_year="2025-26",
                supernumerary_seats=supernumerary,
                nri_seats=nri,
                status="active",
            )
            programmes[(idx, code)] = p
    db.add_all(programmes.values())
    db.flush()

    for (idx, code), p in programmes.items():
        inst = institutions[idx]
        db.add(IntakeReference(
            programme_id=p.id,
            academic_year=p.academic_year,
            approved_intake=p.approved_intake,
            supernumerary_quota=p.supernumerary_seats,
            nri_quota=p.nri_seats,
            source=(f"EoA 2025-26 submitted by institution ({inst.approval_reference})"
                    if inst.approval_reference else "Institution-submitted (EoA pending)"),
        ))

    print("[SEED] Seeding users...")
    inst1 = institutions[0]
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
        email="reviewer@reconx.in",
        password_hash=hash_password("reviewer123"),
        name="Oversight Reviewer",
        role="reviewer",
        status="active",
    )
    db.add_all([admin_user, staff_user, officer_user])
    db.flush()

    print("[SEED] Seeding students for every department...")
    all_flagged: list[tuple[Student, Submission, Institution]] = []

    # Students at college 2 who share APAAR IDs with records elsewhere (cross-institution duplicates)
    cse_inst2 = programmes[(1, "CSE")]

    for idx, inst in enumerate(institutions):
        spec = INSTITUTIONS[idx]
        for (p_idx, code), prog in programmes.items():
            if p_idx != idx or (idx, code) in LEFT_FOR_UPLOAD or (idx, code) in HANDCRAFTED:
                continue

            reference_total = prog.approved_intake + prog.supernumerary_seats + prog.nri_seats
            count = OVER_INTAKE.get((idx, code)) or int(prog.approved_intake * rng.uniform(0.82, 0.97))
            sub = Submission(
                institution_id=inst.id,
                uploaded_by=staff_user.id if idx == 0 else admin_user.id,
                file_name=f"{code}_2025-26_admissions.csv",
                academic_year="2025-26",
                programme_id=prog.id,
                total_records=count,
                valid_records=count,
                error_records=0,
                warning_records=0,
                status="submitted",
                submitted_at=datetime.utcnow() - timedelta(days=rng.randint(5, 40)),
                validated_at=datetime.utcnow() - timedelta(days=rng.randint(5, 40)),
            )
            db.add(sub)
            db.flush()

            # A couple of realistic data problems at some colleges
            flag_rows = {}
            if code == "ECE" and idx in (1, 3, 5):
                flag_rows[7] = "missing"
            if code == "MECH" and idx in (2, 4, 6):
                flag_rows[11] = "format"
            if idx == 1 and code == "CSE":
                for k, shared in enumerate(SHARED_APAARS):
                    flag_rows[k + 1] = ("shared", shared)

            batch = []
            for i in range(1, count + 1):
                gender = rng.choice(["Male", "Female"])
                fn, ln = rng.choice(MALE_NAMES if gender == "Male" else FEMALE_NAMES), rng.choice(LAST_NAMES)
                status, remarks = "valid", "All checks passed successfully."
                apaar = _unique_apaar(rng, used_apaars)
                flag = flag_rows.get(i)
                if flag == "missing":
                    apaar, status, remarks = None, "invalid", "APAAR ID is mandatory"
                elif flag == "format":
                    apaar, status, remarks = apaar[:10], "invalid", "Invalid APAAR format: must be 12 digits"
                elif isinstance(flag, tuple):
                    apaar = flag[1]

                st = Student(
                    institution_id=inst.id,
                    submission_id=sub.id,
                    apaar_id=apaar,
                    name=f"{fn} {ln}",
                    date_of_birth=date(rng.choice([2005, 2006, 2007]) if prog.degree_type == "B.Tech" else rng.choice([2002, 2003]),
                                       rng.randint(1, 12), rng.randint(1, 28)),
                    gender=gender,
                    programme_id=prog.id,
                    enrollment_date=date(2025, rng.choice([7, 8]), rng.randint(1, 28)),
                    enrollment_status="active",
                    category=rng.choices(CATEGORIES, CATEGORY_WEIGHTS)[0],
                    institute_roll_no=f"{spec['roll']}25{code}{i:03d}",
                    email=f"{fn.lower()}.{ln.lower()}{i}@student.{spec['slug']}.edu.in",
                    phone=f"9{rng.randint(100000000, 999999999)}",
                    row_number=i,
                    validation_status=status,
                    remarks=remarks,
                    is_latest=True,
                )
                batch.append(st)
            db.add_all(batch)
            db.flush()

            flagged = [s for s in batch if s.validation_status != "valid"]
            sub.valid_records = count - len(flagged)
            sub.error_records = len(flagged)
            for s in flagged:
                db.add(ValidationIssue(
                    submission_id=sub.id,
                    student_id=s.id,
                    rule_code="MISSING_REQUIRED" if not s.apaar_id else "FMT_APAAR",
                    severity="error",
                    field_name="apaar_id",
                    description=s.remarks,
                    row_number=s.row_number,
                    status="open",
                ))
                all_flagged.append((s, sub, inst))

            if count > reference_total:
                over = count - reference_total
                db.add(VerificationCase(
                    institution_id=inst.id,
                    submission_id=sub.id,
                    issue_type="intake_mismatch",
                    title=f"Potential intake discrepancy: {prog.name} ({count} enrolled vs {reference_total} reference)",
                    description=(f"Enrolled count is {over} above the intake reference (approved {prog.approved_intake} "
                                 f"+ supernumerary {prog.supernumerary_seats} + NRI {prog.nri_seats}). Review required."),
                    status="open",
                    priority="high",
                ))

    print("[SEED] Seeding the main college's CSE batch with review cases...")
    cse_prog_inst1 = programmes[(0, "CSE")]
    sub1 = Submission(
        institution_id=inst1.id,
        uploaded_by=staff_user.id,
        file_name="CSE_2025-26_admissions.csv",
        academic_year="2025-26",
        programme_id=cse_prog_inst1.id,
        total_records=115,
        valid_records=105,
        error_records=7,
        warning_records=3,
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=3),
        validated_at=datetime.utcnow() - timedelta(days=3),
    )
    db.add(sub1)
    db.flush()

    sub1_students = []
    for i in range(1, 116):
        gender = "Male" if i % 2 == 0 else "Female"
        fn, ln = rng.choice(MALE_NAMES if gender == "Male" else FEMALE_NAMES), rng.choice(LAST_NAMES)
        dob = date(2005 + (i % 3), 1 + (i % 12), 1 + (i % 28))
        apaar = None
        if i in (5, 12):
            apaar, status, remarks = "554433221100", "duplicate", "Duplicate APAAR ID within submission"
        elif i == 18:
            apaar, status = SHARED_APAARS[0], "duplicate"
            remarks = (f"Possible cross-institution duplicate — review required: same APAAR ID has an active "
                       f"record at {institutions[1].name}")
        elif i == 25:
            apaar, status, remarks = "1234567890", "invalid", "Invalid APAAR format: must be 12 digits"
        elif i == 33:
            status, remarks = "invalid", "APAAR ID is mandatory"
        elif i == 42:
            dob, status, remarks = date(2027, 1, 1), "invalid", "Date of birth cannot be in future"
        elif i in (50, 60, 70):
            dob, status, remarks = date(2013, 5, 1), "warning", "Candidate age is under 14 years"
        else:
            status, remarks = "valid", "All checks passed successfully."
        if apaar is None and i != 33:
            apaar = _unique_apaar(rng, used_apaars)

        sub1_students.append(Student(
            institution_id=inst1.id,
            submission_id=sub1.id,
            apaar_id=apaar,
            name=f"{fn} {ln}",
            date_of_birth=dob,
            gender=gender,
            programme_id=cse_prog_inst1.id,
            enrollment_date=date(2025, 7, 20),
            enrollment_status="active",
            category=rng.choices(CATEGORIES, CATEGORY_WEIGHTS)[0],
            institute_roll_no=f"IIT25CSE{i:03d}",
            email=f"{fn.lower()}.{ln.lower()}{i}@student.ilampirai.edu.in",
            phone=f"9{rng.randint(100000000, 999999999)}",
            row_number=i,
            validation_status=status,
            remarks=remarks,
            is_latest=True,
        ))
    db.add_all(sub1_students)
    db.flush()

    for st in sub1_students:
        if st.validation_status in ("invalid", "duplicate", "warning"):
            if not st.apaar_id:
                rule = "MISSING_REQUIRED"
            elif len(st.apaar_id) != 12:
                rule = "FMT_APAAR"
            elif st.apaar_id == SHARED_APAARS[0]:
                rule = "DUP_APAAR_CROSS"
            elif st.validation_status == "duplicate":
                rule = "DUP_APAAR_SAME"
            else:
                rule = "DOB_CHECK"
            db.add(ValidationIssue(
                submission_id=sub1.id,
                student_id=st.id,
                rule_code=rule,
                severity="warning" if st.validation_status == "warning" else "error",
                field_name="apaar_id" if "APAAR" in rule or rule == "MISSING_REQUIRED" else "date_of_birth",
                description=st.remarks or "Validation issue flagged",
                row_number=st.row_number,
                status="open",
            ))

    print("[SEED] Seeding verification cases...")
    case_students = [(s, sub1, inst1) for s in sub1_students if s.validation_status in ("invalid", "duplicate")]
    case_students += all_flagged
    # A realistic review history: college staff decide cases, the reviewer escalates one
    plan = {
        0: ("resolved", "Admission form and APAAR card checked; the duplicate row was a re-upload of the same student. Duplicate row removed."),
        1: ("under_review", None),
        2: ("rejected", "Data entry error"),
        3: ("escalated", None),
        4: ("pending", None),
    }
    for idx, (st, sub, inst) in enumerate(case_students):
        case_status, reason = plan.get(idx, ("open", None))
        issue_type = "duplicate_enrollment" if st.validation_status == "duplicate" else "invalid_data"
        decided = case_status in ("resolved", "rejected")
        vc = VerificationCase(
            student_id=st.id,
            submission_id=sub.id,
            institution_id=inst.id,
            issue_type=issue_type,
            title=f"Verification for {st.name} ({mask_apaar(st.apaar_id) if st.apaar_id else 'No APAAR'})",
            description=st.remarks,
            status=case_status,
            assigned_to=staff_user.id if case_status != "open" and inst.id == inst1.id else None,
            priority="high" if issue_type == "duplicate_enrollment" or case_status == "escalated" else "medium",
            resolution_reason=reason,
            resolved_by=staff_user.id if decided else None,
            resolved_at=datetime.utcnow() - timedelta(hours=5 + idx) if decided else None,
        )
        db.add(vc)
        db.flush()
        db.add(CaseEvent(case_id=vc.id, actor_id=staff_user.id, event_type="created",
                         description="Case automatically opened after the upload checks."))
        if case_status != "open":
            db.add(CaseEvent(case_id=vc.id, actor_id=admin_user.id, event_type="assigned",
                             description=f"Assigned to {staff_user.name} for review."))
        if decided:
            db.add(CaseEvent(case_id=vc.id, actor_id=staff_user.id, event_type=case_status,
                             description=("Resolved with reason: " if case_status == "resolved" else "Rejected: ") + reason))
        if case_status == "pending":
            db.add(CaseEvent(case_id=vc.id, actor_id=staff_user.id, event_type="clarification_requested",
                             description="Clarification requested: Waiting for the student's APAAR card copy from the admissions office."))
        if case_status == "escalated":
            db.add(CaseEvent(case_id=vc.id, actor_id=officer_user.id, event_type="escalated",
                             description="Escalated: Same APAAR ID active at two institutions; needs confirmation from both admissions offices before any correction."))

    print("[SEED] Seeding external integrations...")
    db.add_all([
        IntegrationConfig(institution_id=inst1.id, service_name="apaar", display_name="APAAR Verification", status="active", is_mock=True),
        IntegrationConfig(institution_id=inst1.id, service_name="digilocker", display_name="DigiLocker / NAD", status="active", is_mock=True),
        IntegrationConfig(institution_id=inst1.id, service_name="aicte", display_name="AICTE Approval Data", status="active", is_mock=True),
        IntegrationConfig(institution_id=inst1.id, service_name="aishe", display_name="AISHE Data", status="active", is_mock=True),
    ])

    print("[SEED] Seeding audit logs...")
    for action, desc in [
        ("login", "User admin@college.edu.in logged into portal."),
        ("upload", "File CSE_2025-26_admissions.csv uploaded successfully."),
        ("map_columns", "Column mapping auto-configured and approved."),
        ("validate", "Validation engine completed: 115 records processed."),
        ("case_assigned", "Verification case assigned to Priya Natarajan."),
        ("case_resolved", "Case resolved after document review."),
    ]:
        db.add(AuditLog(action=action, actor_id=admin_user.id, actor_email=admin_user.email, description=desc))

    db.commit()
    print("[SEED] Synthetic database seeding completed successfully!")
