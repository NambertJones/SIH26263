"""Test C + defect E: bulk import, row-level validation, repeated imports and file handling."""

from collections import Counter

from conftest import csv_bytes, row, import_file, upload, find_students, issues_for


def test_valid_batch_commits_and_counts(client, auth, programmes):
    before = client.get("/api/dashboard/stats", headers=auth["staff"]).json()["total_students"]
    rows = [row(f"Import Valid {chr(64 + i)}", f"5100000000{i:02d}", f"QAIMP{i:03d}") for i in range(1, 6)]
    res = import_file(client, auth["staff"], programmes["IT"], csv_bytes(rows))
    assert res["validation"]["valid_records"] == 5
    assert res["commit"]["inserted"] == 5 and res["commit"]["skipped"] == 0 and res["commit"]["flagged"] == 0
    after = client.get("/api/dashboard/stats", headers=auth["staff"]).json()["total_students"]
    assert after == before + 5
    assert len(find_students(client, auth["staff"], "QAIMP")) == 5


def test_draft_upload_is_not_on_record(client, auth, programmes):
    before = client.get("/api/dashboard/stats", headers=auth["staff"]).json()["total_students"]
    import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Draft Only", "510000000099", "QADRAFT1")]), submit=False)
    assert client.get("/api/dashboard/stats", headers=auth["staff"]).json()["total_students"] == before
    assert find_students(client, auth["staff"], "QADRAFT1") == []


def test_repeated_import_is_idempotent(client, auth, programmes):
    content = csv_bytes([row(f"Repeat Import {chr(64 + i)}", f"5200000000{i:02d}", f"QAREP{i:03d}") for i in range(1, 4)])
    first = import_file(client, auth["staff"], programmes["IT"], content, "repeat.csv")
    assert first["commit"]["inserted"] == 3
    second = import_file(client, auth["staff"], programmes["IT"], content, "repeat.csv")
    assert second["upload"]["duplicate_of"] is not None  # same file already submitted
    assert second["commit"]["skipped"] == 3 and second["commit"]["inserted"] == 0
    assert len(find_students(client, auth["staff"], "QAREP")) == 3


def test_exact_duplicate_row_in_file_is_skipped(client, auth, programmes):
    r = row("Exact Twin", "530000000001", "QAEXACT1")
    res = import_file(client, auth["staff"], programmes["IT"], csv_bytes([r, dict(r)]))
    assert res["commit"]["inserted"] == 1 and res["commit"]["skipped"] == 1
    codes = Counter(i["rule_code"] for i in issues_for(client, auth["staff"], res["submission_id"]))
    assert codes["SKIP_DUP_ROW"] == 1
    assert len(find_students(client, auth["staff"], "QAEXACT1")) == 1


def test_same_roll_with_different_details_is_flagged_not_merged(client, auth, programmes):
    import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Roll Owner", "540000000001", "QAROLL1")]))
    res = import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Different Person", "540000000002", "QAROLL1")]))
    codes = {i["rule_code"] for i in issues_for(client, auth["staff"], res["submission_id"])}
    assert "DUP_ROLL" in codes
    found = find_students(client, auth["staff"], "QAROLL1")
    assert len(found) == 2 and {f["validation_status"] for f in found} >= {"duplicate"}  # both kept, conflict flagged


def test_row_level_errors_are_reported(client, auth, programmes):
    rows = [
        row("Missing Apaar", "", "QAERR1"),
        row("Short Apaar", "12345", "QAERR2"),
        row("Future Dob", "550000000003", "QAERR3", dob="01/01/2030"),
        row("Bad Email", "550000000004", "QAERR4", email="not-an-email"),
        row("Bad Gender", "550000000005", "QAERR5", gender="M"),
        row("", "550000000006", "QAERR6"),
        row("Admit Before Birth", "550000000007", "QAERR7", dob="10/10/2006", admission="01/01/2005"),
    ]
    res = import_file(client, auth["staff"], programmes["AIDS"], csv_bytes(rows), submit=False)
    by_row = {}
    for i in issues_for(client, auth["staff"], res["submission_id"]):
        by_row.setdefault(i["row_number"], set()).add(i["rule_code"])
    assert by_row[1] == {"MISSING_REQUIRED"}
    assert by_row[2] == {"FMT_APAAR"}
    assert "FMT_DOB" in by_row[3]
    assert by_row[4] == {"FMT_EMAIL"}
    assert by_row[5] == {"FMT_GENDER"}
    assert "MISSING_REQUIRED" in by_row[6]
    assert "DATE_INCONSIST" in by_row[7]


