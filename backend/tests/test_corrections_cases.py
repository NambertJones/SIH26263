"""Tests B, D, E + defects B and C: corrections, versions, case lifecycle and decision consistency."""

from conftest import csv_bytes, row, import_file, find_students, case_for_student


def _student(client, headers, roll):
    found = find_students(client, headers, roll)
    assert len(found) == 1, found
    return found[0]


def test_missing_apaar_correction_workflow(client, auth, programmes):
    """Vihaan-style scenario: missing APAAR → case → awaiting evidence → correction → re-check → resolve."""
    res = import_file(client, auth["staff"], programmes["MCA"],
                      csv_bytes([row("Kavin Raj", "", "QAMISS01", dob="12/03/2003", programme="MCA")]))
    assert res["commit"]["cases_created"] == 1
    st = _student(client, auth["staff"], "QAMISS01")
    assert st["validation_status"] == "invalid" and st["apaar_status"] == "MISSING"
    case = case_for_student(client, auth["staff"], st["id"])
    assert case and case["status"] == "open"

    # Reviewer asks for evidence (allowed: changes no data)
    r = client.post(f"/api/cases/{case['id']}/request-clarification", headers=auth["reviewer"],
                    json={"note": "Need the student's APAAR card copy"})
    assert r.status_code == 200 and r.json()["status"] == "pending"

    # Resolving now is refused: the record still fails, and the reason admits evidence is outstanding
    bad = client.post(f"/api/cases/{case['id']}/resolve", headers=auth["staff"],
                      json={"reason": "Supporting evidence is still required from the student"})
    assert bad.status_code == 409
    # Any decision is refused while the case awaits evidence, however the reason is worded
    for reason in ("Looked fine to me", "APAAR card copy still pending from the student"):
        bad2 = client.post(f"/api/cases/{case['id']}/resolve", headers=auth["staff"], json={"reason": reason})
        assert bad2.status_code == 409 and "awaiting evidence" in bad2.json()["detail"]
    # A missing APAAR is a definite data error: it cannot be dismissed
    assert client.post(f"/api/cases/{case['id']}/reject", headers=auth["staff"], json={"reason": "Not needed"}).status_code == 409

    # Evidence arrives
    ev = client.post(f"/api/cases/{case['id']}/comment", headers=auth["staff"],
                     json={"comment": "APAAR card copy received from the admissions office", "evidence": True})
    assert ev.status_code == 200
    assert client.get(f"/api/cases/{case['id']}", headers=auth["staff"]).json()["status"] == "under_review"
    # With evidence in, resolving still needs the record itself to pass
    bad3 = client.post(f"/api/cases/{case['id']}/resolve", headers=auth["staff"], json={"reason": "Looked fine to me"})
    assert bad3.status_code == 409 and "still fails" in bad3.json()["detail"]

    # Correction from the record (twice from the same, now stale, page ID: both target the current version)
    c1 = client.put(f"/api/students/{st['id']}/correct", headers=auth["staff"],
                    json={"apaar_id": "5800 0000 0001", "reason": "APAAR ID copied from the student's APAAR card"})
    assert c1.status_code == 200, c1.text
    assert c1.json()["version"] == 2 and c1.json()["validation_status"] == "valid"
    c2 = client.put(f"/api/students/{st['id']}/correct", headers=auth["staff"],
                    json={"email": "kavin.raj@student.ilampirai.edu.in", "reason": "Updated contact email"})
    assert c2.status_code == 200 and c2.json()["version"] == 3

    current = _student(client, auth["staff"], "QAMISS01")
    assert current["id"] == c2.json()["student_id"] and current["apaar_status"] == "FORMAT_VALID"
    detail = client.get(f"/api/students/{current['id']}", headers=auth["staff"]).json()
    assert [v["version"] for v in detail["version_history"]] == [3, 2, 1]  # previous versions preserved
    old = client.get(f"/api/students/{st['id']}", headers=auth["staff"]).json()
    assert old["is_current"] is False and old["latest_version_id"] == current["id"]

    # Now the case can be resolved, and the case followed the student to the new version
    ok = client.post(f"/api/cases/{case['id']}/resolve", headers=auth["staff"],
                     json={"reason": "APAAR ID added from the verified card copy; record passes all checks"})
    assert ok.status_code == 200
    final = client.get(f"/api/cases/{case['id']}", headers=auth["staff"]).json()
    assert final["status"] == "resolved" and final["student_id"] == current["id"]
    kinds = [e["event_type"] for e in final["events"]]
    for k in ("created", "clarification_requested", "evidence_added", "correction", "resolved"):
        assert k in kinds

    trail = client.get(f"/api/students/{current['id']}/audit-trail", headers=auth["staff"]).json()
    assert sum(1 for t in trail if t["action"] == "correction") == 2
    assert all("580000000001" not in (t["description"] or "") for t in trail)  # IDs stay masked in the log


