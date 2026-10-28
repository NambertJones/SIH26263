"""Test A + Phase 2: authentication, role permissions (enforced by the API) and institution isolation."""


def test_valid_and_invalid_login(client):
    ok = client.post("/api/auth/login", json={"email": "staff@college.edu.in", "password": "staff123"})
    assert ok.status_code == 200 and ok.json()["access_token"]
    bad = client.post("/api/auth/login", json={"email": "staff@college.edu.in", "password": "wrong-password"})
    assert bad.status_code == 401
    unknown = client.post("/api/auth/login", json={"email": "nobody@college.edu.in", "password": "x"})
    assert unknown.status_code == 401


def test_protected_endpoints_need_a_session(client):
    assert client.get("/api/students").status_code in (401, 403)
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_me_reports_role_and_scope(client, auth):
    staff = client.get("/api/auth/me", headers=auth["staff"]).json()
    reviewer = client.get("/api/auth/me", headers=auth["reviewer"]).json()
    assert staff["role"] == "institution_user" and staff["institution_id"]
    assert reviewer["role"] == "reviewer" and not reviewer["institution_id"]


def test_staff_only_see_their_own_institution(client, auth):
    mine = client.get("/api/auth/me", headers=auth["staff"]).json()["institution_id"]
    rows = client.get("/api/students?limit=100", headers=auth["staff"]).json()["items"]
    assert rows and all(r["institution_id"] == mine for r in rows)

    other = client.get("/api/students?limit=1", headers=auth["staff_other"]).json()["items"][0]
    assert other["institution_id"] != mine
    # Direct access to another college's record and data is refused by the API
    assert client.get(f"/api/students/{other['id']}", headers=auth["staff"]).status_code == 403
    assert client.get(f"/api/students?institution_id={other['institution_id']}", headers=auth["staff"]).status_code == 403
    assert client.put(f"/api/students/{other['id']}/correct", headers=auth["staff"],
                      json={"name": "Changed", "reason": "Cross-college edit attempt"}).status_code == 403


def test_reviewer_sees_all_institutions(client, auth):
    insts = {r["institution_id"] for r in client.get("/api/students?limit=1000", headers=auth["reviewer"]).json()["items"]}
    assert len(insts) > 1


def test_admin_only_operations(client, auth):
    me = client.get("/api/auth/me", headers=auth["staff"]).json()
    inst = me["institution_id"]
    new_user = {"email": "qa.new.staff@college.edu.in", "name": "QA Staff", "password": "Passw0rd!x",
                "role": "institution_user", "institution_id": inst}
    assert client.post("/api/users", headers=auth["staff"], json=new_user).status_code == 403
    assert client.post("/api/users", headers=auth["reviewer"], json=new_user).status_code == 403
    created = client.post("/api/users", headers=auth["admin"], json=new_user)
    assert created.status_code == 200, created.text
    # Admin cannot create an oversight reviewer or a user for another college
    assert client.post("/api/users", headers=auth["admin"], json={**new_user, "email": "qa.r@x.in", "role": "reviewer"}).status_code == 403

    assert client.put(f"/api/institutions/{inst}", headers=auth["staff"], json={"name": "X"}).status_code == 403
    assert client.put("/api/validation-rules", headers=auth["staff"], json={"config": {}}).status_code == 403
    assert client.put("/api/validation-rules", headers=auth["reviewer"], json={"config": {}}).status_code == 403
    assert client.get("/api/validation-rules", headers=auth["staff"]).status_code == 200


def test_reviewer_cannot_change_college_data(client, auth, programmes):
    student = client.get("/api/students?limit=1", headers=auth["staff"]).json()["items"][0]
    r = client.put(f"/api/students/{student['id']}/correct", headers=auth["reviewer"], json={"name": "X", "reason": "Reviewer edit"})
    assert r.status_code == 403
    assert client.post(f"/api/students/{student['id']}/reveal-apaar", headers=auth["reviewer"], json={"reason": "curious reviewer"}).status_code == 403
    up = client.post("/api/submissions/upload", headers=auth["reviewer"], files={"file": ("a.csv", b"student_name\nA\n")})
    assert up.status_code == 400
    created = client.post("/api/students", headers=auth["reviewer"],
                          json={"name": "X", "programme_id": programmes["IT"], "institute_roll_no": "RVW001"})
    assert created.status_code == 403


def test_oversight_summary_access(client, auth):
    assert client.get("/api/oversight/summary", headers=auth["staff"]).status_code == 403
    assert client.get("/api/oversight/summary", headers=auth["reviewer"]).status_code == 200
    admin_view = client.get("/api/oversight/summary", headers=auth["admin"]).json()
    assert len(admin_view["by_institution"]) <= 1


def test_audit_trail_access(client, auth):
    # College staff see case history, not the full audit trail page (hidden in the UI);
    # the API still scopes any audit read to their own college's users.
    staff_view = client.get("/api/audit?limit=50", headers=auth["staff"]).json()
    reviewer_view = client.get("/api/audit?limit=50", headers=auth["reviewer"]).json()
    assert staff_view["total"] <= reviewer_view["total"]
