"""Generate the APAAR ReconX demo dataset (fully fictional) and its documentation.

Usage (from the backend folder):
    .venv/Scripts/python scripts/generate_demo_dataset.py

Writes:
    ../demo-data/                         all dataset files + README_SYNTHETIC_DATA.md
    ../frontend/public/samples/           the upload files offered on the Bulk Import page
    app/seed/reference_records.csv        sandbox reference records loaded by the seed

Conventions (documented in the README):
    * Every person, institution, email and phone number is invented.
    * APAAR-format values are synthetic test values starting with "11" (the seed never uses that range).
      They have not been issued or verified by the APAAR system.
    * Emails use the reserved .example domain; phone numbers start with 0 so they cannot be real mobiles.
"""

import csv
import os
import random
import shutil
import sys
import tempfile
from datetime import date
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
OUT = ROOT / "demo-data"
SAMPLES = ROOT / "frontend" / "public" / "samples"
REFERENCE_SEED = BACKEND / "app" / "seed" / "reference_records.csv"

HEADER = ["student_name", "apaar_id", "dob", "gender", "programme", "admission_date",
          "status", "category", "roll_no", "email", "phone"]

MALE = ["Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Ishaan", "Dhruv", "Kabir", "Rohan", "Karthik", "Varun",
        "Naveen", "Farhan", "Joseph", "Gurpreet", "Tenzin", "Pranav", "Siddharth", "Nikhil", "Manoj"]
FEMALE = ["Ananya", "Diya", "Saanvi", "Myra", "Riya", "Tanvi", "Kavya", "Meera", "Harini", "Lakshmi",
          "Ayesha", "Maria", "Simran", "Nisha", "Pooja", "Divya", "Shreya", "Aishwarya", "Fathima", "Nandini"]
LAST = ["Sharma", "Patel", "Reddy", "Nair", "Iyer", "Rao", "Kumar", "Singh", "Joshi", "Menon", "Pillai",
        "Shetty", "Naidu", "Khan", "Fernandes", "Das", "Bhat", "Gill", "Krishnan", "Subramanian", "Varghese", "Chandran"]
CATEGORIES, WEIGHTS = ["General", "OBC", "SC", "ST", "EWS"], [40, 27, 15, 8, 10]

VIHAAN_CORRECTION = "110200000004"  # documented test value for the Vihaan Sharma correction


def seeded_context():
    """Seed a scratch database exactly like the app, to read enrolment counts and existing names."""
    tmp = tempfile.mkdtemp(prefix="reconx-dataset-")
    os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(tmp, "scratch.db")).replace("\\", "/")
    sys.path.insert(0, str(BACKEND))
    from app.database import Base, engine, SessionLocal
    import app.models  # noqa: F401
    from app.seed.seed_data import seed_database
    from app.models.institution import Institution, Programme
    from app.models.student import Student

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    insts = {i.aicte_id: i for i in db.query(Institution).all()}
    main = insts["RX-1001"]
    mech = db.query(Programme).filter(Programme.institution_id == main.id, Programme.code == "MECH").first()
    mech_enrolled = db.query(Student).filter(Student.programme_id == mech.id, Student.is_latest.is_(True),
                                             Student.enrollment_status == "active").count()
    mech_reference = mech.approved_intake + mech.supernumerary_seats + mech.nri_seats
    people = {(s.name.lower(), s.date_of_birth) for s in db.query(Student).all()}
    rolls = {(s.institution_id, (s.institute_roll_no or "").upper()) for s in db.query(Student).all()}
    from app.seed.seed_data import INSTITUTIONS
    db.close()
    engine.dispose()
    shutil.rmtree(tmp, ignore_errors=True)
    return {"mech_enrolled": mech_enrolled, "mech_reference": mech_reference, "people": people,
            "institutions": INSTITUTIONS, "rolls": rolls}