def test_correction_that_remains_invalid(client, auth, programmes):
    import_file(client, auth["staff"], programmes["MCA"], csv_bytes([row("Still Wrong", "", "QAMISS02", dob="01/02/2003", programme="MCA")]))
    st = _student(client, auth["staff"], "QAMISS02")
    r = client.put(f"/api/students/{st['id']}/correct", headers=auth["staff"], json={"apaar_id": "12345", "reason": "Typed from form"})
    assert r.status_code == 200 and r.json()["validation_status"] == "invalid"
    assert any("12 digits" in m for m in r.json()["remaining_issues"])
    case = case_for_student(client, auth["staff"], r.json()["student_id"])
    assert client.post(f"/api/cases/{case['id']}/resolve", headers=auth["staff"], json={"reason": "Checked the record"}).status_code == 409


def test_correction_needs_a_reason_and_a_change(client, auth):
    st = client.get("/api/students?limit=1&validation_status=valid", headers=auth["staff"]).json()["items"][0]
    assert client.put(f"/api/students/{st['id']}/correct", headers=auth["staff"], json={"name": "New", "reason": ""}).status_code == 400
    assert client.put(f"/api/students/{st['id']}/correct", headers=auth["staff"], json={"name": st["name"], "reason": "No real change"}).status_code == 400


def test_duplicate_case_dismissed_with_justification(client, auth, programmes):
    import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Meera Pillai", "590000000001", "QADUPA1", dob="04/04/2006")]))
    res = import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Meera Pillai", "590000000002", "QADUPB1", dob="04/04/2006")]))
    assert res["commit"]["cases_created"] == 1
    st = _student(client, auth["staff"], "QADUPB1")
    case = case_for_student(client, auth["staff"], st["id"])
    detail = client.get(f"/api/cases/{case['id']}", headers=auth["staff"]).json()
    assert detail["issue_type"] == "duplicate_enrollment"
    assert any("same name and date of birth" in m["match_reasons"] for m in detail["matched_records"])
    r = client.post(f"/api/cases/{case['id']}/reject", headers=auth["staff"],
                    json={"reason": "Different students: checked photographs and parents' names on admission forms"})
    assert r.status_code == 200
    assert _student(client, auth["staff"], "QADUPB1")["validation_status"] == "valid"
    assert len(find_students(client, auth["staff"], "QADUP")) == 2  # nothing merged or deleted


def test_assignment_escalation_and_reopen(client, auth, programmes):
    import_file(client, auth["staff"], programmes["IT"], csv_bytes([row("Reopen Case", "887766554433", "QAREOPEN1")]))
    st = _student(client, auth["staff"], "QAREOPEN1")
    case = case_for_student(client, auth["staff"], st["id"])
    staff_id = client.get("/api/auth/me", headers=auth["staff"]).json()["id"]

    assert client.post(f"/api/cases/{case['id']}/assign", headers=auth["staff"], json={"assigned_to": staff_id}).status_code == 403
    assert client.post(f"/api/cases/{case['id']}/assign", headers=auth["admin"], json={"assigned_to": staff_id}).status_code == 200
    # Reviewer escalates; staff can no longer decide; admin decides
    assert client.post(f"/api/cases/{case['id']}/escalate", headers=auth["reviewer"], json={"reason": "Active at two colleges"}).status_code == 200
    assert client.post(f"/api/cases/{case['id']}/reject", headers=auth["staff"], json={"reason": "Transfer confirmed"}).status_code == 403
    assert client.post(f"/api/cases/{case['id']}/resolve", headers=auth["reviewer"], json={"reason": "x" * 10}).status_code == 403
    d = client.post(f"/api/cases/{case['id']}/reject", headers=auth["admin"],
                    json={"reason": "Transfer: student withdrew from the other college in July; record legitimate"})
    assert d.status_code == 200
    # Reviewer reopens; college re-decides; history keeps both decisions
    assert client.post(f"/api/cases/{case['id']}/request-review", headers=auth["reviewer"],
                       json={"reason": "No withdrawal letter attached"}).status_code == 200
    assert client.get(f"/api/cases/{case['id']}", headers=auth["staff"]).json()["status"] == "under_review"
    final = client.post(f"/api/cases/{case['id']}/reject", headers=auth["staff"],
                        json={"reason": "Withdrawal letter dated 14 July attached to the case as evidence"})
    assert final.status_code == 200
    events = [e["event_type"] for e in client.get(f"/api/cases/{case['id']}", headers=auth["staff"]).json()["events"]]
    assert events.count("rejected") == 2 and "review_requested" in events and "escalated" in events


def test_manual_student_entry(client, auth, programmes):
    r = client.post("/api/students", headers=auth["staff"], json={
        "name": "Manual Entry", "programme_id": programmes["IT"], "institute_roll_no": "qamanual1",
        "apaar_id": "591000000001", "date_of_birth": "2006-05-05", "gender": "Male", "enrollment_date": "2025-08-01",
    })
    assert r.status_code == 200 and r.json()["validation_status"] == "valid"
    assert _student(client, auth["staff"], "QAMANUAL1")["id"] == r.json()["student_id"]
    dup = client.post("/api/students", headers=auth["staff"], json={
        "name": "Someone Else", "programme_id": programmes["IT"], "institute_roll_no": "QAMANUAL1", "apaar_id": "591000000002"})
    assert dup.status_code == 200 and dup.json()["validation_status"] == "duplicate" and dup.json()["case_opened"]
