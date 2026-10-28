"""Generate sample admission files for the Bulk Import screen.

Usage (from the backend folder):
    .venv/Scripts/python scripts/generate_sample_uploads.py ../frontend/public/samples

The files target Ilampirai Institute of Technology (the college of the
admin@college.edu.in / staff@college.edu.in accounts). All people and IDs are
fictional. APAAR values start with 1, a range the seed data never uses, so
the only duplicates are the ones planted on purpose.
"""

import csv
import random
import sys
from datetime import date
from pathlib import Path

import pandas as pd

HEADER = ["student_name", "apaar_id", "dob", "gender", "programme", "admission_date",
          "status", "category", "roll_no", "email", "phone"]

MALE = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharva', 'Dhruv', 'Kabir', 'Rohan', 'Rahul', 'Rohit', 'Karan', 'Vikram', 'Suresh', 'Naveen', 'Farhan', 'Imran', 'Joseph', 'Anil', 'Gurpreet', 'Tenzin', 'Karthik', 'Varun']
FEMALE = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Pari', 'Myra', 'Ira', 'Riya', 'Ahana', 'Prisha', 'Tanvi', 'Kavya', 'Sneha', 'Pooja', 'Meera', 'Divya', 'Swati', 'Harini', 'Lakshmi', 'Ayesha', 'Zoya', 'Maria', 'Simran', 'Nisha']
LAST = ["Sharma", "Patel", "Reddy", "Nair", "Iyer", "Rao", "Kumar", "Singh", "Joshi", "Menon",
        "Pillai", "Shetty", "Naidu", "Khan", "Fernandes", "Das", "Bhat", "Gill", "Krishnan", "Subramanian"]
CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"]
WEIGHTS = [40, 27, 15, 8, 10]

# Matches an active record seeded at Tamravarni College of Engineering (cross-institution duplicate)
CROSS_INSTITUTION_APAAR = "887766554433"


def make_rows(rng, code, n, roll_prefix, dob_years, start=1):
    rows = []
    for i in range(start, start + n):
        gender = rng.choice(["Male", "Female"])
        fn, ln = rng.choice(MALE if gender == "Male" else FEMALE), rng.choice(LAST)
        rows.append({
            "student_name": f"{fn} {ln}",
            "apaar_id": str(rng.randint(100_000_000_000, 199_999_999_999)),
            "dob": date(rng.choice(dob_years), rng.randint(1, 12), rng.randint(1, 28)).strftime("%d/%m/%Y"),
            "gender": gender,
            "programme": code,
            "admission_date": date(2025, 8, rng.randint(1, 20)).strftime("%d/%m/%Y"),
            "status": "active",
            "category": rng.choices(CATEGORIES, WEIGHTS)[0],
            "roll_no": f"{roll_prefix}{i:03d}",
            "email": f"{fn.lower()}.{ln.lower()}{i}@student.ilampirai.edu.in",
            "phone": f"9{rng.randint(100000000, 999999999)}",
        })
    return rows


def write_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADER)
        w.writeheader()
        w.writerows(rows)


def main(out_dir: str):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(2026)

    # 1. Clean file: every row should pass
    csbs = make_rows(rng, "CSBS", 57, "IIT25CSBS", [2006, 2007])
    write_csv(out / "CSBS_2025-26_admissions.csv", csbs)

    # 2. File with realistic data problems for the Validation Centre and Duplicate Review
    mca = make_rows(rng, "MCA", 60, "IIT25MCA", [2002, 2003])
    mca[3]["apaar_id"] = ""                                  # row 4: missing APAAR ID
    mca[8]["apaar_id"] = mca[8]["apaar_id"][:11]             # row 9: 11 digits
    mca[15]["apaar_id"] = mca[14]["apaar_id"]                # rows 15-16: same APAAR twice in the file
    mca[21]["apaar_id"] = CROSS_INSTITUTION_APAAR            # row 22: already enrolled at another college
    mca[29]["dob"] = "14/03/2027"                            # row 30: date of birth in the future
    mca[36]["gender"] = "M"                                  # row 37: unrecognised gender value
    mca[43]["email"] = "harini.krishnan44.student.ilampirai" # row 44: malformed email
    write_csv(out / "MCA_2025-26_admissions.csv", mca)
    pd.DataFrame(mca, columns=HEADER).to_excel(out / "MCA_2025-26_admissions.xlsx", index=False)

    # 3. Late admissions that take Mechanical above its intake reference
    mech = make_rows(rng, "MECH", 12, "IIT25MECHL", [2006, 2007])
    write_csv(out / "MECH_2025-26_late_admissions.csv", mech)

    # 4. Blank template with one example row
    write_csv(out / "ReconX_Student_Template.csv", make_rows(random.Random(1), "CSE", 1, "ROLL", [2006]))

    print(f"Wrote sample files to {out.resolve()}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "../frontend/public/samples")