class Gen:
    def __init__(self, ctx):
        self.rng = random.Random(20261028)
        self.ctx = ctx
        self.used_people = set(ctx["people"])
        self.seq = {}

    def apaar(self, file_code: int) -> str:
        n = self.seq.get(file_code, 0) + 1
        self.seq[file_code] = n
        return f"11{file_code:02d}{n:08d}"

    def person(self, years):
        while True:
            gender = self.rng.choice(["Male", "Female"])
            name = f"{self.rng.choice(MALE if gender == 'Male' else FEMALE)} {self.rng.choice(LAST)}"
            dob = date(self.rng.choice(years), self.rng.randint(1, 12), self.rng.randint(1, 28))
            if (name.lower(), dob) not in self.used_people:
                self.used_people.add((name.lower(), dob))
                return name, dob, gender

    def row(self, file_code, programme, roll, years, slug="ilampirai", **overrides):
        name, dob, gender = self.person(years)
        first, last = name.lower().split(" ", 1)
        r = {
            "student_name": name,
            "apaar_id": self.apaar(file_code),
            "dob": dob.strftime("%d/%m/%Y"),
            "gender": gender,
            "programme": programme,
            "admission_date": date(2025, 8, self.rng.randint(1, 20)).strftime("%d/%m/%Y"),
            "status": "active",
            "category": self.rng.choices(CATEGORIES, WEIGHTS)[0],
            "roll_no": roll,
            "email": f"{first}.{last.replace(' ', '')}.{roll.lower()}@student.{slug}.example",
            "phone": f"0{self.rng.randint(100000000, 999999999)}",
        }
        r.update(overrides)
        return r


def write_csv(path: Path, rows, header=HEADER):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


