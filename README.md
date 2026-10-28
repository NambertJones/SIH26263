# APAAR ReconX — Student Data Validation & Reconciliation Prototype (SIH26263)

> **Smart India Hackathon 2026** · Problem Statement ID: **SIH26263**  
> **Full-Stack Working Prototype** · Python FastAPI + PostgreSQL/SQLite + React + TypeScript + Vite + Tailwind CSS

---

## 🌟 Executive Summary

> **Independent working prototype. Not an official AICTE or APAAR portal. Uses synthetic data; external registry checks are simulated.** It is not affiliated with, endorsed by or developed for AICTE, the Ministry of Education, APAAR, DigiLocker or AISHE.

**APAAR ReconX** is a hackathon prototype for the SIH26263 problem statement (student data management and verification for AICTE-approved institutions, keyed on the APAAR ID). Its features:
1. **Automated Data Checks**: APAAR ID format check (12 digits — format only, not identity verification), duplicate checks within a file, and flags for possible duplicate enrolments across institutions for human review.
2. **Intake Reconciliation**: Compares enrolled counts with an intake reference per programme and flags potential discrepancies for review (it does not enforce quotas).
3. **Audited Correction Workflow**: Immutable versioning preserves every historical change with mandatory justification rationale.
4. **Review Queue**: Case management for oversight reviewers with chronological event timelines.
5. **Simulated Registry Connectors**: Local mock adapters standing in for APAAR, DigiLocker / NAD, AICTE approval and AISHE lookups. No government system is connected.
6. **Reports & Prototype Records**: Exportable discrepancy lists, a data-quality summary (counts only, no compliance score), and QR-coded prototype enrolment records marked "not an official document".

---

## 🧭 The 12 Prototype Screens

| Screen # | Screen Name | Route | Core Functionality |
|---|---|---|---|
| **Screen 1** | **Login Portal** | `/login` | Prototype login with disclaimer and 1-click role switcher for the synthetic accounts (Admin, Staff, Oversight Reviewer) |
| **Screen 2** | **Institution Dashboard** | `/dashboard` | 4 metric stat cards, Enrollment vs Intake capacity bars, status donut chart, recent audit feed |
| **Screen 3** | **Student Data Upload** | `/upload` | 4-step wizard, drag-and-drop CSV/XLSX upload, schema checklist, downloadable test CSV template |
| **Screen 4** | **Column Mapping** | `/mapping` | Auto-detected header matching, schema dropdown selectors, live 3-row sample preview |
| **Screen 5** | **Validation Results** | `/validation` | Real-time deterministic rule engine results, severity tabs, APAAR format & duplicate counters, batch finalization |
| **Screen 6** | **Student Record Details** | `/students/:id` | Student profile, cross-institution duplicate alert banner, issue breakdown, audit version history, correction modal |
| **Screen 7** | **Verification Cases** | `/cases` | Adjudication queue, priority badges (Critical, High, Medium), timeline comments, assign, resolve & reject |
| **Screen 8** | **Reports & Analytics** | `/reports` | Intake reference vs enrolled table, discrepancy list, data-quality summary (counts only), CSV export |
| **Screen 9** | **External Integrations** | `/integrations` | APAAR, DigiLocker, AICTE, AISHE mock adapter cards with a simulated test modal (results labelled SIMULATED) |
| **Screen 10** | **User Management** | `/users` | Role-based access control (RBAC), multi-tab user directory, new account creation modal |
| **Screen 11** | **Institution Settings** | `/settings` | Institution profile, programme intake reference (synthetic), admission calendar dates, security notes |
| **Screen 12** | **Certificate Preview** | `/certificate` | Prototype enrolment record (marked not an official document), QR link to the prototype record check, PDF print layout |

---

## 👥 Synthetic Access Accounts

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Institution Admin** | `admin@college.edu.in` | `admin123` | Configures the platform: institution profile, programmes, users, validation rules; assigns cases; decides escalated cases; audit and oversight views |
| **College Staff** | `staff@college.edu.in` | `staff123` | Main working role: uploads and validates files, investigates flagged records, resolves or dismisses cases with reasons, corrects records |
| **Oversight Reviewer** | `reviewer@reconx.in` | `reviewer123` | Monitors all institutions: reviews decisions and audit history, escalates cases, requests re-review. Cannot edit records or decide cases |

