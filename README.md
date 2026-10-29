# APAAR ReconX — Student Data Validation & Reconciliation (SIH26263)

> **Smart India Hackathon 2026 · Problem Statement SIH26263 · Team We Aren't Robots**
> FastAPI · SQLAlchemy (SQLite / PostgreSQL) · React · TypeScript · Vite · Tailwind CSS

> **Independent SIH prototype.** Not an official AICTE, Ministry of Education, APAAR, DigiLocker or AISHE system,
> and not affiliated with or endorsed by them. All colleges, students and identifiers are fictional.
> APAAR IDs are **format-checked only**; registry connectors are sandbox simulations.

**Live demo:** <https://apaar-reconx.onrender.com>. It is on Render's free plan: the first visit after a quiet
period takes about a minute to wake up, and **each wake-up resets the data** (see [Reset](#10-reset-the-demo-data)).

---

## Contents
1. [What it does](#1-what-it-does)
2. [Sign-in accounts](#2-sign-in-accounts)
3. [Run it on your computer](#3-run-it-on-your-computer)
4. [How to use it: step by step](#4-how-to-use-it-step-by-step)
5. [Sample files](#5-sample-files)
6. [Who can do what](#6-who-can-do-what)
7. [Checks the system runs](#7-checks-the-system-runs)
8. [Case statuses](#8-case-statuses)
9. [Tests](#9-tests)
10. [Reset the demo data](#10-reset-the-demo-data)
11. [Deployment](#11-deployment)
12. [Project structure](#12-project-structure)
13. [Limitations](#13-limitations)
14. [More documentation](#14-more-documentation)

---

## 1. What it does

Colleges upload admission data (CSV or Excel) keyed on each student's APAAR ID. APAAR ReconX:

* **Checks every row before anything is saved:**
  * missing fields;
  * malformed APAAR IDs;
  * impossible dates;
  * gender and email format;
  * the college's own configurable rules.
* **Finds possible duplicates:**
  * the same APAAR ID twice in a college;
  * an APAAR ID already active at **another** college;
  * the same roll number used for two students;
  * the same name and date of birth;
  * exact repeated rows.
* **Compares enrolment with each programme's intake reference** (approved + supernumerary/NRI seats).
* **Reconciles records with reference data** (a sandbox reference dataset in this prototype).
* **Opens a review case for every problem.** A person decides each case with a written reason. Nothing is
  merged or deleted automatically.
* **Keeps every change:**
  * corrections create a new version of the record, and the old one is kept;
  * every action is in the audit trail.
* **Keeps each college's data separate.** Oversight reviewers see all colleges but cannot change data.

Re-uploading a file is safe: rows already on record are skipped, and imports never overwrite existing records.

---

## 2. Sign-in accounts

The login page has one-click buttons for the first three accounts.

| Role | Email | Password | College |
|---|---|---|---|
| Institution Admin | `admin@college.edu.in` | `admin123` | Ilampirai Institute of Technology |
| College Staff | `staff@college.edu.in` | `staff123` | Ilampirai Institute of Technology |
| College Staff (second college) | `staff.tce@college.edu.in` | `staff123` | Tamravarni College of Engineering |
| Oversight Reviewer | `reviewer@reconx.in` | `reviewer123` | All colleges (read-only) |

These are prototype accounts for demonstration only.

---

## 3. Run it on your computer

### Requirements
* Python 3.10 or newer (tested with 3.12 and 3.14)
* Node.js 18 or newer (tested with 20 and 24)

### Option A: one server (simplest)

```bash
# 1. Build the web app
cd frontend
npm install
npm run build

# 2. Set up and start the backend (it serves the built web app too)
cd ../backend
python -m venv .venv
source .venv/Scripts/activate  # Windows (Git Bash). PowerShell: .venv\Scripts\Activate.ps1 · macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Open <http://localhost:8000>. The API documentation is at <http://localhost:8000/docs>.

### Option B: development mode (live reload)

Terminal 1, the backend:
```bash
cd backend
source .venv/Scripts/activate
python run.py
```
Terminal 2, the frontend:
```bash
cd frontend
npm run dev
```
Open <http://localhost:5173>. API calls are forwarded to port 8000.

### Option C: Docker
```bash
docker compose up --build -d
```
Open <http://localhost:8000>.

**On first start** the database (`backend/apaar_reconx.db`) is created and filled with the starting data:
* 8 fictional colleges, each with its AICTE-style details;
* 57 programmes with seat figures;
* about 3,600 students;
* sample review cases and audit entries;
* the sandbox reference records.

Some programmes at the main college (IT, MCA, AI & DS, CSBS, M.Tech CSE) are left empty so you can fill
them with the sample files.

---

## 4. How to use it: step by step

### 4.1 Upload a file (College Staff)
1. Sign in as **College Staff** and open **Bulk Import** (under *Data intake*).
2. Choose the **Admission Academic Year**.
3. Drag a CSV/XLSX file onto the upload box, or click **browse**. You can download ready-made files from the
   sample list on the same page, or a blank **CSV template**.
4. Click **Proceed to Column Mapping**. Columns are matched automatically; adjust any that are wrong.
   * **Programme for this file**: leave it on *"Take it from each row's Programme / Branch column"* when
     the file has a programme column (all sample files do). Otherwise pick the programme.
5. Click **Save Mapping & Run Validation**.
6. Review the **Validation Results** page:
   * the cards show *Total evaluated*, *Valid records*, *Critical errors*, *Warnings* and *Skipped*;
   * use **Errors Only**, **Warnings** or **Duplicates** to filter the table, and **Inspect** to see a row's
     problems.
   * Nothing is saved yet. This is a preview. Use **Re-map Columns** if the mapping was wrong.
7. Click **Confirm & Submit for Review**. The summary shows how many records were added, skipped and flagged,
   and how many review cases were opened. The records now appear in **Student Records**, on **Overview** and,
   if flagged, in **Cases**.

### 4.2 Look at and correct a student (College Staff / Institution Admin)
1. Open **Student Records** and search by name, roll number or the last 4 digits of the APAAR ID.
2. Click a student to open the **Student Record**. The tabs are:
   * **Profile Details**, with *Reconciliation with reference record* when a reference record exists;
   * **Issues & Cases**;
   * **Audit Version History**.
3. To fix data, click **Submit Correction**. You can change the name, APAAR ID, roll number, programme, date of
   birth or gender, and you must enter a reason. Click **Confirm & Save Version**.
   * The record is checked again at once, and the message tells you whether it now passes.
   * The previous version is kept in **Audit Version History**.
4. **Add Student** (on Student Records) adds a single student by hand. It runs the same checks as an upload.
5. **Reveal** next to a masked APAAR ID shows the full number after you give a reason. Every reveal is logged.

### 4.3 Work a review case (College Staff decides)
1. Open **Cases**. Filter by type (**Duplicates**, **Invalid Data**, **Intake Discrepancy**,
   **Reference Mismatch**) or status, or search. Click **Review** on a case.
2. Read the **Case history**, and any matching records with the reason they matched.
3. Add a note in the comment box. Tick **Add as evidence** when the note records evidence you have checked.
4. Decide the case with a reason:
   * **Resolve**: the problem is fixed. This is only allowed when the record now passes its checks, so correct
     the record first.
   * **Dismiss — not an issue**: the flag was wrong, for example two genuinely different students. It is not
     offered for definite data errors such as a missing APAAR ID; those must be corrected.
5. A case marked **Awaiting evidence** cannot be decided until evidence is added (step 3).

### 4.4 Review possible duplicates
**Duplicate Review** lists every duplicate case. Select one to see:
* why the pair was selected;
* a field-by-field comparison with the other record.

Details of a record at another college show as *Hidden* to college users. Use **Open case to record a decision**
to decide it.

### 4.5 Check intake
**Intake Reconciliation** shows, for each programme:
* the reference total;
* the number enrolled;
* the difference;
* the outcome.

*Potential discrepancy — review required* means enrolment is above the reference. It is a reason to review,
not a finding.

### 4.6 Reports and audit
* **Reports & Exports**: enrolment summary, discrepancy list, data-quality summary and institution matrix.
  **Export CSV** downloads a spreadsheet-safe file with masked IDs.
* **Audit Trail** (Admin, Reviewer): who did what, when and why.
* **Enrolment Record** (on a student page): a printable record with a QR code, verifiable at `/verify/<id>`
  without signing in.

### 4.7 Institution Admin tasks
* **Cases** → open a case → **Assigned to** → pick a staff member → **Save**.
* Decide cases that a reviewer has **escalated**.
* **Users & Roles**: add accounts and see what each role can do.
* **Validation Rules**: choose which extra fields are required and adjust the age and date rules.
* **Institution & Programmes**: college profile and programme seat figures.
* **Review Monitoring**: recent decisions, escalations and recurring data problems.

### 4.8 Oversight Reviewer tasks
* See every college's records, cases, reports and the audit trail.
* On an open case:
  * **Mark awaiting evidence**, with a note of what is needed;
  * **Escalate**, to send it to the college's Institution Admin.
* On a closed case: **Request re-review**, which reopens it with a reason.
* The reviewer cannot upload, correct records or decide cases.

---

## 5. Sample files

The sample files are in `demo-data/` and are also downloadable on **Bulk Import**. Sign in as College Staff
(Ilampirai) unless noted.

| File | Rows | Programme | What it shows |
|---|---|---|---|
| `students_valid.csv` | 60 | IT | Clean file: 60 added, 0 cases |
| `students_missing_apaar.csv` | 40 | MCA | 5 missing APAAR IDs, including **Vihaan Sharma, IIT25MCA004**; correct him with test value `110200000004` |
| `students_invalid.csv` / `.xlsx` | 30 | AI & DS | Rows 1–12 each have a data error or warning |
| `students_duplicates.csv` | 34 | CSBS | Repeated row, reused roll number, same name + DOB, APAAR active at another college, one APAAR on two rows |
| `students_reconciliation.csv` | 16 | M.Tech CSE | Rows 3, 6, 9, 12 differ from their reference record |
| `students_intake_overflow.csv` | 18 | Mechanical | Last 3 rows go over the intake reference (on fresh data only) |
| `students_other_institution.csv` | 50 | MCA (Tamravarni) | Sign in as `staff.tce@college.edu.in`; shows that colleges can't see each other's data |

Expected results for every row are in `demo-data/demo_scenarios.csv` and `demo-data/review_cases.csv`.
The full demonstration script is in [`docs/SIH_DEMO_GUIDE.md`](docs/SIH_DEMO_GUIDE.md).

**Your own file** needs a header row with at least the student name, APAAR ID, date of birth and roll number.
Programme, gender, admission date, status, category, email and phone are optional. Dates are read day-first:
`12/05/2004` is 12 May 2004.

---

## 6. Who can do what

All of these rules are enforced by the server, not just hidden in the screens.

| Action | College Staff | Institution Admin | Oversight Reviewer |
|---|:-:|:-:|:-:|
| Upload, validate and submit files | ✓ | ✓ | — |
| Correct records / add a student | ✓ | ✓ | — |
| Reveal a full APAAR ID (with reason) | ✓ | ✓ | — |
| Resolve or dismiss cases | ✓ | ✓ | — |
| Decide escalated cases | — | ✓ | — |
| Assign cases | — | ✓ | — |
| Mark a case awaiting evidence | ✓ | ✓ | ✓ |
| Escalate a case | — | ✓ | ✓ |
| Request re-review of a closed case | — | — | ✓ |
| Users & Roles, edit Validation Rules | — | ✓ | — |
| Audit Trail, Review Monitoring | — | ✓ | ✓ |
| See other colleges' data | — | — | ✓ |

---

## 7. Checks the system runs

| Code | Severity | Meaning |
|---|---|---|
| `MISSING_REQUIRED` | Error | Name, APAAR ID, date of birth, programme or a field your rules require is empty |
| `FMT_APAAR` | Error | APAAR ID is not exactly 12 digits (format only, not identity verification) |
| `FMT_DOB` | Error / warning | Date of birth in the future or implausible for admission |
| `DATE_INCONSIST` | Error | Admission date before birth or in the future |
| `FMT_GENDER`, `FMT_EMAIL` | Warning | Unrecognised gender value or malformed email |
| `DUP_APAAR_SAME` | Error | Same APAAR ID on two records in this college |
| `DUP_APAAR_CROSS` | Error | APAAR ID already active at another college |
| `DUP_ROLL` | Error | Same roll number for two different students |
| `POSSIBLE_DUP_PERSON` | Warning | Same name and date of birth as another record |
| `REF_MISMATCH` | Warning | Details differ from the reference record |
| `INTAKE_EXCEED` | Error | Rows that take a programme over its intake reference |
| `SKIP_DUP_ROW`, `SKIP_EXISTING` | Info | Exact repeat in the file, or already on record. Not imported again |

A flag is a reason to review, not proof of a duplicate or of wrongdoing.

---

## 8. Case statuses

**Open** → **Under review** → **Resolved** or **Dismissed**. Along the way:

* **Awaiting evidence**: no decision is allowed until evidence is added.
* **Escalated**: the Institution Admin decides.

A reviewer can reopen a closed case with **Request re-review**.

---

## 9. Tests

From `backend/`:

```bash
pip install -r requirements-dev.txt
python -m pytest tests -q              # 34 automated tests on a temporary database
python scripts/demo_e2e.py             # every demo scenario end to end; expect "69/69 checks passed"
```

Both use their own throwaway database and never touch `apaar_reconx.db`. GitHub Actions runs the frontend
build and the tests on every push to `main`. Results are in [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md).

---

## 10. Reset the demo data

* **Live site:** restart or redeploy the service on Render, which re-creates the starting data. The free
  plan also resets whenever the service sleeps after about 15 idle minutes, so import demo files shortly
  before presenting.
* **Local:** stop the server, then from `backend/` run `python scripts/reset_local_demo.py`. It asks you to
  confirm, and refuses to touch a production or non-SQLite database.

Details: [`docs/DEMO_RESET.md`](docs/DEMO_RESET.md).

---

## 11. Deployment

* **Render:** `render.yaml` is a ready blueprint. Use **New + → Blueprint** and choose this repository. Each
  push to `main` redeploys automatically. Render generates `SECRET_KEY`.
* **Docker:** see `Dockerfile` and `docker-compose.yml`.

| Setting | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Database (SQLite file or PostgreSQL URL) | `sqlite:///./apaar_reconx.db` |
| `JWT_SECRET` or `SECRET_KEY` | Token signing key: **set this in production** | development value |
| `SEED_ON_STARTUP` | Fill an empty database with starting data | `true` |
| `PUBLIC_BASE_URL` | Base URL used in certificate QR codes | empty |

---

## 12. Project structure

```
backend/
  app/
    routers/      API endpoints (auth, submissions, students, cases, reports, rules, oversight…)
    services/     validation engine, case manager, reports, file processing
    models/       database tables
    seed/         starting data and sandbox reference records
  scripts/        demo_e2e.py, generate_demo_dataset.py, reset_local_demo.py
  tests/          pytest suite
frontend/
  src/pages/      one file per screen
  src/components/ shared UI
  public/samples/ downloadable sample files
demo-data/        sample upload files and expected results
docs/             spec, demo guide, test report, reset procedure
```

---

## 13. Limitations

* There is no live connection to APAAR, DigiLocker, AISHE or AICTE. IDs are format-checked, and reference data is
  a fictional sandbox dataset.
* There are no email or SMS notifications.
* Evidence is recorded as notes; there is no document upload.
* Imports never update existing records. Changes go through **Submit Correction**.
* OCI and foreign-national seats are not tracked separately in the intake reference.
* The demo deployment uses SQLite and resets on restart. Production should use PostgreSQL.
* Prototype accounts use fixed passwords. Government SSO is not implemented.

---

## 14. More documentation

* [`docs/SIH_DEMO_GUIDE.md`](docs/SIH_DEMO_GUIDE.md): demonstration script, talking points and judge Q&A
* [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): what was tested and the results
* [`docs/DEMO_RESET.md`](docs/DEMO_RESET.md): resetting the live and local data
* [`demo-data/README_SYNTHETIC_DATA.md`](demo-data/README_SYNTHETIC_DATA.md): how the sample data is built
* [`docs/spec.md`](docs/spec.md): full product specification

Developed for Smart India Hackathon 2026 (SIH26263). Registry adapters are simulated; no government system is
contacted.