def main():
    ctx = seeded_context()
    g = Gen(ctx)
    files, scenarios, cases = {}, [], []

    def scenario(sid, title, file, rows, expected, demo):
        scenarios.append({"scenario_id": sid, "title": title, "file": file, "rows": rows,
                          "expected_result": expected, "how_to_demonstrate": demo})

    def expect_case(file, row_no, roll, name, rule, case_type, path):
        cases.append({"file": file, "row": row_no, "roll_no": roll, "student_name": name, "rule_code": rule,
                      "case_type": case_type, "expected_status_after_import": "open", "suggested_demo_path": path})

    # 1. Clean batch: Information Technology, 60 rows
    valid = [g.row(1, "IT", f"IIT25IT{i:03d}", [2006, 2007]) for i in range(1, 61)]
    files["students_valid.csv"] = ("IT", valid)
    scenario("S1", "Successful import", "students_valid.csv", "1-60",
             "60 added, 0 skipped, 0 flagged, 0 cases", "Bulk Import → choose the file → Proceed to Column Mapping → Save Mapping & Run Validation → Confirm & Submit for Review → Student Records")

    # 2. Missing APAAR IDs: MCA, 40 rows, canonical Vihaan Sharma at row 4
    mca = [g.row(2, "MCA", f"IIT25MCA{i:03d}", [2002, 2003]) for i in range(1, 41)]
    mca[3].update({"student_name": "Vihaan Sharma", "apaar_id": "", "dob": "14/02/2003", "gender": "Male",
                   "category": "General", "email": "vihaan.sharma.iit25mca004@student.ilampirai.example"})
    g.used_people.add(("vihaan sharma", date(2003, 2, 14)))
    for idx in (10, 18, 26, 34):
        mca[idx]["apaar_id"] = ""
    files["students_missing_apaar.csv"] = ("MCA", mca)
    for idx in (3, 10, 18, 26, 34):
        expect_case("students_missing_apaar.csv", idx + 1, mca[idx]["roll_no"], mca[idx]["student_name"],
                    "MISSING_REQUIRED", "invalid_data",
                    "Awaiting evidence → evidence added → Submit Correction → Resolve" if idx == 3 else "Correct, then resolve")
    scenario("S2", "Missing APAAR ID (Vihaan Sharma, IIT25MCA004)", "students_missing_apaar.csv", "4 (+11,19,27,35)",
             f"5 rows flagged MISSING_REQUIRED, 5 cases. Correct Vihaan with test value {VIHAAN_CORRECTION}; case can then be resolved",
             "Reviewer: Cases → Review case → Mark awaiting evidence. Staff: post a note with Add as evidence ticked → View Profile → Submit Correction → back to the case → Resolve")

    # 3. Invalid data: AI & Data Science, 30 rows with deliberate problems in rows 1-12
    aids = [g.row(3, "AIDS", f"IIT25AIDS{i:03d}", [2006, 2007]) for i in range(1, 31)]
    problems = [
        (0, {"student_name": ""}, "MISSING_REQUIRED", "Name missing"),
        (1, {"dob": ""}, "MISSING_REQUIRED", "Date of birth missing"),
        (2, {"apaar_id": "11AB00000003"}, "FMT_APAAR", "APAAR value contains letters"),
        (3, {"apaar_id": "11030000004"}, "FMT_APAAR", "APAAR value has 11 digits"),
        (4, {"apaar_id": "1103000000050"}, "FMT_APAAR", "APAAR value has 13 digits"),
        (5, {"dob": "11/09/2030"}, "FMT_DOB", "Date of birth in the future"),
        (6, {"dob": "05/05/2014"}, "FMT_DOB", "Age below the configured minimum"),
        (7, {"dob": "20/06/2006", "admission_date": "01/01/2005"}, "DATE_INCONSIST", "Admission before date of birth"),
        (8, {"gender": "M"}, "FMT_GENDER", "Gender written as 'M' (warning)"),
        (9, {"email": "kavya.at.student.ilampirai"}, "FMT_EMAIL", "Malformed email (warning)"),
        (10, {"apaar_id": "", "gender": "F", "email": "no-at-sign"}, "MISSING_REQUIRED", "Several problems at once"),
        (11, {"dob": "31/02/2006"}, "MISSING_REQUIRED", "Impossible date 31/02 cannot be read"),
    ]
    for idx, change, rule, note in problems:
        aids[idx].update(change)
        if rule in ("MISSING_REQUIRED", "FMT_APAAR", "FMT_DOB", "DATE_INCONSIST"):
            expect_case("students_invalid.csv", idx + 1, aids[idx]["roll_no"], aids[idx]["student_name"] or "(blank)",
                        rule, "invalid_data", "Correct the record, then resolve")
    files["students_invalid.csv"] = ("AIDS", aids)
    scenario("S3", "Validation errors", "students_invalid.csv", "1-12",
             "10 rows with errors (cases opened), 2 rows with warnings only (gender, email), 18 clean",
             "Bulk Import → choose the file → Proceed to Column Mapping → Save Mapping & Run Validation → filter Errors Only / Warnings")

    # 4. Duplicates: CSBS, 34 rows
    csbs = [g.row(4, "CSBS", f"IIT25CSBS{i:03d}", [2006, 2007]) for i in range(1, 35)]
    csbs[5] = dict(csbs[4])                                    # rows 5-6 exact duplicate row
    csbs[10].update({"roll_no": csbs[9]["roll_no"]})           # rows 10-11 same roll, different student
    csbs[15].update({"student_name": "Aditya Kumar", "dob": "03/03/2006", "gender": "Male"})
    csbs[16].update({"student_name": "Aditya Kumaar", "dob": "17/11/2006", "gender": "Male"})  # similar name, different person
    csbs[20].update({"student_name": "Harini Krishnan", "dob": "09/09/2006", "gender": "Female"})
    csbs[21].update({"student_name": "Harini Krishnan", "dob": "09/09/2006", "gender": "Female"})  # same name + DOB, different roll and APAAR
    csbs[25].update({"apaar_id": "776655443322"})              # already active at Tamravarni College of Engineering
    csbs[29].update({"apaar_id": csbs[28]["apaar_id"]})        # rows 29-30 share one APAAR value
    files["students_duplicates.csv"] = ("CSBS", csbs)
    for idx, rule, path in [(9, "DUP_ROLL", "Compare both rows → correct the roll number of the wrong one → resolve"),
                            (10, "DUP_ROLL", "Same case pair as row 10"),
                            (21, "POSSIBLE_DUP_PERSON", "Check parents' names on forms → Dismiss: different students"),
                            (25, "DUP_APAAR_CROSS", "Reviewer escalates → admin decides"),
                            (28, "DUP_APAAR_SAME", "Correct the mistyped APAAR value → resolve"),
                            (29, "DUP_APAAR_SAME", "Same case pair as row 29")]:
        expect_case("students_duplicates.csv", idx + 1, csbs[idx]["roll_no"], csbs[idx]["student_name"], rule,
                    "duplicate_enrollment", path)
    scenario("S4", "Duplicate detection", "students_duplicates.csv", "5-6, 10-11, 16-17, 21-22, 26, 29-30",
             "Row 6 skipped (exact repeat); rows 10-11 DUP_ROLL; 16-17 NOT flagged (similar names, different DOB); "
             "row 22 POSSIBLE_DUP_PERSON; row 26 DUP_APAAR_CROSS; rows 29-30 DUP_APAAR_SAME. Nothing merged or deleted.",
             "Bulk Import → choose the file → Proceed to Column Mapping → Save Mapping & Run Validation → Confirm & Submit for Review → Duplicate Review")

    # 5. Reconciliation: M.Tech CSE, 16 rows against sandbox reference records
    mtcs = [g.row(5, "MTCS", f"IIT25MTCS{i:03d}", [2000, 2001]) for i in range(1, 17)]
    references = []
    for i, r in enumerate(mtcs):
        dd, mm, yy = map(int, r["dob"].split("/"))
        references.append({"apaar_id": r["apaar_id"], "name": r["student_name"], "date_of_birth": date(yy, mm, dd).isoformat(),
                           "gender": r["gender"], "source": "Sandbox reference dataset (fictional)"})
    # Make 4 deliberate differences between the institution file and the reference
    references[2]["name"] = mtcs[2]["student_name"].split(" ")[0] + " Raghavan"          # surname differs
    references[5]["date_of_birth"] = "2000-12-31"                                        # date of birth differs
    references[8]["gender"] = "Male" if mtcs[8]["gender"] == "Female" else "Female"     # gender differs
    references[11]["name"] = mtcs[11]["student_name"] + " Kumar"                         # name and DOB differ
    references[11]["date_of_birth"] = "2001-01-01"
    for idx in (2, 5, 8, 11):
        expect_case("students_reconciliation.csv", idx + 1, mtcs[idx]["roll_no"], mtcs[idx]["student_name"],
                    "REF_MISMATCH", "reference_mismatch", "Compare fields → correct the record or resolve with evidence")
    files["students_reconciliation.csv"] = ("MTCS", mtcs)
    # Vihaan's documented correction value also has a matching reference record
    references.append({"apaar_id": VIHAAN_CORRECTION, "name": "Vihaan Sharma", "date_of_birth": "2003-02-14",
                       "gender": "Male", "source": "Sandbox reference dataset (fictional)"})
    scenario("S5", "Reconciliation mismatch", "students_reconciliation.csv", "3, 6, 9, 12",
             "4 rows flagged REF_MISMATCH (warning) with reference_mismatch cases; 12 rows match their reference",
             "Cases → filter Reference Mismatch → open a case to see the field-by-field comparison")

    # 6. Intake overflow: Mechanical late admissions, exactly 3 over the reference
    overflow = ctx["mech_reference"] - ctx["mech_enrolled"] + 3
    mech = [g.row(6, "MECH", f"IIT25MECHL{i:03d}", [2006, 2007]) for i in range(1, overflow + 1)]
    files["students_intake_overflow.csv"] = ("MECH", mech)
    for idx in range(overflow - 3, overflow):
        expect_case("students_intake_overflow.csv", idx + 1, mech[idx]["roll_no"], mech[idx]["student_name"],
                    "INTAKE_EXCEED", "intake_mismatch", "Review intake; dismiss with approval letter or withdraw admission")
    scenario("S6", "Intake discrepancy", "students_intake_overflow.csv", f"{overflow - 2}-{overflow}",
             f"Mechanical has {ctx['mech_enrolled']} enrolled of {ctx['mech_reference']}; this file adds {overflow}: "
             "the last 3 rows are flagged INTAKE_EXCEED", "Bulk Import → choose the file → Proceed to Column Mapping → Save Mapping & Run Validation → Confirm & Submit for Review → Reports (intake reconciliation)")

    # 7. Second college (isolation): Tamravarni MCA, uploaded by staff.tce@college.edu.in
    tce = [g.row(7, "MCA", f"TCE25MCA{i:03d}", [2002, 2003], slug="tamravarni") for i in range(1, 51)]
    tce[6]["apaar_id"] = ""
    tce[17]["gender"] = "f"
    files["students_other_institution.csv"] = ("MCA (Tamravarni College of Engineering)", tce)
    expect_case("students_other_institution.csv", 7, tce[6]["roll_no"], tce[6]["student_name"], "MISSING_REQUIRED",
                "invalid_data", "Visible only to Tamravarni users and the oversight reviewer")
    scenario("S7", "Institution isolation", "students_other_institution.csv", "1-50",
             "Imported by staff.tce@college.edu.in; 50 added. Ilampirai staff cannot see these records; the reviewer can",
             "Sign in as staff.tce@college.edu.in → Bulk Import (Tamravarni College MCA admissions); then sign in as College Staff and search TCE25MCA in Student Records")

    # ---------------------------------------------------------------- write everything
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for name, (_, rows) in files.items():
        write_csv(OUT / name, rows)
    import pandas as pd
    pd.DataFrame(files["students_invalid.csv"][1], columns=HEADER).to_excel(OUT / "students_invalid.xlsx", index=False)
    write_csv(OUT / "reference_records.csv", references, ["apaar_id", "name", "date_of_birth", "gender", "source"])
    write_csv(REFERENCE_SEED, references, ["apaar_id", "name", "date_of_birth", "gender", "source"])
    write_csv(OUT / "demo_scenarios.csv", scenarios, ["scenario_id", "title", "file", "rows", "expected_result", "how_to_demonstrate"])
    write_csv(OUT / "review_cases.csv", cases, ["file", "row", "roll_no", "student_name", "rule_code", "case_type",
                                                 "expected_status_after_import", "suggested_demo_path"])
    institutions = [{"code": i["aicte_id"], "name": i["name"], "city": i["city"], "state": i["state"], "type": i["type"],
                     "established": i["established_year"], "approval_status": i["approval_status"],
                     "note": "Fictional institution"} for i in ctx["institutions"]]
    write_csv(OUT / "institutions.csv", institutions, list(institutions[0]))
    users = [
        {"role": "Institution Admin", "email": "admin@college.edu.in", "password": "admin123", "institution": "Ilampirai Institute of Technology"},
        {"role": "College Staff", "email": "staff@college.edu.in", "password": "staff123", "institution": "Ilampirai Institute of Technology"},
        {"role": "College Staff", "email": "staff.tce@college.edu.in", "password": "staff123", "institution": "Tamravarni College of Engineering"},
        {"role": "Oversight Reviewer", "email": "reviewer@reconx.in", "password": "reviewer123", "institution": "All institutions"},
    ]
    write_csv(OUT / "demo_users.csv", users, ["role", "email", "password", "institution"])
    (OUT / "README_SYNTHETIC_DATA.md").write_text(readme(files, ctx, overflow), encoding="utf-8")

    # Upload files offered on the Bulk Import page
    if SAMPLES.exists():
        for f in SAMPLES.iterdir():
            f.unlink()
    SAMPLES.mkdir(parents=True, exist_ok=True)
    for name in files:
        shutil.copy(OUT / name, SAMPLES / name)
    shutil.copy(OUT / "students_invalid.xlsx", SAMPLES / "students_invalid.xlsx")
    write_csv(SAMPLES / "ReconX_Student_Template.csv", [valid[0]])

    total = sum(len(rows) for _, rows in files.values())
    print(f"Wrote {len(files)} upload files ({total} rows), {len(references)} reference records, "
          f"{len(cases)} expected cases to {OUT}")