*Note: You can also use the one-click quick-login buttons on the login screen or in the top navigation bar to switch roles instantly.*

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ (Tested on Node v24)

### 1. Launch Backend API Server
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
# Windows:
.venv\Scripts\activate

# Or run directly with the virtualenv Python:
.venv\Scripts\python.exe run.py
```
- Backend will start at: `http://localhost:8000`
- Interactive OpenAPI / Swagger Docs: `http://localhost:8000/docs`
- *Note: On startup, the backend automatically initializes the database and populates ~120 synthetic students, verification cases, and audit logs.*

### 2. Launch Frontend Client
```bash
# Open a new terminal in frontend directory
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite dev server
npm run dev
```
- Frontend application will open at: `http://localhost:5173`

---

## 🛡️ Architecture & Verification Rules

```
[ CSV / Excel Upload ]
         ↓
[ File Processor & Auto-Mapping ]
         ↓
[ Deterministic Validation Engine ]
   ├── MISSING_REQUIRED   : Mandatory name, APAAR, DOB
   ├── FMT_APAAR          : Exact 12-digit numeric validation
   ├── FMT_DOB            : Future dates, implausible age (<15 error, 15 warning)
   ├── DATE_INCONSIST     : Enrollment date before DOB / in the future
   ├── FMT_GENDER/EMAIL   : Format warnings
   ├── DUP_APAAR_SAME     : Intra-file duplicate APAAR detection
   ├── DUP_APAAR_CROSS    : Possible cross-institution active enrollment (sent for oversight review)
   └── INTAKE_EXCEED      : Cumulative check against approved + supernumerary/NRI seats,
                            counting all finalized submissions for the programme
         ↓
[ Automated Verification Case Generation ]
         ↓
[ Reviewer Adjudication & Immutable Versioned Audit Trail ]
```

---

## 🔐 Access Control & Privacy

| Role | Scope |
|---|---|
| Institution Admin (`admin` + institution) | Own institution: profile, programmes, users, validation rules, case assignment, escalated-case decisions, audit and oversight summary |
| College Staff (`institution_user`) | Own institution: upload/map/validate/submit files, correct records, resolve/dismiss/mark-awaiting-evidence on cases, reveal a full APAAR ID with a reason |
| Oversight Reviewer (`reviewer`) | All institutions, read-only on data: oversight dashboard, audit trail, comment, **escalate** open cases, **request re-review** of closed cases. Cannot decide cases, correct records, upload or reveal full IDs |
| Platform Admin (`admin`, no institution) | Platform-wide administration |

- APAAR IDs are masked (`XXXX-XXXX-9012`) everywhere. College staff and the institution admin can reveal a full ID on the record page after giving a reason; every reveal is audited.
- Certificate QR codes carry only the certificate number. `GET /api/public/verify/{certificate_id}` (UI: `/verify/:id`) lets employers/regulators verify without logging in and returns only masked APAAR, name, institution, programme and status.
- Dates in uploads are read day-first (`12/05/2004` = 12 May 2004).
- Set `JWT_SECRET` (or `SECRET_KEY`) and `PUBLIC_BASE_URL` in production.

---

## ☁️ Cloud Deployment & Production Hosting

### Option 1: Render (1-Click Blueprint Deploy)
The repository includes a ready-to-use [`render.yaml`](render.yaml) blueprint:
1. Log in to [Render.com](https://render.com) using your GitHub account (`NambertJones`).
2. Click **New +** > **Blueprint**.
3. Select this repository (`NambertJones/SIH26263`).
4. Render will automatically build the React frontend and deploy the FastAPI backend inside a unified container with HTTPS enabled.

### Option 2: Docker Container (Local or VPS)
To run the full-stack container locally or on any cloud virtual machine (AWS EC2, DigitalOcean, Linode):
```bash
# Build and run with Docker Compose
docker compose up --build -d
```
The application will be live at `http://localhost:8000`.

### Option 3: Unified FastAPI Static Production Build
You can build the frontend and serve both UI and API from a single Node/Python host:
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Start FastAPI production server
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
FastAPI automatically serves `frontend/dist` for all web pages and mounts all `/api` endpoints seamlessly.

---

## 📄 License & Attribution
Developed for the **Smart India Hackathon 2026** (Problem Statement: SIH26263). All government registry adapters (APAAR, DigiLocker, AICTE, AISHE) are simulated interfaces; no government system is contacted.