def test_missing_required_column_flags_every_row(client, auth, programmes):
    header = [h for h in ["student_name", "dob", "gender", "roll_no"]]
    content = csv_bytes([row("No Apaar Column", "", "QANOCOL1")], header=header)
    res = import_file(client, auth["staff"], programmes["AIDS"], content, submit=False)
    codes = {i["rule_code"] for i in issues_for(client, auth["staff"], res["submission_id"])}
    assert "MISSING_REQUIRED" in codes


def test_unsupported_empty_and_malformed_files(client, auth, programmes):
    assert upload(client, auth["staff"], programmes["IT"], b"hello", "notes.txt").status_code == 400
    assert upload(client, auth["staff"], programmes["IT"], b"", "empty.csv").status_code == 400
    bad_xlsx = upload(client, auth["staff"], programmes["IT"], b"this is not a spreadsheet", "broken.xlsx")
    assert bad_xlsx.status_code == 400
    # A programme from another college cannot be used
    other = client.get("/api/students?limit=1", headers=auth["staff_other"]).json()["items"][0]["programme_id"]
    assert upload(client, auth["staff"], other, csv_bytes([row("X", "", "X1")])).status_code in (400, 403, 404)


def test_submitted_file_cannot_be_remapped_or_resubmitted(client, auth, programmes):
    res = import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Locked File", "560000000001", "QALOCK1")]))
    sid = res["submission_id"]
    assert client.post(f"/api/submissions/{sid}/submit", headers=auth["staff"]).status_code == 409
    remap = client.post(f"/api/submissions/{sid}/map-columns", headers=auth["staff"],
                        json={"mapping": res["upload"]["auto_mappings"], "programme_id": programmes["IT"]})
    assert remap.status_code == 409


def test_cross_institution_apaar_collision(client, auth, programmes):
    # 887766554433 is active at Tamravarni College of Engineering in the seed data
    res = import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Cross Collision", "887766554433", "QACROSS1")]))
    codes = {i["rule_code"] for i in issues_for(client, auth["staff"], res["submission_id"])}
    assert "DUP_APAAR_CROSS" in codes
    assert res["commit"]["cases_created"] == 1


def test_xlsx_import(client, auth, programmes, tmp_path):
    import pandas as pd
    path = tmp_path / "batch.xlsx"
    pd.DataFrame([row("Excel Student", "570000000001", "QAXLSX1")]).to_excel(path, index=False)
    res = import_file(client, auth["staff"], programmes["IT"], path.read_bytes(), "batch.xlsx")
    assert res["commit"]["inserted"] == 1
    assert find_students(client, auth["staff"], "QAXLSX1")[0]["apaar_masked"].endswith("0001")


def test_programme_taken_from_each_row(client, auth, programmes):
    rows = [row("Row Programme A", "580000000001", "QAPROG1"), row("Row Programme B", "580000000002", "QAPROG2")]
    rows[0]["programme"], rows[1]["programme"] = "IT", "aids"
    up = upload(client, auth["staff"], None, csv_bytes(rows), "programmes.csv").json()
    sid = up["submission_id"]
    client.post(f"/api/submissions/{sid}/map-columns", headers=auth["staff"], json={"mapping": up["auto_mappings"]})
    client.post(f"/api/submissions/{sid}/validate", headers=auth["staff"])
    got = {s["institute_roll_no"]: s["programme_id"] for s in
           client.get(f"/api/students?submission_id={sid}", headers=auth["staff"]).json()["items"]}
    assert got == {"QAPROG1": programmes["IT"], "QAPROG2": programmes["AIDS"]}


def test_unknown_programme_is_flagged(client, auth, programmes):
    r = row("Unknown Programme", "580000000003", "QAPROG3")
    r["programme"] = "XYZ"
    up = upload(client, auth["staff"], None, csv_bytes([r]), "unknown.csv").json()
    sid = up["submission_id"]
    client.post(f"/api/submissions/{sid}/map-columns", headers=auth["staff"], json={"mapping": up["auto_mappings"]})
    client.post(f"/api/submissions/{sid}/validate", headers=auth["staff"])
    assert any(i["field_name"] == "programme" and i["rule_code"] == "MISSING_REQUIRED"
               for i in issues_for(client, auth["staff"], sid))
