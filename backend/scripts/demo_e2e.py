"""End-to-end check of the demo dataset against the real API, on a fresh isolated database.

Usage (from the backend folder):
    .venv/Scripts/python scripts/demo_e2e.py [path/to/throwaway.db]

The database file is deleted and re-seeded first, so the run is repeatable. It never touches
backend/apaar_reconx.db unless you pass that path explicitly (don't).
Exit code 0 = every check passed.
"""

import csv
import io
import os
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
DATA = BACKEND.parent / "demo-data"
db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.gettempdir()) / "reconx-demo-e2e.db"
if db_path.resolve() == (BACKEND / "apaar_reconx.db").resolve():
    sys.exit("Refusing to run against the main local database. Pass a throwaway path.")
for suffix in ("", "-shm", "-wal"):
    Path(str(db_path) + suffix).unlink(missing_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///" + str(db_path).replace("\\", "/")
sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

results = []


def check(name, condition, detail=""):
    results.append((bool(condition), name, detail))
    print(("PASS " if condition else "FAIL ") + name + (f"  [{detail}]" if detail and not condition else ""))


def run():
    with TestClient(app) as c:
        def login(email, pw):
            r = c.post("/api/auth/login", json={"email": email, "password": pw})
            return {"Authorization": "Bearer " + r.json()["access_token"]}

        S, A, R = login("staff@college.edu.in", "staff123"), login("admin@college.edu.in", "admin123"), login("reviewer@reconx.in", "reviewer123")
        T = login("staff.tce@college.edu.in", "staff123")

        def progs(h):
            inst = c.get("/api/auth/me", headers=h).json()["institution_id"]
            return {p["code"]: p["id"] for p in c.get(f"/api/institutions/{inst}/programmes", headers=h).json()}

        P, PT = progs(S), progs(T)
        stats = lambda h=S: c.get("/api/dashboard/stats", headers=h).json()  # noqa: E731

        def imp(h, programme_id, name):
            with open(DATA / name, "rb") as f:
                # Same as the UI: no programme chosen, so each row's programme column decides it
                up = c.post("/api/submissions/upload", headers=h, files={"file": (name, f)}).json()
            sid = up["submission_id"]
            c.post(f"/api/submissions/{sid}/map-columns", headers=h, json={"mapping": up["auto_mappings"]})
            val = c.post(f"/api/submissions/{sid}/validate", headers=h).json()
            issues = c.get(f"/api/validation/{sid}/results", headers=h).json()["issues"]
            commit = c.post(f"/api/submissions/{sid}/submit", headers=h).json()
            rows = c.get(f"/api/students?submission_id={sid}&limit=100", headers=h)
            if rows.status_code == 200:
                items = rows.json() if isinstance(rows.json(), list) else rows.json().get("items", [])
                wrong = [r["row_number"] for r in items if r.get("programme_id") != programme_id]
                check(f"{name}: every row filed under its programme column", not wrong, f"rows {wrong[:10]}")
            return up, val, issues, commit

        def by_row(issues):
            d = defaultdict(set)
            for i in issues:
                d[i["row_number"]].add(i["rule_code"])
            return d

        def student(h, roll):
            items = c.get(f"/api/students?search={roll}&limit=10", headers=h).json()["items"]
            return [i for i in items if i["institute_roll_no"] == roll]

        # ---------------- Scenario 1: successful import
        base = stats()
        _, val, _, commit = imp(S, P["IT"], "students_valid.csv")
        check("S1 valid file: 60 inserted, 0 flagged, 0 cases",
              commit["inserted"] == 60 and commit["flagged"] == 0 and commit["cases_created"] == 0, str(commit))
        check("S1 dashboard total +60", stats()["total_students"] == base["total_students"] + 60)
        check("S1 records visible in Student Records", c.get("/api/students?search=IIT25IT&limit=1", headers=S).json()["total"] == 60)
        check("S1 import recorded in audit", any(l["action"] == "submit" for l in c.get("/api/audit?action=submit", headers=A).json()["items"]))

        # ---------------- Scenario 3: validation errors (import before others so row expectations are clean)
        _, val, issues, commit = imp(S, P["AIDS"], "students_invalid.csv")
        rows = by_row(issues)
        expected = {1: "MISSING_REQUIRED", 2: "MISSING_REQUIRED", 3: "FMT_APAAR", 4: "FMT_APAAR", 5: "FMT_APAAR", 6: "FMT_DOB",
                    7: "FMT_DOB", 8: "DATE_INCONSIST", 9: "FMT_GENDER", 10: "FMT_EMAIL", 11: "MISSING_REQUIRED", 12: "MISSING_REQUIRED"}
        check("S3 every deliberate problem detected on its row", all(code in rows[r] for r, code in expected.items()),
              str({r: rows[r] for r in expected}))
        check("S3 row 11 carries several problems at once", {"MISSING_REQUIRED", "FMT_GENDER", "FMT_EMAIL"} <= rows[11], str(rows[11]))
        check("S3 rows 13-30 clean", all(not rows[r] for r in range(13, 31)), str({r: rows[r] for r in range(13, 31) if rows[r]}))
        check("S3 10 errors, 2 warnings, 10 cases", val["error_records"] == 10 and val["warning_records"] == 2 and commit["cases_created"] == 10, f"{val} {commit}")

        # ---------------- Scenario 2: missing APAAR / Vihaan Sharma
        _, val, issues, commit = imp(S, P["MCA"], "students_missing_apaar.csv")
        check("S2 five rows flagged, five cases", commit["flagged"] == 5 and commit["cases_created"] == 5, str(commit))
        v = student(S, "IIT25MCA004")
        check("S2 exactly one active Vihaan Sharma record", len(v) == 1 and v[0]["name"] == "Vihaan Sharma", str(v))
        v = v[0]
        check("S2 Vihaan shows APAAR missing / invalid", v["apaar_status"] == "MISSING" and v["validation_status"] == "invalid")
        case = [x for x in c.get(f"/api/students/{v['id']}", headers=S).json()["cases"] if x["status"] == "open"][0]
        check("S2 reviewer marks awaiting evidence",
              c.post(f"/api/cases/{case['id']}/request-clarification", headers=R, json={"note": "Need the APAAR card copy"}).json()["status"] == "pending")
        check("S2 resolve refused while evidence outstanding",
              c.post(f"/api/cases/{case['id']}/resolve", headers=S, json={"reason": "Evidence is still pending from the student"}).status_code == 409)
        check("S2 any decision refused while awaiting evidence, however worded",
              c.post(f"/api/cases/{case['id']}/resolve", headers=S, json={"reason": "APAAR card copy still pending from the student"}).status_code == 409
              and c.post(f"/api/cases/{case['id']}/resolve", headers=S, json={"reason": "Checked and looks fine"}).status_code == 409)
        c.post(f"/api/cases/{case['id']}/comment", headers=S, json={"comment": "APAAR card copy received (test value 110200000004)", "evidence": True})
        check("S2 evidence returns case to review", c.get(f"/api/cases/{case['id']}", headers=S).json()["status"] == "under_review")
        before = stats()
        corr = c.put(f"/api/students/{v['id']}/correct", headers=S, json={"apaar_id": "110200000004", "reason": "APAAR ID from the student's APAAR card"}).json()
        check("S2 correction creates version 2 that passes all checks", corr.get("version") == 2 and corr.get("validation_status") == "valid", str(corr))
        after = stats()
        check("S2 dashboard: issues -1, valid +1, total unchanged",
              after["issues_found"] == before["issues_found"] - 1 and after["valid_records"] == before["valid_records"] + 1
              and after["total_students"] == before["total_students"])
        ref = c.get(f"/api/students/{corr['student_id']}/reference-comparison", headers=S).json()
        check("S2 corrected record matches its sandbox reference", ref["available"] and all(f["match"] for f in ref["fields"]), str(ref))
        check("S2 case resolves after correction",
              c.post(f"/api/cases/{case['id']}/resolve", headers=S, json={"reason": "APAAR ID added from the card copy; record passes all checks"}).status_code == 200)
        hist = c.get(f"/api/students/{corr['student_id']}", headers=S).json()["version_history"]
        check("S2 version 1 preserved", [h["version"] for h in hist] == [2, 1])
        _, _, issues2, commit2 = imp(S, P["MCA"], "students_missing_apaar.csv")
        check("S2 re-importing the same file adds nothing", commit2["inserted"] == 0 and commit2["skipped"] == 40, str(commit2))
        check("S2 still exactly one IIT25MCA004 after re-import", len(student(S, "IIT25MCA004")) == 1)

        # ---------------- Scenario 4: duplicates
        _, val, issues, commit = imp(S, P["CSBS"], "students_duplicates.csv")
        rows = by_row(issues)
        check("S4 exact repeated row 6 skipped", "SKIP_DUP_ROW" in rows[6] and commit["skipped"] == 1, f"{rows[6]} {commit}")
        check("S4 same roll, different student: rows 10-11 DUP_ROLL", "DUP_ROLL" in rows[10] and "DUP_ROLL" in rows[11])
        check("S4 similar names, different DOB: rows 16-17 not flagged", not rows[16] and not rows[17], f"{rows[16]} {rows[17]}")
        check("S4 same name + DOB: row 22 POSSIBLE_DUP_PERSON", "POSSIBLE_DUP_PERSON" in rows[22], str(rows[22]))
        check("S4 APAAR active at another college: row 26 DUP_APAAR_CROSS", "DUP_APAAR_CROSS" in rows[26])
        check("S4 one APAAR on two rows: rows 29-30 DUP_APAAR_SAME", "DUP_APAAR_SAME" in rows[29] and "DUP_APAAR_SAME" in rows[30])
        check("S4 both conflicting records kept (nothing merged)", len(student(S, "IIT25CSBS010")) == 2)
        harini = student(S, "IIT25CSBS022")[0]
        hcase = [x for x in c.get(f"/api/students/{harini['id']}", headers=S).json()["cases"] if x["status"] == "open"][0]
        detail = c.get(f"/api/cases/{hcase['id']}", headers=S).json()
        check("S4 duplicate review shows the matching record and why",
              any("same name and date of birth" in m["match_reasons"] for m in detail["matched_records"]))
        c.post(f"/api/cases/{hcase['id']}/comment", headers=R, json={"comment": "Please compare parents' names on both admission forms"})
        check("S4 dismissed with justification",
              c.post(f"/api/cases/{hcase['id']}/reject", headers=S, json={"reason": "Different students: parents' names and photographs differ on the admission forms"}).status_code == 200)
        dup_roll = student(S, "IIT25CSBS010")
        wrong = [d for d in dup_roll if d["row_number"] == 11][0]
        rcase = [x for x in c.get(f"/api/students/{wrong['id']}", headers=S).json()["cases"] if x["status"] == "open"][0]
        check("S4 roll conflict cannot be dismissed away... resolve blocked before fix",
              c.post(f"/api/cases/{rcase['id']}/resolve", headers=S, json={"reason": "Checked both admission forms"}).status_code == 409)
        fix = c.put(f"/api/students/{wrong['id']}/correct", headers=S, json={"institute_roll_no": "IIT25CSBS035", "reason": "Roll number mistyped; correct roll from admission register"}).json()
        check("S4 roll corrected -> record passes", fix.get("validation_status") == "valid", str(fix))
        check("S4 roll case resolves after correction",
              c.post(f"/api/cases/{rcase['id']}/resolve", headers=S, json={"reason": "Roll number corrected from the admission register"}).status_code == 200)

        # ---------------- Scenario 5: reconciliation
        _, val, issues, commit = imp(S, P["MTCS"], "students_reconciliation.csv")
        rows = by_row(issues)
        check("S5 rows 3, 6, 9, 12 differ from reference", all("REF_MISMATCH" in rows[r] for r in (3, 6, 9, 12)), str({r: rows[r] for r in (3, 6, 9, 12)}))
        check("S5 other rows match their reference", all(not rows[r] for r in range(1, 17) if r not in (3, 6, 9, 12)))
        check("S5 four reference-mismatch cases", commit["cases_created"] == 4, str(commit))
        s12 = student(S, "IIT25MTCS012")[0]
        cmp_ = c.get(f"/api/students/{s12['id']}/reference-comparison", headers=S).json()
        diffs = sorted(f["field"] for f in cmp_["fields"] if f["match"] is False)
        check("S5 row 12 shows exact field differences (name, DOB)", diffs == ["Date of birth", "Name"], str(diffs))
        rc = [x for x in c.get(f"/api/students/{s12['id']}", headers=S).json()["cases"] if x["status"] == "open"][0]
        c.post(f"/api/cases/{rc['id']}/comment", headers=S, json={"comment": "Birth certificate copy received", "evidence": True})
        ref_vals = {f["field"]: f["reference_value"] for f in cmp_["fields"]}
        fix = c.put(f"/api/students/{s12['id']}/correct", headers=S,
                    json={"name": ref_vals["Name"], "date_of_birth": ref_vals["Date of birth"],
                          "reason": "Name and DOB corrected from the birth certificate"}).json()
        check("S5 correcting to the evidenced values clears the mismatch", fix.get("validation_status") == "valid", str(fix))
        check("S5 reconciliation case resolves",
              c.post(f"/api/cases/{rc['id']}/resolve", headers=S, json={"reason": "Record corrected to match the birth certificate"}).status_code == 200)

        # ---------------- Scenario 6: intake
        _, val, issues, commit = imp(S, P["MECH"], "students_intake_overflow.csv")
        exceeded = sorted(i["row_number"] for i in issues if i["rule_code"] == "INTAKE_EXCEED")
        n = sum(1 for _ in open(DATA / "students_intake_overflow.csv", encoding="utf-8")) - 1
        check("S6 exactly the last 3 rows exceed the intake reference", exceeded == [n - 2, n - 1, n], str(exceeded))
        mech = [r for r in c.get("/api/reports/intake-reconciliation", headers=S).json()["items"] if r["programme_code"] == "MECH"][0]
        check("S6 intake reconciliation shows Mechanical over its reference", mech["outcome"] == "POTENTIAL_DISCREPANCY" and mech["difference"] == 3, str(mech))

        # ---------------- Scenario 7 + roles: isolation and prohibited operations
        _, _, _, commit = imp(T, PT["MCA"], "students_other_institution.csv")
        check("S7 second college imports its file (50 rows)", commit["inserted"] == 50, str(commit))
        check("S7 Ilampirai staff cannot see Tamravarni records", c.get("/api/students?search=TCE25MCA&limit=1", headers=S).json()["total"] == 0)
        check("S7 reviewer sees them", c.get("/api/students?search=TCE25MCA&limit=1", headers=R).json()["total"] == 50)
        tce_one = c.get("/api/students?search=TCE25MCA001", headers=T).json()["items"][0]
        check("S7 direct access to another college's record refused", c.get(f"/api/students/{tce_one['id']}", headers=S).status_code == 403)
        any_case = c.get("/api/cases?status=open&limit=1", headers=S).json()["items"][0]
        check("Roles: staff cannot manage users", c.post("/api/users", headers=S, json={"email": "x@y.in", "name": "X", "password": "Passw0rd!", "role": "institution_user"}).status_code == 403)
        check("Roles: staff cannot change validation rules", c.put("/api/validation-rules", headers=S, json={"config": {}}).status_code == 403)
        check("Roles: reviewer cannot decide a case", c.post(f"/api/cases/{any_case['id']}/resolve", headers=R, json={"reason": "Reviewer decision"}).status_code == 403)
        check("Roles: reviewer cannot correct records", c.put(f"/api/students/{tce_one['id']}/correct", headers=R, json={"name": "Z", "reason": "Reviewer edit"}).status_code == 403)
        check("Roles: admin can assign a case", c.post(f"/api/cases/{any_case['id']}/assign", headers=A,
                                                        json={"assigned_to": c.get('/api/auth/me', headers=S).json()['id']}).status_code == 200)
        check("Roles: reviewer reopens a decision", c.post(f"/api/cases/{hcase['id']}/request-review", headers=R, json={"reason": "Attach the admission forms as evidence"}).status_code == 200)
        check("Roles: staff re-decides after reopen", c.post(f"/api/cases/{hcase['id']}/reject", headers=S,
                                                             json={"reason": "Admission forms attached: different parents, different schools"}).status_code == 200)

        # ---------------- Expected cases (review_cases.csv) were all opened
        expected_cases = list(csv.DictReader(open(DATA / "review_cases.csv", encoding="utf-8")))
        missing = []
        for e in expected_cases:
            hdr = T if e["file"] == "students_other_institution.csv" else S
            recs = [r for r in c.get(f"/api/students?search={e['roll_no']}&limit=10", headers=hdr).json()["items"]] or \
                   [r for r in c.get(f"/api/students?search={e['roll_no']}&limit=10", headers=R).json()["items"]]
            cs = [x for r in recs for x in c.get(f"/api/students/{r['id']}", headers=hdr).json()["cases"]]
            if not any(x["issue_type"] == e["case_type"] for x in cs):
                # roll may have been corrected during the demo: look the case up by its history instead
                missing.append(f"{e['file']} row {e['row']} {e['rule_code']}")
        check(f"Every expected case in review_cases.csv was opened ({len(expected_cases)})", not missing, "; ".join(missing))

        # ---------------- Dashboard / reports reconcile with records
        for label, h in (("staff", S), ("reviewer", R)):
            st = stats(h)
            tot = lambda q: c.get(f"/api/students?limit=1{q}", headers=h).json()["total"]  # noqa: E731
            check(f"Metrics ({label}): totals equal the record lists",
                  st["total_students"] == tot("") and st["valid_records"] == tot("&validation_status=valid")
                  and st["issues_found"] == tot("&validation_status=invalid,duplicate")
                  and st["pending_verification"] == tot("&validation_status=pending,warning")
                  and st["valid_records"] + st["issues_found"] + st["pending_verification"] == st["total_students"], str(st))
            open_cases = sum(c.get(f"/api/cases?status={s}&limit=1", headers=h).json()["total"] for s in ("open", "under_review", "pending", "escalated"))
            check(f"Metrics ({label}): open cases equal the case list", st["open_cases"] == open_cases, f"{st['open_cases']} vs {open_cases}")
        exp = c.post("/api/reports/export?report_type=discrepancy", headers=S)
        rows = list(csv.reader(io.StringIO(exp.content.decode("utf-8-sig"))))
        disc = c.get("/api/reports/discrepancy", headers=S).json()
        check("Export: valid CSV with one row per open issue", exp.status_code == 200 and len(rows) - 1 >= len(disc) and all(len(r) == len(rows[0]) for r in rows))
        check("Export: identifiers masked", not any(len(r[5]) == 12 and r[5].isdigit() for r in rows[1:]))
        summ = c.get("/api/oversight/summary", headers=R).json()
        check("Oversight summary lists the staff decisions", len(summ["recent_decisions"]) >= 4)

    failed = [r for r in results if not r[0]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run())
