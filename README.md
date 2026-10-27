# APAAR ReconX — AICTE Student Data Management & Verification Platform

> **Smart India Hackathon 2026** · Problem Statement ID: **SIH26263**  
> **Full-Stack Working Prototype** · Python FastAPI + PostgreSQL/SQLite + React + TypeScript + Vite + Tailwind CSS

---

## 🌟 Executive Summary

**APAAR ReconX** is an enterprise-grade reconciliation and verification platform developed for the **All India Council for Technical Education (AICTE)**. It addresses the critical challenges in managing the **Automated Permanent Academic Account Registry (APAAR)**:
1. **Automated Discrepancy Detection**: Validates APAAR formats (12 digits), checks for intra-file duplicates and cross-institutional dual admissions.
2. **Intake Reconciliation**: Enforces sanctioned seat quotas against institutional program capacity in real-time.
3. **Audited Correction Workflow**: Immutable versioning preserves every historical change with mandatory justification rationale.
4. **Adjudication Queue**: Full lifecycle case management for authorized officers with chronological event timelines.
5. **Simulated Registry Connectors**: Safe demonstration adapters for APAAR NDEAR, DigiLocker NAD, AICTE EoA, and AISHE.
6. **Statutory Reporting & Certificates**: Exportable discrepancy audits, compliance ratings, and verifiable QR-coded enrollment certificates.

---

## 🧭 The 12 Prototype Screens

| Screen # | Screen Name | Route | Core Functionality |
|---|---|---|---|
| **Screen 1** | **Login Portal** | `/login` | AICTE branded portal with 1-click demo role switcher (Admin, Staff, Reviewer) |
| **Screen 2** | **Institution Dashboard** | `/dashboard` | 4 metric stat cards, Enrollment vs Intake capacity bars, status donut chart, recent audit feed |
| **Screen 3** | **Student Data Upload** | `/upload` | 4-step wizard, drag-and-drop CSV/XLSX upload, schema checklist, downloadable test CSV template |
| **Screen 4** | **Column Mapping** | `/mapping` | Auto-detected header matching, schema dropdown selectors, live 3-row sample preview |
| **Screen 5** | **Validation Results** | `/validation` | Real-time deterministic rule engine results, severity tabs, APAAR format & duplicate counters, batch finalization |
| **Screen 6** | **Student Record Details** | `/students/:id` | Student profile, cross-institution duplicate alert banner, issue breakdown, audit version history, correction modal |
| **Screen 7** | **Verification Cases** | `/cases` | Adjudication queue, priority badges (Critical, High, Medium), timeline comments, assign, resolve & reject |
| **Screen 8** | **Reports & Analytics** | `/reports` | Sanctioned vs actual utilization table, full discrepancy audit, AICTE compliance score (out of 100), CSV export |
| **Screen 9** | **External Integrations** | `/integrations` | APAAR, DigiLocker, AICTE, AISHE simulated cards with interactive live query testing modal |
| **Screen 10** | **User Management** | `/users` | Role-based access control (RBAC), multi-tab user directory, new account creation modal |
| **Screen 11** | **Institution Settings** | `/settings` | AICTE permanent ID profile, programme sanctioned intake seat matrix, academic calendar, security settings |
| **Screen 12** | **Certificate Preview** | `/certificate` | Official AICTE Student Enrollment Certificate layout, digital QR code verification, PDF print layout |

---

## 👥 Demo Access Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **College Administrator** | `admin@college.edu.in` | `admin123` | Institutional uploads, settings, staff management, compliance |
| **Admissions Staff** | `staff@college.edu.in` | `staff123` | Batch upload, column mapping, record correction |
| **AICTE Verification Officer** | `officer1@aicte.gov.in` | `officer123` | Central review queue, cross-institutional dispute adjudication, compliance |

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
   ├── DUP_APAAR_CROSS    : Possible cross-institution active enrollment (sent for AICTE review)
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
| College Admin (`admin` + institution) | Own institution only: data, settings, staff accounts |
| Admissions Staff (`institution_user`) | Own institution only: upload, map, correct records, comment on cases |
| AICTE Verification Officer (`reviewer`) | All institutions; **only role that can assign, resolve or reject verification cases** |
| AICTE Admin (`admin`, no institution) | Platform-wide administration |

- APAAR IDs are masked (`1234-****-9012`) in list views, case queues and reports; the full ID is shown only on the authorised record detail page and on the certificate.
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
Developed for the **Smart India Hackathon 2026** (Problem Statement: SIH26263). All government registry adapters (APAAR, DigiLocker, AICTE, AISHE) are mock interfaces for demonstration purposes.

