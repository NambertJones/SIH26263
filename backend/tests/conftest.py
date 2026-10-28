"""Test fixtures: an isolated, freshly seeded SQLite database per test session.

Nothing here touches backend/apaar_reconx.db or any deployed database.
"""

import csv
import io
import os
import sys
import tempfile
from pathlib import Path

import pytest

_TMP = tempfile.mkdtemp(prefix="reconx-test-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_TMP, "test.db")).replace("\\", "/")
os.environ["SEED_ON_STARTUP"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

HEADER = ["student_name", "apaar_id", "dob", "gender", "programme", "admission_date",
          "status", "category", "roll_no", "email", "phone"]

ACCOUNTS = {
    "admin": ("admin@college.edu.in", "admin123"),
    "staff": ("staff@college.edu.in", "staff123"),
    "reviewer": ("reviewer@reconx.in", "reviewer123"),
    "staff_other": ("staff.tce@college.edu.in", "staff123"),
}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth(client):
    headers = {}
    for role, (email, pw) in ACCOUNTS.items():
        r = client.post("/api/auth/login", json={"email": email, "password": pw})
        assert r.status_code == 200, (role, r.text)
        headers[role] = {"Authorization": f"Bearer {r.json()['access_token']}"}
    return headers


@pytest.fixture(scope="session")
def programmes(client, auth):
    me = client.get("/api/auth/me", headers=auth["staff"]).json()
    progs = client.get(f"/api/institutions/{me['institution_id']}/programmes", headers=auth["staff"]).json()
    return {p["code"]: p["id"] for p in progs}


def row(name, apaar, roll, dob="15/06/2006", gender="Female", programme="IT", admission="05/08/2025",
        email=None, phone="9000000000", category="General", status="active"):
    return {"student_name": name, "apaar_id": apaar, "dob": dob, "gender": gender, "programme": programme,
            "admission_date": admission, "status": status, "category": category, "roll_no": roll,
            "email": email if email is not None else f"{roll.lower()}@student.ilampirai.edu.in", "phone": phone}


def csv_bytes(rows, header=HEADER) -> bytes:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=header, extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue().encode("utf-8")


def upload(client, headers, programme_id, content: bytes, filename="batch.csv"):
    return client.post("/api/submissions/upload", headers=headers, files={"file": (filename, content)},
                       data={"programme_id": programme_id, "academic_year": "2025-26"})


def import_file(client, headers, programme_id, content: bytes, filename="batch.csv", submit=True):
    """Run the real import flow: upload → map columns → validate → submit."""
    up = upload(client, headers, programme_id, content, filename)
    assert up.status_code == 200, up.text
    up = up.json()
    sid = up["submission_id"]
    r = client.post(f"/api/submissions/{sid}/map-columns", headers=headers,
                    json={"mapping": up["auto_mappings"], "programme_id": programme_id, "academic_year": "2025-26"})
    assert r.status_code == 200, r.text
    validation = client.post(f"/api/submissions/{sid}/validate", headers=headers)
    assert validation.status_code == 200, validation.text
    out = {"upload": up, "submission_id": sid, "validation": validation.json()}
    if submit:
        commit = client.post(f"/api/submissions/{sid}/submit", headers=headers)
        assert commit.status_code == 200, commit.text
        out["commit"] = commit.json()
    return out


def find_students(client, headers, search):
    return client.get(f"/api/students?search={search}&limit=100", headers=headers).json()["items"]


def issues_for(client, headers, sid):
    return client.get(f"/api/validation/{sid}/results", headers=headers).json()["issues"]


def case_for_student(client, headers, student_id):
    detail = client.get(f"/api/students/{student_id}", headers=headers).json()
    open_cases = [c for c in detail["cases"] if c["status"] not in ("resolved", "rejected")]
    return open_cases[0] if open_cases else None