def readme(files, ctx, overflow) -> str:
    rows = "\n".join(f"| `{n}` | {p} | {len(r)} |" for n, (p, r) in files.items())
    return f"""# APAAR ReconX — Synthetic Demo Dataset

**Every record in this folder is fictional.** It was generated by `backend/scripts/generate_demo_dataset.py`
for the APAAR ReconX SIH26263 prototype and is safe to share.

## Conventions

| Item | Convention |
|---|---|
| People | Invented names; any resemblance to real people is coincidental |
| Institutions | Fictional names with `RX-` codes (not AICTE permanent IDs); see `institutions.csv` |
| APAAR-format values | 12-digit **synthetic test values starting with `11`**. Not issued, held or verified by the APAAR system. The app only checks their format. |
| Emails | Reserved `.example` domain (cannot be real addresses) |
| Phone numbers | Start with `0` (cannot be real Indian mobile numbers) |
| Dates | `DD/MM/YYYY` in upload files, read day-first |
| Encoding | UTF-8, comma-delimited, header row; identifiers are text |

## Upload files (sign in as College Staff, `staff@college.edu.in`)

Each file is for one programme, named in its `programme` column: upload it in **Bulk Import**, then **Save Mapping & Run Validation** and
**Confirm & Submit for Review**. Files can be imported in any order, but `students_intake_overflow.csv` is sized
for the fresh seed (Mechanical has {ctx['mech_enrolled']} of {ctx['mech_reference']} seats filled, so its
{overflow} rows exceed the reference by exactly 3).

| File | Programme | Rows |
|---|---|---|
{rows}

`students_invalid.xlsx` is the same as `students_invalid.csv`, to show Excel import.

## Deliberate problems (expected outcomes)

See `demo_scenarios.csv` (one line per scenario) and `review_cases.csv` (every case the import should open).
Highlights:

* **Vihaan Sharma, roll `IIT25MCA004`** (`students_missing_apaar.csv`, row 4): APAAR ID missing →
  `MISSING_REQUIRED` → review case. For the correction demo use the documented test value
  **`{VIHAAN_CORRECTION}`** (a sandbox reference record exists for it). It is the only active record with this
  roll number; importing the file again skips the row instead of creating a second record.
* **Duplicates** (`students_duplicates.csv`): exact repeated row (skipped), same roll number with different
  details (`DUP_ROLL`), similar names with different dates of birth (not flagged), same name and date of birth
  with different roll numbers (`POSSIBLE_DUP_PERSON`), an APAAR value already active at another college
  (`DUP_APAAR_CROSS`), and one APAAR value on two rows (`DUP_APAAR_SAME`).
* **Reconciliation** (`students_reconciliation.csv` + `reference_records.csv`): 4 rows differ from their sandbox
  reference record in name, date of birth and/or gender (`REF_MISMATCH`).
* **Invalid data** (`students_invalid.csv`): rows 1-12 each carry one or more deliberate errors; rows 13-30 are clean.
* **Isolation** (`students_other_institution.csv`): for Tamravarni College of Engineering; import it as
  `staff.tce@college.edu.in`. Ilampirai users never see these records.

## Reference records

`reference_records.csv` is a **sandbox reference dataset** used to demonstrate reconciliation. It is fictional
and is **not** an official AICTE, APAAR or DigiLocker database. The app loads the same file from
`backend/app/seed/reference_records.csv` when it seeds a fresh database.

## Accounts (isolated demo environment only)

`demo_users.csv` lists the seeded accounts. They exist only in the demo database; never reuse these passwords.

## Regenerating

    cd backend
    .venv/Scripts/python scripts/generate_demo_dataset.py

Output is deterministic (fixed random seed), so regenerating produces the same files.
"""


if __name__ == "__main__":
    main()
