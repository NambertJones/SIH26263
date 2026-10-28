"""Test F + G + Phase 6: dashboard metrics reconcile with records; exports are safe; audit is written."""

import csv
import io

from conftest import csv_bytes, row, import_file


def _total(client, headers, status=None):
    q = "/api/students?limit=1" + (f"&validation_status={status}" if status else "")
    return client.get(q, headers=headers).json()["total"]


def test_dashboard_matches_student_lists(client, auth):
    for role in ("staff", "reviewer"):
        h = auth[role]
        stats = client.get("/api/dashboard/stats", headers=h).json()
        assert stats["total_students"] == _total(client, h)
        assert stats["valid_records"] == _total(client, h, "valid")
        assert stats["issues_found"] == _total(client, h, "invalid,duplicate")
        assert stats["pending_verification"] == _total(client, h, "pending,warning")
        # Categories do not overlap and add up (skipped rows are never active)
        assert stats["valid_records"] + stats["issues_found"] + stats["pending_verification"] == stats["total_students"]


def test_open_case_metric_matches_case_list(client, auth):
    h = auth["staff"]
    stats = client.get("/api/dashboard/stats", headers=h).json()
    open_total = sum(client.get(f"/api/cases?status={s}&limit=1", headers=h).json()["total"]
                     for s in ("open", "under_review", "pending", "escalated"))
    assert stats["open_cases"] == open_total


def test_metrics_follow_each_operation(client, auth, programmes):
    h = auth["staff"]
    s0 = client.get("/api/dashboard/stats", headers=h).json()
    res = import_file(client, h, programmes["AIDS"], csv_bytes([row("Metric Missing", "", "QAMET1", programme="AIDS")]))
    s1 = client.get("/api/dashboard/stats", headers=h).json()
    assert s1["total_students"] == s0["total_students"] + 1
    assert s1["issues_found"] == s0["issues_found"] + 1
    assert s1["open_cases"] == s0["open_cases"] + res["commit"]["cases_created"]

    st = client.get("/api/students?search=QAMET1", headers=h).json()["items"][0]
    client.put(f"/api/students/{st['id']}/correct", headers=h, json={"apaar_id": "592000000001", "reason": "From APAAR card"})
    s2 = client.get("/api/dashboard/stats", headers=h).json()
    assert s2["total_students"] == s1["total_students"]  # a correction adds a version, not a student
    assert s2["issues_found"] == s1["issues_found"] - 1 and s2["valid_records"] == s1["valid_records"] + 1

    case = [c for c in client.get(f"/api/students/{st['id']}", headers=h).json()["cases"] if c["status"] == "open"][0]
    client.post(f"/api/cases/{case['id']}/resolve", headers=h, json={"reason": "APAAR ID added from card; checks pass"})
    s3 = client.get("/api/dashboard/stats", headers=h).json()
    assert s3["open_cases"] == s2["open_cases"] - 1


def test_intake_reconciliation_counts_committed_records(client, auth):
    rows = client.get("/api/reports/intake-reconciliation", headers=auth["staff"]).json()["items"]
    for r in rows:
        assert r["difference"] == r["enrolled_count"] - r["reference_total"]
    it = next(r for r in rows if r["programme_code"] == "IT")
    students_it = client.get(f"/api/students?programme_id={it['programme_id']}&limit=1", headers=auth["staff"]).json()["total"]
    assert it["enrolled_count"] + it["excluded_count"] == students_it


def test_export_is_valid_csv_and_neutralises_formulas(client, auth, programmes):
    h = auth["staff"]
    client.post("/api/students", headers=h, json={"name": "=HYPERLINK(\"http://example.invalid\",\"x\")", "programme_id": programmes["AIDS"],
                                                  "institute_roll_no": "QAFORMULA1", "apaar_id": ""})
    r = client.post("/api/reports/export?report_type=discrepancy", headers=h)
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    text = r.content.decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text)))
    assert rows[0][:4] == ["Issue ID", "Rule Code", "Severity", "Student Name"]
    names = [x[3] for x in rows[1:]]
    assert any(n.startswith("'=HYPERLINK") for n in names)
    assert not any(n.startswith("=") for n in names)
    assert all(len(x) == len(rows[0]) for x in rows)
    assert all(len(x[5]) <= 20 and "XXXX" in x[5] or x[5] in ("N/A", "") or x[5].startswith("Invalid") for x in rows[1:])


def test_audit_records_actor_action_and_outcome(client, auth):
    logs = client.get("/api/audit?limit=200", headers=auth["admin"]).json()["items"]
    actions = {l["action"] for l in logs}
    assert {"upload", "submit", "correction"} <= actions
    sub = next(l for l in logs if l["action"] == "submit")
    assert sub["actor_email"] and sub["metadata"] and {"inserted", "skipped", "flagged"} <= set(sub["metadata"])
    # There is no API to edit or delete audit history
    assert client.delete(f"/api/audit/{sub['id']}", headers=auth["admin"]).status_code in (404, 405)
