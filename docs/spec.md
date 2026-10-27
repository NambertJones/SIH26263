# APAAR ReconX — Claude Master Prompt v2.1

**SIH26263 · APAAR ID-Based Student Data Management & Verification Platform**

Build specification for Claude Code. Version 2.1 — 27 Oct 2026 (adds UI audit, backend gaps, full UI spec, production readiness). Supersedes v1 (`Complete_Claude_Master_Prompt_APAAR_ReconX_SIH26263.docx`).

> **How to use.** Keep this file at `docs/spec.md` in the repository and point to it from `CLAUDE.md` ("The project specification is `docs/spec.md`; read it before planning any change"). Do not paste it into chat — a file in the repo survives context compaction across long sessions. Start a session with: *"Read docs/spec.md. Do §0 and §27 first, then implement the next unfinished P0 item."*

### What changed from v1

| Area | v1 | v2 |
|---|---|---|
| Brief coverage | Missed consent (#8), third-party verification (#5), certificates (#10), machine APIs (#7); NRI/OCI/FN/supernumerary only implied (#2) | All ten brief requirements mapped to modules (§3) |
| Status vocabularies | Same concept named differently in §5/§8/§12/§13/§14/§15 | One canonical enum appendix (Appendix A); every section references it |
| APAAR format | "Do not invent" → defaulted to not configured | 12-digit numeric length check, sourced to the brief/APAAR FAQ; no checksum assumed (§12) |
| Matching vs encryption | Encrypt "where feasible" *and* exact-match — incompatible | AES-GCM ciphertext + keyed HMAC blind index (§10.3) |
| Auth | JWT vs cookie undecided | httpOnly cookie session + CSRF token (§18.1) |
| Long jobs | "Validation Running" with no job model | FastAPI `BackgroundTasks` + persisted job rows (§9) |
| Candidates vs cases | Relationship undefined | Candidate → case lifecycle defined (§13.5) |
| Endpoints | Users, reveal, templates, consent, verifier, certificate missing | Complete route table (§16) |
| Scope | 10 phases, all equal weight | P0 / P1 / P2 priorities and a time-boxed plan (§2, §24) |
| Existing prototype | "Preserve working code" with no conflict rule | Explicit precedence rule, conflict list, UI audit (21 items) and backend gaps (8 items) (§0.2–§0.4) |
| UI specification | Detailed per-screen spec | v1 detail restored and mapped onto existing pages, plus shared components, nav-by-role table and real-world UI readiness (§17) |
| Real-world readiness | Production blockers listed briefly | Production-readiness table: legal, SSO, hosting, VAPT, incident response, keys, backups, scale, language (§21.1) |

---

## MASTER PROMPT — START

## 0. Existing repository and precedence rules

A working prototype already exists at the repository root (`backend/` FastAPI + SQLAlchemy, `frontend/` React + TypeScript + Vite + Tailwind, Render/Docker deploy files). It is the base. **Do not create a second app.**

### 0.1 Precedence

1. **This specification's truthfulness, privacy and security rules (§5, §12, §17.2, §18, §21) override existing code.** Where existing code conflicts with them, fix the code; do not preserve it.
2. Otherwise, **preserve working code and existing conventions** (file layout, naming, component library). Extend rather than rewrite.
3. Where this spec and the repo disagree on a non-safety design choice (e.g. table names), keep the repo's choice and record the deviation in `docs/deviations.md`.

### 0.2 Known conflicts to fix (observed in the current repo — re-verify before changing)

| # | Observed in repo | Required change | Priority |
|---|---|---|---|
| C1 | Login page and copy say "AICTE branded portal", "developed for AICTE", "Official AICTE Student Enrollment Certificate" | Use APAAR ReconX branding. Certificate becomes "Prototype Enrolment Record — not an official document". Add the global disclaimer (§17.2). No government emblems. | P0 |
| C2 | Demo accounts use `@aicte.gov.in` addresses; credentials in README; Render deployment configured | Use `@demo.reconx.test` addresses. Seed passwords from env (`DEMO_PASSWORD`), never in README. Public deploy only in restricted demo mode (§21). | P0 |
| C3 | "AICTE compliance score (out of 100)" in Reports | Remove. Replace with traceable counts (open cases, discrepancy cases, data-quality rule pass rates) with formula shown. | P0 |
| C4 | Copy says intake is "enforced"; dual admissions "detected" | Use Appendix A outcomes: "Potential discrepancy — review required", "Possible duplicate enrolment — review required". | P0 |
| C5 | `students.apaar_id` stored as plaintext `String(12)` | Encrypt + blind index per §10.3; migrate seed data. | P0 |
| C6 | `students` collects `date_of_birth`, `gender`, `email`, `phone`, social `category` with no stated purpose | Keep only fields justified in the data dictionary (§10.4). Social category (General/OBC/SC/ST/EWS) is removed unless an intake rule needs it; seat type (NRI/OCI/FN/supernumerary) is a separate field. DOB: see §13.2. | P0 |
| C7 | `students` carries `programme_id`, `enrollment_status`, `enrollment_date` — identity and enrolment mixed | Move enrolment facts to `enrolments`; `students` = identity only (§10.2). | P1 |
| C8 | Access token in `localStorage` | httpOnly cookie session + CSRF (§18.1). | P0 |
| C9 | Three roles (Admin, Staff, Officer) | Map to §6 roles: College Administrator → Institution Admin; Admissions Staff → Data Operator; AICTE Verification Officer → Oversight Officer (demo). Add Auditor, System Admin, Student (demo), Verifier. | P0 (map) / P1 (new roles) |
| C10 | No automated tests | Add `backend/tests/` with pytest; P0 test list in §19. | P0 |
| C11 | Integrations page shows "live query testing" against APAAR/DigiLocker/AICTE/AISHE | All connectors show `DEMO_MOCK` or `NOT_CONFIGURED` (Appendix A.9); results stamped SIMULATED. | P0 |
| C12 | README "Validates APAAR formats (12 digits)" without provenance | Keep the rule; cite source in `docs/source-register.md`; UI label "Format check only". | P0 |
| C13 | SQLite in dev, Postgres optional | Keep SQLite for local demo if it works; PostgreSQL in docker-compose/deploy. All SQL must be portable (no SQLite-only types). | P2 |

Existing pages to keep and adapt: Login, Dashboard, Student Data Upload, Column Mapping, Validation Results, Student Records List, Student Record Details, Verification Cases, Reports, Integrations, User Management, Institution Settings, Certificate Preview, Public Verify.

### 0.3 UI audit of the current frontend (27 Oct 2026)

File paths are relative to `frontend/src/`. Re-verify each item before changing it; line numbers drift.

| # | Where | Finding | Required change | P |
|---|---|---|---|---|
| U1 | `components/layout/Header.tsx` | Subtitle "AICTE Student Verification Platform"; no disclaimer; "Simulated Government Adapters Active" pill is the only demo signal | Subtitle "Independent prototype"; add the global disclaimer bar and the `DEMO MODE` chip (§17.2) | P0 |
| U2 | `Header.tsx`, `contexts/AuthContext.tsx` | One-click role switcher logs in with **hardcoded passwords shipped in the JS bundle** (`admin123`, `staff123`, `officer123`) | Show the switcher only when the backend reports `PUBLIC_DEMO=false` and `ENV=development`; backend issues demo sessions through a dev-only endpoint; no passwords in frontend code | P0 |
| U3 | `pages/LoginPage.tsx` | Emoji role icons ("🔍 AICTE Reviewer"); "Official Email ID"; footer "AICTE Prototype Portal"; disabled Parichay/MeriPehchaan SSO button with no reason | Lucide icons; "Email"; footer with disclaimer; SSO button shows "Not available in prototype — requires government SSO onboarding" | P0 |
| U4 | `pages/ReportsPage.tsx` | "AICTE Compliance Rating" tab with score out of 100; status **defaults to `COMPLIANT` when data is missing**; "APAAR ID Biometric Linkage Compliance … authenticated with NDEAR registry" | Remove the tab and score (C3). Replace with traceable counts. Remove every biometric/NDEAR authentication claim | P0 |
| U5 | `pages/InstitutionSettingsPage.tsx` | Security panel claims "Enforce mandatory APAAR UIDAI biometric link — Enforced (Demo)" | Remove. Show only controls that actually exist, each linked to its test | P0 |
| U6 | `pages/StudentRecordDetailsPage.tsx`, `pages/CertificatePreviewPage.tsx` | **Full APAAR ID rendered unmasked**; DOB, email, phone displayed; no reveal action | Mask by default (`XXXX-XXXX-1234`); audited "Reveal" with reason for permitted roles; remove fields dropped by C6 | P0 |
| U7 | `lib/privacy.ts` `maskApaar` | Shows first 4 **and** last 4 digits (8 of 12); malformed values shown in full | Last 4 only; malformed values shown as "Invalid format (n chars)" | P0 |
| U8 | All API list calls | Backend returns full `apaar_id` to the browser; masking is client-side only | Backend returns `apaar_masked` + `apaar_status` only; full value only from the audited reveal endpoint | P0 |
| U9 | `pages/DashboardPage.tsx` | Academic-year selector changes state but **is not sent to the API** (fake filter); fetch errors are swallowed so the page shows zeros; stat cards not clickable; "% compliance verification" wording | Pass year to API; error banner with retry; cards link to filtered lists; neutral wording ("records passing all checks") | P0 |
| U10 | `DashboardPage.tsx` intake bars | Total enrolled vs total intake; no seat type, source, freshness or "cannot determine" state | Per-seat-type rows using `IntakeOutcome`; show source and as-of date | P0 |
| U11 | All pages | Errors go to `console.error` / `alert()`; no error, empty or forbidden states in most pages | Shared `ErrorBanner`, `EmptyState`, `Forbidden` components and toast notifications | P0 |
| U12 | List pages (`StudentRecordsListPage`, `ValidationResultsPage`, `VerificationCasesPage`) | Hard `limit: 100`, no pagination, silent truncation; search fires on every keystroke | Server pagination with total count; 300 ms debounced search; filters in URL query string so views are shareable | P0 |
| U13 | `components/ui/Modal.tsx` | No `role="dialog"`, `aria-modal`, `aria-labelledby`; no focus trap or focus return; close button has no accessible name | Accessible dialog (focus trap, restore focus, labelled), or adopt Radix/shadcn Dialog | P1 |
| U14 | `components/layout/Sidebar.tsx` | Developer screen numbers "S2…S12" shown; fixed 256 px width, no collapse or mobile menu; "User Management" and "Certificate" shown to roles that cannot use them; "AICTE Central Review" label | Remove screen numbers; collapsible sidebar + mobile drawer; nav driven by the §6 permission matrix; label "Oversight workspace" | P0 (labels) / P1 (responsive) |
| U15 | `App.tsx` | Upload and Column Mapping are separate nav pages instead of one wizard; unknown routes silently redirect to dashboard; no page titles | Single 5-step import wizard (§17.5); 404 page; `document.title` per route | P1 |
| U16 | `pages/StudentDataUploadPage.tsx` | Template file named `AICTE_Student_Admission_Template.csv`; sample rows use realistic 12-digit APAAR values and real-looking names/emails/phones; "As per official 10th / Aadhaar record" | `ReconX_Student_Enrolment_Template_SYNTHETIC.csv`; sample APAAR values start with `9999`; remove Aadhaar reference | P0 |
| U17 | `pages/ColumnMappingPage.tsx` | "Map CSV Columns to AICTE Standard Schema" — no such official schema exists | "Map columns to the ReconX template" | P0 |
| U18 | `components/ui/StatusBadge.tsx` | Free-text status mapping; different statuses collapse to the same label ("Pending"); not driven by Appendix A | One badge component keyed by Appendix A codes with label, colour **and** icon | P0 |
| U19 | `pages/IntegrationsPage.tsx` | "In accordance with AICTE SIH rules…" (unsourced); "APAAR NDEAR" naming; live-test modal looks like a real query | Remove the unsourced claim; label every result `SIMULATED` | P0 |
| U20 | Global | Loading uses a full-page spinner; no skeletons; no `aria-live` for job progress; colour-only cues in some tables | Skeleton rows; `aria-live="polite"` for import/matching progress; text + icon on every status | P1 |
| U21 | Global | English only | Bilingual-ready (§17.7): extract strings to an i18n file; Hindi as the second language for the demo shell | P2 |

### 0.4 Backend readiness gaps (27 Oct 2026)

| # | Where | Finding | Required change | P |
|---|---|---|---|---|
| B1 | `backend/app/main.py` | `allow_origins=["*"]` with `allow_credentials=True`; `settings.CORS_ORIGINS` is defined but unused | Use `settings.CORS_ORIGINS`; never `*` with credentials | P0 |
| B2 | `backend/app/config.py` | `JWT_SECRET` falls back to a known default string; 8-hour tokens | Fail startup if the secret is missing or equals the default outside local dev; 30-minute access + refresh (or session per §18.1) | P0 |
| B3 | `backend/app/routers/certificate.py` | Certificate ID = `AICTE-APAAR-<year>-<first 8 hex of UUID>` (32 bits, guessable pattern, "AICTE" prefix); public verify not consent-gated, not revocable, not rate-limited | Random 128-bit token linked to a consent grant (§8.10); prefix `RECONX-`; rate limit; audit each check | P1 (P0: rename prefix) |
| B4 | `backend/app/config.py` | `.xls` allowed (legacy binary format, extra parser surface) | Allow `.csv`, `.xlsx` only | P0 |
| B5 | `routers/submissions.py` | Size checked after reading the whole file into memory; no row limit | Stream with a byte cap; enforce `MAX_ROWS` | P1 |
| B6 | Backend generally | No request IDs, no structured logging, no `/ready` | Request-ID middleware, JSON logs without PII, `/health` + `/ready` (DB check) | P1 |
| B7 | `backend/apaar_reconx.db`, `backend/uploads/` | Runtime DB and uploads live inside the app directory | Paths from env; uploads outside web root; raw files deleted per retention (§10.6) | P1 |
| B8 | Dependencies | `requirements.txt` uses `>=` ranges, no lock file; no dependency or secret scanning | Pin versions (`pip-compile` or `uv lock`); `pip-audit` + `npm audit` + gitleaks in CI | P1 |

---

## 1. Role and mission

You are the lead engineer for this prototype: full-stack development, data-quality logic, privacy/security review and test ownership. The developer must be able to explain every design decision to SIH evaluators, so prefer simple, deterministic, documented logic over abstraction or black-box AI.

Build a functional, end-to-end prototype: connected frontend, backend, persistence, validation, case review, consent, verification, reporting, audit, tests and a 3–5 minute demo. Not a UI mockup.

Working name **APAAR ReconX** is an independent prototype. Never imply AICTE, APAAR, ABC, DigiLocker, NAD or Government of India ownership, sponsorship or endorsement.

## 2. Timeline and priorities

| Milestone | Date | What matters |
|---|---|---|
| Idea submission (PPT) | **28 Oct 2026** | Deck + screenshots of P0 flows. No new features the day before — fix the wording-only items C1–C4, C11, U1, U3–U5, U16, U17, U19 so screenshots are honest. |
| Internal hackathon / shortlisting | TBC | All **P0** working end-to-end with tests. |
| Grand finale | TBC | P0 polished, **P1** complete, P2 only if time remains. |

**Priority definitions** (tags appear throughout this spec):

- **P0 — demo spine.** Without it the core story fails: login with roles → upload → validate (APAAR format, missing, in-file duplicate) → cross-institution duplicate case → intake discrepancy case → resolve case with reason → audit trail. Plus honesty fixes (§0.2 P0 items), consent record, tenant isolation, disclaimer, P0 tests.
- **P1 — brief completeness.** Third-party verifier flow, certificate with APAAR ID + QR, institution integration API (API keys), reports/exports with masking, student consent portal, matching evaluation report, accessibility pass.
- **P2 — depth.** Source registry UI, reference-data versioning UI, safe merge with undo, PostgreSQL-only features, CI, advanced charts, research comparison matrix.

Rule: **do not start P1 work while a P0 item is broken.** If a session is time-limited, finish and test one item rather than half-building several.

## 3. Problem and brief traceability

Source: SIH26263 brief (AICTE, Regulation Bureau; Software; Smart Automation). Verify wording against the official SIH portal and record the outcome in the source register. Summary of the problem: AICTE receives student data from approved institutions inconsistently — PGDM institutions submit student-level data yearly; most others report only totals during approval — so AICTE cannot keep complete, verifiable student records. The brief proposes the 12-digit APAAR ID as the unique student key.

| # | Brief requirement | Module(s) | Priority |
|---|---|---|---|
| 1 | Secure platform/API for institutions to upload/update student-level data keyed on APAAR after admissions close | Bulk import (§11), Students & enrolments (§8.4), Integration API (§16.3) | P0 (upload) / P1 (API) |
| 2 | Fields for approved intake, actual enrolment, supernumerary, NRI, OCI, Foreign National, other info | Intake references (§8.3), template columns `seat_type`, `admission_quota` (§11) | P0 |
| 3 | Validation: duplicates, invalid/missing APAAR, admissions above intake, inconsistent data, same student at multiple institutions | Validation (§12), Matching (§13), Cross-institution (§14), Intake (§15) | P0 |
| 4 | Real-time dashboards for AICTE and institutions | Dashboard (§17.4) — "real-time" = query-backed, refreshed on load/after actions | P0 |
| 5 | Secure verification mechanism for AICTE, institutions, employers, other regulators | Verifier role + consent-gated verification (§8.10) | P1 |
| 6 | Verifiable student records linked to academic identity | Student record + verification tokens + provenance (§8.4, §8.10) | P1 |
| 7 | Integration APIs for institutional and AICTE systems | Institution API keys, versioned import API, provider adapters (§16.3, §8.11) | P1 |
| 8 | Security, privacy, auth, RBAC, audit trails, **consent** | §6, §8.9, §18, audit (§8.8) | P0 (RBAC, audit, consent record) / P1 (student consent portal) |
| 9 | Reports for policy-making, accreditation, monitoring | Reports & exports (§8.7) | P1 |
| 10 | APAAR ID alongside student ID on certificates | Certificate record + QR verify (§8.10) | P1 |

Expected flow (brief): Institution → Student data upload → APAAR validation → Data verification → Central repository → Analytics & monitoring → Authorised verification. The demo (§20) follows this flow.

## 4. Scope

**In scope:** everything mapped in §3, provider adapters with labelled mock providers, rule-based explainable matching.

**Out of scope unless separately authorised and proven feasible:**
- Bypassing any login, CAPTCHA, rate limit or access control; scraping personal data; using real or leaked student records.
- Claiming live APAAR/ABC/DigiLocker/AICTE integration without documented API, credentials, authorisation and a successful test.
- Automatically declaring fraud, invalidity or ineligibility from a score or discrepancy.
- Automatic merging of records.
- Treating AISHE directory presence as proof of current AICTE approval.

**Assumptions to confirm (record in `docs/assumptions.md`):** official problem wording; academic-year format; intake/supernumerary rules per programme type; APAAR consent requirements (the APAAR FAQ states parental consent for minors — verify current text).

## 5. Evidence and truthfulness rules

Maintain `docs/source-register.md`. For each source: title, organisation, URL, date checked, access outcome (HTTP status / error observed), what it actually confirms, effective date, limitations. Never invent quotes, API routes, paper details, approval statuses or dataset contents.

Sources to check (record outcome even if unreachable):
- SIH portal problem statement page for SIH26263
- AICTE: https://www.aicte.gov.in/ · Approval Process Handbook 2024–27: https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf · Approval dashboard: https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php#!/approved
- APAAR: https://apaar.education.gov.in/ · FAQs: https://apaar.education.gov.in/faqs · Privacy: https://apaar.education.gov.in/privacy-policy · Terms: https://apaar.education.gov.in/termsofuse
- ABC: https://www.abc.gov.in/ · NAD: https://nad.digilocker.gov.in/ · DigiLocker: https://www.digilocker.gov.in/
- AISHE: https://aishe.gov.in/ · HE Directory: https://dashboard.aishe.gov.in/hedirectory/
- Digital Personal Data Protection Act, 2023 (for consent/purpose-limitation framing; cite the official gazette text)
- GIGW: https://guidelines.india.gov.in/ · WCAG 2.2: https://www.w3.org/TR/WCAG22/

Research (verify before citing — authors, venue, year, DOI, method, data):
- Elmagarmid, Ipeirotis, Verykios, "Duplicate Record Detection: A Survey" (IEEE TKDE 2007)
- https://www.mdpi.com/2414-4088/6/4/27 · https://link.springer.com/article/10.1007/s41060-018-0129-7 · https://link.springer.com/article/10.1007/s00778-023-00791-3 · https://doi.org/10.1109/INCET64471.2025.11140981

Always separate (a) verified official facts, (b) third-party information, (c) design choices, (d) synthetic data, (e) unresolved assumptions. One failed fetch does not prove a service is unavailable — record the observed outcome and date.

## 6. Roles and permissions

RBAC and tenant scoping are enforced **server-side**. Identity, role and institution scope come from the server session, never from request bodies or query strings. A user changing `institution_id` in a request must get 404 (not 403) for records outside their scope, so record existence is not leaked.

| Role | Scope | Priority |
|---|---|---|
| `SYSTEM_ADMIN` | Accounts, roles, connectors, reference data, settings. No personal-record access by default. | P1 |
| `OVERSIGHT_OFFICER` (demo stand-in for a regulator user) | Cross-institution summaries and cases; every sensitive read audited. | P0 |
| `INSTITUTION_ADMIN` | Own institution: users, records, imports, cases, reports, API keys. | P0 |
| `DATA_OPERATOR` | Own institution: upload, validate, correct permitted fields. | P0 |
| `AUDITOR` | Read-only: records, cases, decisions, provenance, audit log, within assigned scope. | P1 |
| `STUDENT` (demo) | Own record, consent grants/revocations, own certificate. | P1 |
| `VERIFIER` (employer / other regulator, demo) | Verify a record only via a student-issued consent token; sees minimal attested fields. | P1 |

Permission matrix (✔ allowed, ○ own scope only, ✖ denied, M masked only):

| Permission | SYS_ADMIN | OVERSIGHT | INST_ADMIN | OPERATOR | AUDITOR | STUDENT | VERIFIER |
|---|---|---|---|---|---|---|---|
| View dashboard | ✔ (system) | ✔ (all) | ○ | ○ | ○ | ✖ | ✖ |
| View student record | ✖ | M | ○M | ○M | M | own | via token |
| Reveal full APAAR (audited, reason required) | ✖ | ✔ | ○ | ✖ | ✖ | own | ✖ |
| Create/update student & enrolment | ✖ | ✖ | ○ | ○ | ✖ | ✖ | ✖ |
| Upload / commit import | ✖ | ✖ | ○ | ○ | ✖ | ✖ | ✖ |
| Run matching | ✖ | ✔ | ○ (in-institution) | ✖ | ✖ | ✖ | ✖ |
| Review in-institution cases | ✖ | ✔ | ○ | ✖ | read | ✖ | ✖ |
| Review cross-institution cases | ✖ | ✔ | ✖ (sees own side, can add evidence) | ✖ | read | ✖ | ✖ |
| View intake references | ✔ | ✔ | ○ | ○ | ✔ | ✖ | ✖ |
| Edit reference data | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Export masked | ✖ | ✔ | ○ | ✖ | ✔ | ✖ | ✖ |
| Export unmasked (reason required) | ✖ | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Manage users | ✔ | ✖ | ○ | ✖ | ✖ | ✖ | ✖ |
| Manage institution API keys | ✖ | ✖ | ○ | ✖ | ✖ | ✖ | ✖ |
| View audit log | ✔ | ✔ | ○ | ✖ | ✔ | own events | ✖ |
| Configure integrations | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Grant/revoke consent | ✖ | ✖ | ✖ | ✖ | ✖ | own | ✖ |

Responses: 401 unauthenticated, 403 authenticated but lacking permission for an in-scope resource, 404 for out-of-scope resources. Implement permission checks as a single dependency (e.g. `require(permission, scope_resolver)`) so every route uses the same code path.

## 7. User journeys

Each journey lists its priority. Status names come from Appendix A.

**A. Institution setup (P0).** Institution admin signs in, sees only their institution, reviews profile, programmes and intake references with source, academic year and `SourceStatus`. If reference data is missing, offer a controlled CSV import of reference data (marked `IMPORTED_UNVERIFIED`), never invented values.

**B. Bulk import (P0).** Operator downloads template + data dictionary → uploads CSV/XLSX → backend checks extension, content sniffing, size, row limit, encoding, headers → preview with column mapping → validate (background job) → row-level results with code, column, severity, message → confirm → transactional commit → summary + downloadable error report. Re-uploading a file with the same SHA-256 warns and requires explicit confirmation.

**C. Validation and correction (P0).** Filter by `ValidationCode`; detail shows field, masked value, rule + version, provenance, suggested fix. Correction requires a reason; before/after (masked) + actor + time go to audit; validation reruns; history kept.

**D. Duplicate review (P0).** Queue filtered by `MatchBand`, institution, programme, year, age, `CaseStatus`. Case shows side-by-side masked comparison, per-field agreement/disagreement/missing, rule version, why selected. Reviewer records a `ReviewDecision` with reason. Never labels fraud.

**E. Intake reconciliation (P0).** Choose institution, programme, academic year, seat type. Show reference intake, source, effective period, actual count, included statuses, exclusions, difference, formula, outcome (`IntakeOutcome`). A `POTENTIAL_DISCREPANCY` opens a case; it is never called a violation.

**F. Reports and audit (P1; audit view P0).** Filtered reports with generation time, filters, source freshness, `DataMode`, caveats. Exports masked by default; unmasked requires permission + reason. Audit view: searchable chronological events.

**G. Student consent (P1; consent record P0).** Student (demo login) sees their record, which institutions hold it, and active consent grants. They can grant a verifier time-limited access to a defined field set, receive a verification token / QR, and revoke it. For P0, consent is captured at import as a per-record `ConsentStatus` field with source (e.g. "institution attests consent collected on <date>").

**H. Third-party verification (P1).** Verifier opens `/verify`, enters or scans a token. If the token is valid, unexpired, unrevoked and consent covers the requested fields, show the minimal attested fields (name, institution, programme, enrolment status, academic year, masked APAAR, data-as-of date, `DataMode`). Every check is audited and visible to the student. Invalid/expired/revoked tokens show a neutral "cannot verify" message without disclosing why beyond the `VerificationTokenStatus`.

**I. Certificate (P1).** Institution admin generates a prototype enrolment record/certificate for a student showing institution student ID **and** masked APAAR ID, plus a QR linking to `/verify/<token>`. Watermark: "Prototype — not an official document".

**J. Institution API integration (P1).** Institution admin creates an API key (shown once, stored hashed, scoped to institution, revocable). An ERP posts the same payload as the import API; identical validation path; audited as `actor_type=API_KEY`.

## 8. Functional modules

### 8.1 Authentication and sessions (P0)
httpOnly, `Secure`, `SameSite=Lax` session cookie; server-side session or signed short-lived token in the cookie; CSRF token for state-changing requests; bcrypt password hashing (already a dependency); login rate limit; generic failure messages; sign-out invalidates the session. Demo accounts are dev-only and seeded from env.

### 8.2 Institution registry (P0)
Fields: internal ID, source-backed code (only if sourced), name, type, state/district, `SourceStatus`, academic year, provenance. Keep **institution exists**, **AICTE approval**, **programme approval**, **approval validity period** as separate attributes.

### 8.3 Programmes and intake references (P0)
Programme: name, level, mode/campus, active period. Intake reference: institution, programme, academic year, `seat_type`, intake count, source document, effective period, retrieval date, `SourceStatus`, version. Never overwrite — new version per change.

### 8.4 Students and enrolments (P0)
`students` = identity only (UUID, name, APAAR ciphertext + blind index, `ApaarStatus`, `ConsentStatus`, minimal justified fields). `enrolments` = student × institution × programme × academic year × status × seat type × admission quota × dates × source import. One student can have many legitimate enrolments.

### 8.5 Bulk import (P0) — see §11.

### 8.6 Case management (P0)
Case: ID, `CaseType`, `CasePriority`, institution(s), academic year, linked records, evidence/features, assignee, `CaseStatus`, comments, resolution reason, timestamps, immutable event history. Enforce the transition table in Appendix A.6. Reason text required for resolve, dismiss, escalate.

### 8.7 Reports and exports (P1)
CSV/XLSX: import summary, data quality, duplicate candidates, case resolution, intake reconciliation, audit activity, institution coverage. Every report header: generated at, filters, academic year, source freshness, `DataMode`, caveat text. Formula-injection protection: prefix cells starting with `= + - @ \t \r` with `'`.

### 8.8 Audit trail (P0)
Log: logins, imports, corrections, validation runs, case transitions, review decisions, reveals, exports, consent grants/revocations, verification checks, user/role/API-key changes, reference-data and connector changes. Fields: UUID, actor ID, actor type (`USER`/`API_KEY`/`SYSTEM`), role snapshot, action, entity type/ID, timestamp, `AuditOutcome`, request ID, minimal safe metadata. Append-only at the application layer (no update/delete routes; optional hash chain `prev_hash` for tamper evidence — P2). Never log passwords, tokens, secrets, API keys or full APAAR values.

### 8.9 Consent (P0 record / P1 portal)
- P0: `ConsentStatus` per student (`CONSENT_ATTESTED_BY_INSTITUTION`, `NOT_RECORDED`, `WITHDRAWN`), with attestation date and actor. Records with `NOT_RECORDED` are flagged as a validation warning, not rejected.
- P1: `consent_grants` table — student, grantee (verifier org name/email), purpose, field set, created, expires, revoked_at, token hash. Student UI to grant/revoke and see access history. Verification refuses when no active grant covers the request.
- Purpose limitation: each grant names a purpose from a fixed list (employment verification, admission verification, regulatory check).

### 8.10 Verification tokens and certificates (P1)
Token = random 128-bit value, stored hashed, linked to a consent grant, `VerificationTokenStatus`. QR encodes only the verify URL with the token — never the APAAR ID or personal data. The existing `PublicVerifyPage` and `CertificatePreviewPage` are adapted for this.

### 8.11 Provider adapters and integration status (P0 mock / P2 registry UI)
Interface `IdentityProvider.check(apaar_blind_index | apaar_plain, context) -> ProviderResult`. Implementations: `MockApaarProvider` (returns `SIMULATED` results deterministically from seed data), placeholders for real providers that return `NOT_CONFIGURED`. Integration page shows each connector's `ConnectorStatus`, last attempted/successful check, purpose, limitations.

## 9. Architecture and stack

Keep the existing stack: **FastAPI, Pydantic v2, SQLAlchemy 2, SQLite (local) / PostgreSQL (docker/deploy), React + TypeScript + Vite + Tailwind**, Lucide icons. Add only:
- `pytest`, `httpx` (tests) — P0
- `rapidfuzz` (name similarity) — P0
- `alembic` (migrations) — P1; until then, `create_all` + deterministic seed is acceptable and documented
- `slowapi` or a small in-house limiter for login rate limiting — P1
- Frontend tests: Vitest + React Testing Library — P2

State purpose before adding any other dependency.

**Background jobs:** validation, matching and intake runs execute via FastAPI `BackgroundTasks`. Each run is a persisted row (`import_jobs`, `match_runs`, `intake_runs`) with `JobStatus` (Appendix A.10). The UI polls `GET …/{id}` every 2 s until the job reaches a terminal status. No Celery/Redis.

**Layers:** routers (HTTP only) → services (import, validation, matching, reconciliation, consent, verification, reporting, audit) → repositories/queries → models. Provider adapters behind interfaces. One error envelope (§16.1). Request ID middleware.

## 10. Data model

### 10.1 Tables
`users`, `roles`, `user_roles`, `user_institution_scopes`, `institutions`, `institution_reference_versions`, `programmes`, `intake_references`, `students`, `enrolments`, `import_jobs`, `import_row_results`, `validation_results`, `match_runs`, `duplicate_candidates`, `cases`, `case_events`, `consent_grants`, `verification_tokens`, `verification_checks`, `api_keys`, `provider_checks`, `audit_logs`. Keep existing table names where they already cover the same concept (e.g. `submissions` may stay as `import_jobs`; record in `docs/deviations.md`).

### 10.2 Identity vs enrolment
Identity on `students`; everything time- or institution-dependent on `enrolments`. Cross-institution checks compare enrolments of the same identity.

### 10.3 APAAR storage (P0)
- `apaar_ciphertext`: AES-256-GCM (via `cryptography`), key from env `APAAR_ENC_KEY`.
- `apaar_blind_index`: `HMAC-SHA256(APAAR_HMAC_KEY, normalised_apaar)`, indexed. Used for exact matching and lookups. Two different keys.
- `apaar_last4`: for masked display (`XXXX-XXXX-1234`).
- Never put APAAR in URLs, logs, error messages or QR codes.
- **Not globally unique** at the DB level: two rows with the same blind index is exactly what cross-institution detection must find.
- Document key handling in `docs/security-privacy.md` (dev keys in `.env`, production would use a KMS).

### 10.4 Field justification
`docs/data-dictionary.md` lists every column with type, nullability, sensitivity (`PUBLIC`/`INTERNAL`/`SENSITIVE`), purpose, provenance, retention. A field without a stated purpose is removed.

### 10.5 Constraints and indexes
UUID keys everywhere. Canonical candidate pairs (`record_a_id < record_b_id`, unique). Indexes on institution, programme, academic year, statuses, import job, `apaar_blind_index`, matching blocking keys. Imports and case decisions in single transactions.

### 10.6 Retention
Uploaded raw files: deleted after commit or 7 days (configurable). Import row results: kept with the job. Audit logs: retained; personal data in them is minimal by design. Document soft-delete behaviour.

## 11. Import template and validation

### 11.1 Template columns

| Column | Required | Notes |
|---|---|---|
| `institution_code` | Derived from session; optional in file (must match scope if present) | Source-backed only |
| `programme_code` | Required | Must map to a programme for the academic year |
| `academic_year` | Required | `YYYY-YY` (e.g. `2026-27`), second part = first + 1 |
| `student_reference_number` | Required | Institution's own student ID |
| `student_name` | Required | Synthetic in demo |
| `apaar_id` | Required (missing → warning `APAAR_MISSING`, not rejection) | Synthetic in demo |
| `enrolment_status` | Required | `EnrolmentStatus` (Appendix A.11) |
| `admission_date` | Optional | ISO date |
| `seat_type` | Required | `SeatType` (Appendix A.12) |
| `admission_quota` | Optional | Free text from institution, kept for provenance |
| `consent_attested` | Optional | `Y`/`N` → `ConsentStatus` |
| `year_of_birth` | Optional | Only matching tie-breaker; see §13.2 |
| `source_record_reference` | Optional | Institution's system reference |

Provide `data/templates/student_enrolment_template.csv` and `.xlsx`, a synthetic sample with planted errors, and the data dictionary. Sample APAAR values are visibly fake (e.g. start with `9999`) and labelled "not real APAAR IDs".

### 11.2 Rules
- File: allowlisted extension + content sniffing, max size (default 5 MB), max rows (default 10 000), UTF-8/UTF-8-BOM, non-empty, no duplicate/ambiguous headers, no macros (`openpyxl` with `keep_vba=False`, `data_only=True`).
- Record: required fields, academic year format, allowed enums, programme mapping for the year, string length limits, control characters stripped and flagged.
- Identifier: §12.
- In-file duplicates: identical row → `DUPLICATE_ROW_IN_FILE`; same APAAR blind index on different rows → `DUPLICATE_APAAR_IN_FILE`; likely same person without APAAR → `POSSIBLE_DUPLICATE_IN_FILE` (warning).
- Unmappable programme/institution → `UNKNOWN_PROGRAMME` / `SCOPE_MISMATCH`; never attach to a different record silently.

Codes and severities: Appendix A.4. Import job statuses: Appendix A.10. Counts (total, accepted, rejected, warnings, exact duplicates, possible duplicates, skipped) are computed.

## 12. APAAR validation and verification

**Format rule (sourced):** the brief and APAAR public material describe the APAAR ID as a 12-digit number. Implement: strip spaces/hyphens → must be exactly 12 ASCII digits. **No checksum is assumed.** Record the source and date in the source register; if the APAAR FAQ text cannot be fetched, keep the rule but mark its provenance as "SIH26263 brief".

`ApaarStatus` (Appendix A.1) separates format checks from provider verification. A passed format check is labelled **"Format OK — not verified"**. `VERIFIED_BY_PROVIDER` is only set when a real, configured provider returns a positive result; mock results set `SIMULATED_MATCH` / `SIMULATED_NO_MATCH` and are shown with a SIMULATED badge. Detail view: status, check type, provider, time, message, limitations.

## 13. Duplicate detection

### 13.1 Pipeline
Normalise (keep original display value) → block → compare → score → band → create candidate → (P0) open case for `HIGH` and `MEDIUM` bands → human decision → record decision with rule version.

### 13.2 Signals
- APAAR blind index equality — strongest; exact.
- Name similarity — RapidFuzz `token_sort_ratio` on normalised names (lowercase, strip punctuation/titles, collapse whitespace, expand nothing automatically; initials compared separately).
- `year_of_birth` — **optional tie-breaker only**, used when present on both; justified because name-only matching produces many false positives for common Indian names. Full date of birth is not collected.
- Context: programme, academic year, enrolment status, dates.
- Missing values are **not** agreement; they contribute 0 and are listed as "missing".

### 13.3 Blocking
Block on `apaar_blind_index`; for records without APAAR, block on (`name_soundex_or_first4`, `year_of_birth` if present, `academic_year`). Document the choice and its recall trade-off.

### 13.4 Scoring and bands
Weighted, documented, versioned in config (e.g. `matching_rules_v1.yaml`): APAAR exact = auto `HIGH` band; else name ≥ 92 and YOB equal → `MEDIUM`; name ≥ 85 → `LOW`. Scores are **not probabilities**; bands are review priorities (`MatchBand`, Appendix A.5). Thresholds are configurable and tested.

### 13.5 Candidate → case
`duplicate_candidates` stores the pair, features, score, band, rule version, `CandidateStatus`. `HIGH`/`MEDIUM` candidates automatically create a case (`DUPLICATE_IN_INSTITUTION` or `DUPLICATE_CROSS_INSTITUTION`); `LOW` candidates stay in a queue and a reviewer can promote one to a case. The case links to the candidate; the reviewer's `ReviewDecision` updates both. Re-running matching never duplicates an open candidate (canonical pair uniqueness).

### 13.6 Merge (P2)
Only `INSTITUTION_ADMIN` (in-institution) or `OVERSIGHT_OFFICER`; preview, explicit confirmation, reason, reversible `merged_into_id` link, full audit. No automatic merges.

### 13.7 Evaluation (P1)
Synthetic labelled set: ≥ 200 true pairs, ≥ 200 hard negatives (common names, spelling variants, same name different YOB, legitimate historical enrolments). Report precision, recall, F1, FPR, FNR, confusion matrix, runtime, vs an exact-APAAR-only baseline. Output to `docs/matching-evaluation.md` with the command that produced it. Also report: dataset size, positive/negative pair counts, how labels were generated, train/test separation (if thresholds were tuned, tune on one split and report on another), the rules and thresholds used, and the runtime environment. Include hard negatives with similar programme names and transliteration variants (e.g. *Mohammed / Muhammad*, *Lakshmi / Laxmi*). Discuss limits: data shift to real institutions, missing identifiers, spelling/transliteration variation, class imbalance, policy ambiguity. State that synthetic results do not establish real-world accuracy.

## 14. Cross-institution reconciliation (P0)

Find identities (same blind index, or `HIGH`/`MEDIUM` candidate) with **overlapping active enrolments** (`ACTIVE` status, overlapping academic years) at different institutions. Sequential, completed, transferred or withdrawn enrolments are legitimate and do not create a case (they may appear as informational history).

Only `OVERSIGHT_OFFICER` sees both sides. Each institution's admin is notified of a case affecting their record and sees only their own side plus "a possible overlapping enrolment exists at another institution" — no other institution's name or data. They can add evidence (e.g. withdrawal date).

Wording: "Possible duplicate enrolment — review required". Never "fraud detected". Final outcomes are human decisions (`ReviewDecision`).

## 15. Intake reconciliation (P0)

Dimensions must all match: institution, programme, academic year, seat type, effective period, reference version. Supernumerary, NRI, OCI and Foreign National seats are counted **separately** against their own reference lines if those exist; if the reference has no line for a seat type, that seat type's outcome is `CANNOT_DETERMINE_SCOPE_MISMATCH`.

Actual count = enrolments in scope with status in the configured included set (default `ACTIVE`, `PROVISIONAL`); exclusions listed. Show reference, actual, difference, formula, data cut-off time, source date, included statuses, exceptions, explanation.

Outcomes: `IntakeOutcome` (Appendix A.7). `POTENTIAL_DISCREPANCY` opens an `INTAKE_DISCREPANCY` case. Rules live in versioned config with provenance; do not hardcode national caps.

## 16. API

### 16.1 Conventions
Prefix `/api/v1`. Pydantic request/response models. Pagination `?page=&page_size=` (max 100). Server-side filtering. Error envelope:
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "…", "fields": [{"field": "academic_year", "code": "INVALID_ACADEMIC_YEAR"}], "request_id": "…" } }
```
No stack traces, connection strings, secrets or sensitive values in responses. All writes audit and enforce scope.

### 16.2 Routes

| Area | Routes | Priority |
|---|---|---|
| Auth | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `GET /auth/csrf` | P0 |
| Users & roles | `GET/POST /users` · `PATCH /users/{id}` · `POST /users/{id}/deactivate` · `GET /roles` | P0 (list/create) / P1 |
| Dashboard | `GET /dashboard/summary?academic_year=` | P0 |
| Institutions | `GET /institutions` · `GET /institutions/{id}` · `PATCH /institutions/{id}` · `POST /institutions/import` | P0 / P2 (import) |
| Programmes & intake | `GET/POST /programmes` · `PATCH /programmes/{id}` · `GET /intake-references` · `POST /intake-references` (new version) · `POST /intake-references/import` | P0 / P2 (import) |
| Students | `GET /students` · `GET /students/{id}` · `PATCH /students/{id}` (reason required) · `POST /students/{id}/reveal-apaar` (reason required, audited) | P0 |
| Enrolments | `GET /enrolments` · `PATCH /enrolments/{id}` | P0 |
| Templates | `GET /templates/student-enrolment.csv` · `GET /templates/student-enrolment.xlsx` · `GET /templates/data-dictionary` | P0 |
| Imports | `POST /imports` (upload → preview) · `PUT /imports/{id}/mapping` · `POST /imports/{id}/validate` · `POST /imports/{id}/commit` · `POST /imports/{id}/cancel` · `GET /imports` · `GET /imports/{id}` · `GET /imports/{id}/rows?severity=` · `GET /imports/{id}/error-report` | P0 |
| Validation | `POST /validation/run` · `GET /validation/results` | P0 |
| Matching | `POST /matching/runs` · `GET /matching/runs/{id}` · `GET /duplicates` · `GET /duplicates/{id}` · `POST /duplicates/{id}/promote` | P0 |
| Cases | `GET /cases?type=&status=` · `GET /cases/{id}` · `POST /cases/{id}/assign` · `POST /cases/{id}/transition` · `POST /cases/{id}/decision` · `POST /cases/{id}/comments` · `POST /cases/{id}/evidence` | P0 |
| Intake | `POST /intake/runs` · `GET /intake/runs/{id}` · `GET /intake/results?institution_id=&academic_year=` | P0 |
| Consent | `GET /me/record` · `GET /me/consents` · `POST /me/consents` · `POST /me/consents/{id}/revoke` · `GET /me/access-log` | P1 |
| Verification | `POST /verify` (body: token, requested purpose) — public, rate-limited · `GET /verify/{token}` (QR landing) | P1 |
| Certificates | `POST /students/{id}/certificate` · `GET /certificates/{id}` (PDF/HTML) | P1 |
| Reports | `GET /reports` · `POST /reports/export` (masked default; `unmasked=true` needs permission + reason) | P1 |
| Audit | `GET /audit-logs` | P0 |
| Integrations | `GET /integrations/status` · `POST /integrations/{name}/check` · `GET/PUT /source-registry` | P0 (status) / P2 |
| Institution API keys | `GET/POST /api-keys` · `POST /api-keys/{id}/revoke` | P1 |
| Machine import | `POST /integration/v1/enrolments:batch` (header `X-API-Key`) — same validation as file import | P1 |
| Ops | `GET /health` · `GET /ready` | P0 |

### 16.3 Machine API
Accepts JSON array of template rows (max 1 000 per call). Returns an `import_job` ID; same statuses and row results as file imports. Idempotency via `Idempotency-Key` header.

## 17. UI/UX

The current frontend has a sound base (React + Tailwind + Lucide, sidebar + header shell, role-aware pages). §0.3 lists what to fix; this section is the target. Keep the existing Tailwind styling rather than introducing a new component library, except where noted.

### 17.1 Visual direction
- Professional, modern, public-sector-inspired administration console with **original APAAR ReconX branding**. Calm navy/blue, white and light neutral surfaces, clear typography, consistent spacing, subtle borders, restrained shadows.
- Do **not** copy the AICTE portal pixel-for-pixel or use government emblems, seals or AICTE/APAAR/DigiLocker logos in any way that implies official status.
- Desktop-first for data work, but usable on tablet and mobile (≥ 360 px) — no horizontal page scroll; wide tables scroll inside their container with a sticky first column.
- Lucide icons consistently; **no emoji** anywhere in the UI. No decorative animation that slows admin tasks; respect `prefers-reduced-motion`.
- Design tokens in one place (Tailwind theme): colours for `success`, `warning`, `danger`, `info`, `neutral`, `simulated` (a distinct purple/grey so simulated results never look like green "verified").

### 17.2 Global layout and shell (P0)
- **Left sidebar:** product name, role-aware navigation built from the §6 permission matrix (a role never sees an item it cannot use), clear active state, collapse to icons on desktop, slide-in drawer on mobile. No developer screen numbers.
- **Top bar:** page title + breadcrumbs; current institution scope (or "All institutions — oversight"); academic-year selector that applies globally; global search **only** if it searches real data (P1); notifications/task count **only** if backed by real data (open cases assigned to me) (P1); profile menu with role name and sign-out.
- **Persistent `DEMO MODE` chip** in the top bar while `DataMode` ≠ `LIVE`, with a tooltip explaining what is synthetic and simulated.
- **Disclaimer bar** on every page, including login and public verify: *"Independent prototype for demonstration. Not an official AICTE or APAAR portal. Uses synthetic data and simulated verification."*
- **Consistent building blocks** (create once in `components/ui/`, reuse everywhere): `PageHeader` (title, description, primary action on the right), `FilterBar`, `DataTable` (sortable headers, pagination, empty/loading/error rows, sticky header), `StatCard` (clickable), `StatusBadge` (Appendix A driven), `Drawer` (record quick-view), `ConfirmDialog` (reason field when required), `Toast`, `ErrorBanner` (with retry and request ID), `EmptyState` (explains why and offers the next action), `Forbidden`, `SkeletonRows`, `ProvenanceTag` (source + as-of date), `MaskedId` (with optional audited reveal).
- Every button works, navigates to a real destination, or is visibly disabled with the reason shown on hover/focus. **No fake controls.**

### 17.3 Navigation (show only what the role can use)

| Item | Route | Existing page | Roles | P |
|---|---|---|---|---|
| Overview | `/dashboard` | DashboardPage | all staff roles | P0 |
| Institutions & Programmes (incl. intake references) | `/institutions`, `/institutions/:id` | InstitutionSettingsPage (extend) | SYS_ADMIN, OVERSIGHT, INST_ADMIN, AUDITOR | P0 |
| Student Records | `/students`, `/students/:id` | StudentRecordsList/Details | OVERSIGHT, INST_ADMIN, OPERATOR, AUDITOR | P0 |
| Bulk Imports (wizard + history) | `/imports`, `/imports/new`, `/imports/:id` | StudentDataUpload + ColumnMapping + ValidationResults (merge) | INST_ADMIN, OPERATOR | P0 |
| Validation Centre | `/validation` | ValidationResultsPage (cross-import view) | INST_ADMIN, OPERATOR, AUDITOR | P0 |
| Duplicate Review | `/duplicates` | new (queue) + VerificationCasesPage detail | OVERSIGHT, INST_ADMIN | P0 |
| Cases | `/cases`, `/cases/:id` | VerificationCasesPage | OVERSIGHT, INST_ADMIN, AUDITOR | P0 |
| Intake Reconciliation | `/intake` | new | OVERSIGHT, INST_ADMIN, AUDITOR | P0 |
| Reports & Exports | `/reports` | ReportsPage | OVERSIGHT, INST_ADMIN, AUDITOR | P1 |
| Audit Trail | `/audit` | new | SYS_ADMIN, OVERSIGHT, INST_ADMIN, AUDITOR | P0 |
| Users & Roles | `/users` | UserManagementPage | SYS_ADMIN, INST_ADMIN | P0 |
| Integrations & Sources | `/integrations` | IntegrationsPage | SYS_ADMIN (others read-only) | P0 |
| API Keys | `/api-keys` | new | INST_ADMIN | P1 |
| Settings | `/settings` | InstitutionSettingsPage (profile part) | SYS_ADMIN, INST_ADMIN | P1 |
| Student: My Record · Consents · Certificate | `/me`, `/me/consents`, `/me/certificate` | CertificatePreviewPage (adapt) + new | STUDENT | P1 |
| Public: Verify | `/verify`, `/verify/:token` | PublicVerifyPage | public | P1 |

### 17.4 Overview dashboard (P0)
- Values come only from the API; every summary card is **clickable** and opens the matching filtered list (the count on the card must equal the list total).
- Cards: total student and enrolment records; latest imports (with status); import errors; `APAAR_MISSING`; `FORMAT_INVALID`; awaiting provider verification; duplicate candidates by `MatchBand`; open cross-institution cases; intake cases needing review; reference data with freshness warnings.
- Panels: recent imports; open cases by `CaseStatus`; validation breakdown by `ValidationCode`; candidate distribution by band; intake outcomes per programme and seat type; source freshness list.
- Header strip: data cut-off time ("as of 27 Oct 2026, 10:15 IST"), academic-year filter, institution scope, `DataMode`.
- Charts (P1, Recharts if added): title, units, axis labels, accessible text summary (`<figcaption>` or table toggle), sensible empty state, same filters as cards.
- **Never** show invented or unmeasured numbers ("99.9 % accuracy", compliance scores, trend arrows without a previous period).

### 17.5 Screens

**Institutions & Programmes (P0)**
- List: search/filter by name, code, type, `SourceStatus`, academic year, approval/reference status. Columns: institution, code, type, location, reference status, academic year, source, last verified, programme count, actions.
- Detail: source and provenance; approval information **only if confirmed** (otherwise "Not confirmed from an authoritative source"); programmes; intake reference **history** per programme and seat type (versions, never overwritten); import history; freshness; caveats. Controlled reference-data import (§7 A).

**Student Records (P0)**
- Search by internal reference number, masked APAAR (last 4), name (if permitted), institution, programme, academic year, `ApaarStatus`, validation status. Debounced search, server pagination, filters reflected in the URL.
- Identifiers masked by default; **Reveal** (permitted roles only) asks for a reason, calls the audited endpoint, shows the value for 30 s, then re-masks.
- Detail page: minimal profile; enrolment history timeline (institution, programme, year, status, seat type); validation results with rule + version; linked duplicate candidates and cases; consent status; source/import history; correction history (before/after masked, actor, reason); audit timeline.
- Field-level provenance: each field shows where it came from (import job + row, manual correction, provider) and when. Never imply that all fields came from an official source.
- Correction form: inline validation, required reason, preserved values after errors, confirmation before save.

**Import wizard (P0)** — one route, five steps with a visible stepper:
1. **Select scope and file:** institution scope (fixed for institution roles), academic year, template download links (CSV/XLSX + data dictionary), supported formats and limits stated up front, drag-and-drop with keyboard alternative.
2. **Preview and map:** first 10 rows rendered safely (text only), auto-mapped columns with confidence, manual mapping dropdowns, required columns highlighted, duplicate-file warning (same SHA-256).
3. **Validate:** background job with progress (`aria-live`), then row-level results filterable by severity and `ValidationCode`, showing row number, column, code, message and suggested fix; download error report.
4. **Review summary:** counts (total, accepted, rejected, warnings, exact duplicates, possible duplicates, skipped) and what will happen on commit. **Commit disabled with the reason shown** when blocking errors exist.
5. **Result:** committed counts, link to the import record, error report, next actions (run matching, view validation centre).
- Import history list with `JobStatus`, actor, time, counts; resumable — leaving mid-wizard and returning restores the step.

**Validation Centre (P0)**
- Cross-import view of open validation results. Filters: missing identifier, format failure, awaiting verification, unknown programme, academic-year issue, consent not recorded, conflicting source.
- Detail drawer: field, masked value, rule + version, provenance, suggested next step, "Correct record" action.

**Duplicate Review (P0)**
- Queue filtered by `MatchBand`, source, institution scope, programme, academic year, age, `CandidateStatus`/`CaseStatus`; sorted by band then age.
- Comparison view: two records side by side; masked identifiers; each compared field marked **Agree / Disagree / Missing** with text + icon (never colour alone); similarity values; rule version; plain-language "why this pair was selected"; source and import provenance; decision history.
- Actions by permission: record a `ReviewDecision`, move to `AWAITING_EVIDENCE`, `ESCALATED`, or `DISMISSED` — all with required reason in a `ConfirmDialog`. Merge (P2) needs higher permission, a before/after preview and confirmation.
- Wording: "Possible duplicate — review required". Never "fraud".

**Cases (P0)**
- List with type, priority, status, institution(s), age, assignee; "Assigned to me" quick filter.
- Detail: linked records, evidence (features, documents/notes), event timeline, comments, assignment, transition buttons limited to Appendix A.6 allowed transitions for the current status and role.
- Cross-institution cases: institution users see only their side plus the neutral notice (§14).

**Intake Reconciliation (P0)**
- Pick institution, programme, academic year. Table per seat type: reference intake, source + as-of date, actual count, included statuses, exclusions, difference, `IntakeOutcome` badge, "Open case" link where one exists.
- "Show calculation" expands the exact formula and the list of counted enrolments (paginated, masked).

**Reports & Exports (P1)**
- Report list → preview → export. Preview shows generation time, filters, academic year, source freshness, `DataMode`, limitations text.
- Export dialog: format (CSV/XLSX), masked by default; "Include full identifiers" visible only with permission and requires a reason; export recorded in the audit trail.

**Audit Trail (P0)**
- Searchable, filterable, paginated chronological log: time, actor (name + role snapshot), action, target, outcome, request ID. Expandable safe metadata. Read-only; no edit or delete controls.

**Users & Roles (P0 list/create, P1 rest)**
- Users with role and institution scope; invite/create; deactivate (with confirmation); role change audited. Institution admins manage only their institution's users and cannot grant oversight or system roles.

**Integrations & Sources (P0 status)**
- One card per connector: name, purpose, `ConnectorStatus`, configured/not configured, last attempted and last successful check, limitations. Test button allowed only for mock connectors and labels results `SIMULATED`.

**Login (P0)**
- Email + password, clear error without revealing whether the account exists, lockout/rate-limit message. Disclaimer visible. Dev-only role switcher (U2). Government SSO shown only as a disabled, explained roadmap item.

**Student portal and public verify (P1)** — see §7 G–I and §8.9–8.10. Public verify page must work without login, on mobile, and show `DataMode` + data-as-of date on the result card.

### 17.6 Accessibility (P1; colour/text rule P0)
- Semantic headings and landmarks (`header`, `nav` with `aria-label`, `main`), labelled inputs, accessible names on icon-only buttons, table headers with `scope`, sensible tab order, visible focus ring, skip-to-content link.
- Keyboard-operable menus, dialogs (focus trap and focus return) and the import drop zone.
- `aria-live` announcements for job progress, toasts and validation summaries.
- Forms: inline validation, error summary at the top linking to fields, values preserved after errors, confirmation for consequential actions.
- Status always as colour **plus** text/icon; AA contrast; readable sizes (body ≥ 14 px; avoid the current 9–11 px labels for anything users must read).
- Target **WCAG 2.2 AA**; do not claim compliance without testing — record an axe/Lighthouse run and a keyboard-only walkthrough in `docs/test-report.md`.

### 17.7 Real-world UI readiness (P2 unless noted)
- **Bilingual readiness:** Indian government web guidelines (GIGW — verify the current version) expect bilingual Hindi/English content. Keep all strings in a translation file from now on (P1) so Hindi can be added without code changes.
- **Low-bandwidth and older devices:** route-level code splitting; no large images on the login page; target first load < 300 KB gzipped JS for the shell.
- **Session UX:** warn 2 minutes before session expiry; preserve unsaved form data on re-login.
- **Print styles** for case summaries, intake calculations and the certificate.
- **Time zone and formats:** show dates in IST with explicit format (`27 Oct 2026, 10:15 IST`); academic year always `YYYY-YY`.
- **Help:** contextual help text on each page explaining statuses (linked to Appendix A labels) and a data dictionary page.

## 18. Security and privacy

### 18.1 Controls
- Sessions: httpOnly/Secure/SameSite cookie; CSRF double-submit token on writes; short expiry with sliding refresh; logout invalidates.
- bcrypt passwords; login rate limit; generic auth errors.
- RBAC + scope dependency on every route; no mass assignment (explicit Pydantic update models).
- ORM-only queries; React escaping; no `dangerouslySetInnerHTML` on user data; restricted CORS (exact origins from env).
- Upload: allowlist, size/row limits, content sniffing, safe parsing, no macros, random server-side filenames.
- Export: formula-injection escaping, masked default, permission + reason for unmasked, audited.
- API keys and verification tokens stored as hashes; shown once.
- Secrets only from env; `.env.example` has placeholders; `.env` git-ignored.
- Logs: request ID, no PII, no secrets.

### 18.2 Privacy principles
Data minimisation, purpose limitation (per-field purpose in data dictionary), consent (§8.9), transparency (student access log), correction workflow with reason, defined retention, masked exports. Production blockers (list in `docs/security-privacy.md`): legal basis and data-sharing agreements, DPDP Act compliance review, official API authorisation, KMS, security audit, backup/recovery, incident response.

### 18.3 Threat model (each needs a test or explicit mitigation note)

| Threat | Mitigation |
|---|---|
| Institution user reads another institution's data | Scope dependency; cross-tenant negative tests |
| Role escalation via modified request | Server-derived role; negative tests |
| Malicious/oversized upload | Limits, sniffing, safe parser, transaction |
| False accusation from a match score | Neutral wording, explanations, human decision, correction path |
| Stale reference creates false discrepancy | Freshness check → `REFERENCE_STALE` |
| Export leaks identifiers | Masking, permission, reason, audit, formula escaping |
| Mock verification mistaken for real | `SIMULATED` statuses, DEMO MODE chip, disclaimer |
| Verification token abuse / enumeration | 128-bit random tokens, hashed, expiry, revocation, rate limit, neutral failure message |
| APAAR leak via DB dump | AES-GCM ciphertext + separate HMAC key; last-4 only for display |
| CSRF on cookie session | CSRF token + SameSite |

## 19. Testing

Command: `cd backend && pytest -q`. Tests use an isolated SQLite DB per test session and the deterministic seed.

**P0 tests (must exist and pass before any P1 work):**
1. APAAR format: 12 digits pass; 11/13 digits, letters, empty → correct `ApaarStatus`; spaces/hyphens normalised.
2. Blind index: same APAAR → same index; ciphertext ≠ plaintext; APAAR absent from API list responses and audit rows.
3. Import: valid file commits; malformed row rejected with code + row number; duplicate header rejected; oversize rejected; failed commit leaves zero new rows.
4. In-file duplicates: identical row vs same-APAAR-different-row produce different codes.
5. Cross-institution: overlapping active enrolments → case; sequential enrolments → no case.
6. Intake: within, over (→ case), missing reference, stale reference, seat-type mismatch.
7. Case transitions: allowed transitions succeed; disallowed return 409; resolve without reason returns 422.
8. Tenant isolation: Institution A operator gets 404 on Institution B student, import, case, export.
9. RBAC: operator cannot create users; unauthenticated → 401.
10. Mock provider outage → `PROVIDER_UNAVAILABLE`, never verified.
11. Export: masked by default; formula-prefixed cell escaped.
12. Audit: import, correction, decision, reveal, export each create one audit row without full APAAR.

**P1 tests:** consent grant/revoke; verify with valid/expired/revoked/foreign-purpose token; API key auth and scope; certificate QR contains no personal data; matching evaluation script runs.

**Manual checks (record results in `docs/test-report.md`):** every nav item reaches a real screen; loading/empty/error/forbidden states; import end-to-end with valid and invalid files; decisions persist after refresh; keyboard-only navigation of import and case review; layout at 1366 px and 390 px; disclaimer and DEMO chip visible.

Never report tests as passing unless run; paste actual output.

## 20. Demo data and script

### 20.1 Seed (deterministic; target command `python -m app.seed --reset` — add a `__main__` to the existing `app/seed` package if missing)
3 synthetic institutions (`Demo Institute of Technology A/B/C`), 2–3 programmes each, intake references for `2025-26` and `2026-27` including NRI/OCI/FN/supernumerary lines for one programme, one deliberately stale reference, ~300 synthetic students. All names obviously synthetic or generated; all APAAR values start with `9999`.

### 20.2 Planted scenarios

| # | Scenario | Expected result | P |
|---|---|---|---|
| 1 | Clean record | `FORMAT_VALID`, no issues | P0 |
| 2 | Missing APAAR | `APAAR_MISSING` warning, status `MISSING` | P0 |
| 3 | 11-digit APAAR | `FORMAT_INVALID`, label "Format check only" | P0 |
| 4 | Identical row twice in file | `DUPLICATE_ROW_IN_FILE` | P0 |
| 5 | Name spelling variant, same YOB, no APAAR | `MEDIUM` candidate + case with reasons | P0 |
| 6 | Same APAAR active at Institute A and B in 2026-27 | `DUPLICATE_CROSS_INSTITUTION` case; only oversight sees both sides | P0 |
| 7 | Same APAAR, A in 2024-25 (completed) then B in 2026-27 | No case; history shown | P0 |
| 8 | Programme enrolled 64 against intake 60 (same scope, fresh reference) | `POTENTIAL_DISCREPANCY` + case | P0 |
| 9 | Stale or missing reference | `REFERENCE_STALE` / `CANNOT_DETERMINE_MISSING_REFERENCE` | P0 |
| 10 | Mock provider switched to outage | `PROVIDER_UNAVAILABLE` | P0 |
| 11 | Unknown programme code / wrong academic year | `UNKNOWN_PROGRAMME` / `INVALID_ACADEMIC_YEAR` | P0 |
| 12 | Operator at A requests B's student by ID | 404 + `ACCESS_DENIED` audit event | P0 |
| 13 | Student grants employer verification, employer verifies, student revokes, verify fails | Full consent loop | P1 |
| 14 | Certificate with student ID + masked APAAR + QR | QR resolves to verify page | P1 |

### 20.3 Demo script (4 minutes)
1. Problem in one sentence + disclaimer (15 s).
2. Operator uploads planted CSV → validation errors (scenarios 2–4, 11) (60 s).
3. Oversight officer: cross-institution case (6), contrast with legitimate history (7) (45 s).
4. Intake reconciliation: discrepancy (8) and stale reference (9) (40 s).
5. Resolve a case with reason → audit trail entry (30 s).
6. Student consent → employer verification → revoke (13) (40 s) — P1.
7. Close: privacy design (blind index, consent, masking), what is simulated, next steps (10 s).

## 21. Deployment and operations

- Local: documented commands for backend, frontend, seed, tests; Docker Compose with PostgreSQL.
- `.env.example`: `DATABASE_URL`, `SESSION_SECRET`, `APAAR_ENC_KEY`, `APAAR_HMAC_KEY`, `DEMO_PASSWORD`, `CORS_ORIGINS`, `DATA_MODE=DEMO_MOCK`, `PUBLIC_DEMO=false`, upload limits.
- Startup fails fast if required secrets are missing or are the example placeholders when `PUBLIC_DEMO=true`.
- **Public demo (Render) only with `PUBLIC_DEMO=true`:** synthetic data only, unmasked export and reveal disabled, user management disabled, data reset nightly, credentials shared privately (not in README).
- Health/readiness endpoints; logs without secrets; troubleshooting section in README (DB unavailable, missing env, CORS, API base URL, parser errors, provider not configured, migration failure).
- **Observability (P1):** structured JSON logs with request ID, actor ID and route (never PII or secrets); error reporting with request ID shown to the user so issues can be traced; provider-check history; basic metrics (request latency, import job duration, error rate).
- **Supply chain (P1):** pinned dependencies with lock files (`package-lock.json` exists; add one for Python); `pip-audit` and `npm audit` in CI; secret scanning (e.g. gitleaks) on every push; `.env` never committed.

### 21.1 Production readiness (beyond the prototype — document, do not fake)

The prototype is not expected to meet these, but `docs/security-privacy.md` must list each with its current status (`Done in prototype` / `Partially` / `Not started` / `Needs authority`). Items marked *verify* must be checked against the current official text before being cited.

| Area | What a real deployment would need | Prototype status target |
|---|---|---|
| Legal basis and consent | Data-sharing agreements with AICTE/institutions; consent and notice aligned with the Digital Personal Data Protection Act 2023 and its Rules (*verify current text*); named grievance contact | Consent model + notice text drafted (P1) |
| Identity integration | Authorised APAAR/ABC/DigiLocker API access via official onboarding; government SSO (e.g. Parichay/MeriPehchaan — *verify*) for officials | Adapter interfaces + `NOT_CONFIGURED` status (P0) |
| Hosting and data location | Hosting on a government-approved/empanelled cloud in India (*verify applicable policy*) | Documented as a blocker |
| Security assurance | Third-party security audit / VAPT before go-live; OWASP ASVS L2 as the target checklist | Self-assessment against ASVS sections relevant to auth, access control, input handling (P2) |
| Incident response and logs | Incident-reporting timelines and log-retention duties under CERT-In directions (*verify current requirements*); runbook; on-call contact | Log retention configurable; runbook outline (P2) |
| Key management | KMS/HSM for `APAAR_ENC_KEY` and `APAAR_HMAC_KEY`, rotation procedure, re-indexing plan for HMAC key rotation | Keys from env, rotation procedure documented (P1) |
| Availability and recovery | Backups with restore tests, RPO/RTO targets, migration rollback | Backup/restore steps documented for PostgreSQL (P2) |
| Scale | Thousands of institutions and millions of enrolment rows: async imports, indexed blocking keys, paginated APIs, no full-table loads in the browser | Load test: 10 000-row import and matching over 100 000 seeded records with timings recorded (P2) |
| Accessibility and language | WCAG 2.2 AA audit; bilingual Hindi/English per GIGW (*verify version*) | i18n-ready strings (P1), axe run recorded (P1) |
| Data retention | Approved retention schedule for raw uploads, snapshots, validation history, audit logs | Configurable retention with defaults in §10.6 (P1) |
| Support and governance | Data-correction/appeal route for students and institutions, SLAs, change control for matching rules and intake rules | Correction workflow + versioned rules (P0/P1) |

## 22. Documentation package

| File | Contents | P |
|---|---|---|
| `README.md` | Overview, disclaimer, features, stack, setup, env vars, seed/reset, run, test, demo roles (no passwords), limitations | P0 |
| `docs/spec.md` | This file | P0 |
| `docs/deviations.md` | Where the repo differs from this spec and why | P0 |
| `docs/source-register.md` | §5 | P0 |
| `docs/data-dictionary.md` | Every field: type, nullability, sensitivity, purpose, provenance, retention | P0 |
| `docs/security-privacy.md` | Roles, matrix, threat model, crypto/key handling, consent, retention, production blockers | P0 |
| `docs/test-report.md` | Commands, real output, manual check results | P0 |
| `docs/demo-script.md` | §20.3 with exact clicks | P0 |
| `docs/architecture.md` | Context, components, data flow, trust boundaries, provider adapters (Mermaid) | P1 |
| `docs/matching-evaluation.md` | §13.7 | P1 |
| `docs/assumptions.md` | §4 | P1 |
| `docs/research-comparison.md` | Existing systems/papers vs this prototype; no novelty claims without evidence | P2 |
| `docs/status.md` | Checklist of every P0/P1/P2 item: `Complete / Partial / Blocked / Not Started / Unverified` | P0 |
| `docs/limitations-roadmap.md` | Known limitations; each feature labelled Completed / Partially implemented / Mocked / Not implemented; next-step roadmap | P0 |
| `docs/ui-audit.md` | §0.3 table with status per item and before/after screenshots | P1 |
| `docs/presentation-notes.md` | SIH deck support: problem statement, evidence-backed current gap, proposed solution, workflow, architecture, differentiators (§23), feasibility, impact, risks/limitations, future scope | P0 |

`docs/research-comparison.md` columns: paper/system, year, task, method, data, evaluation, limitations, relevance, how this prototype differs.

## 23. Differentiators (to evidence, not assume)

Candidates: privacy-preserving cross-institution matching via blind index; explainable, versioned matching with human adjudication; seat-type-aware intake reconciliation with stale-reference safeguards; student-controlled consent for third-party verification; provenance on every status. For each, document: what existing systems/teams do, what this adds, how it is tested, what remains limited. Several public SIH26263 repos already use adapters, HMAC tokens, QR credentials and audit ledgers — do not claim these as unique. No "first of its kind", "100% accuracy", "fraud prevention" or "official integration" claims.

## 24. Execution plan

| Phase | Work | P |
|---|---|---|
| 0 | Repo audit (§27). Fix honesty conflicts C1–C4, C11, C12 and wording items U1, U3–U5, U16, U17, U19. Add `docs/status.md`, `docs/deviations.md`. | P0 |
| 1 | Test harness + P0 tests for existing behaviour (expect some to fail). | P0 |
| 2 | Security foundation: cookie sessions + CSRF (C8), role mapping (C9), scope dependency, APAAR encryption + blind index (C5), field minimisation (C6), demo credentials from env (C2, U2), CORS and secret fixes (B1, B2, B4), server-side masking (U6–U8). | P0 |
| 3 | Import + validation aligned to §11/§12 and Appendix A codes. | P0 |
| 4 | Matching, candidates → cases, cross-institution logic (§13–§14). | P0 |
| 5 | Intake reconciliation with seat types (§15). | P0 |
| 6 | UI shell components (§17.2), dashboard from live queries with working filters (U9–U11), paginated lists (U12), Appendix A badges (U18), audit view, disclaimer + DEMO chip, role-driven nav (U14); seed scenarios 1–12; demo script. **P0 complete.** | P0 |
| 7 | Consent portal, verifier flow, certificates (§8.9–§8.10). | P1 |
| 8 | Institution API keys + machine import (§16.3). | P1 |
| 9 | Reports/exports, matching evaluation, accessibility pass (U13, U20, §17.6), import wizard merge (U15), responsive sidebar (U14), i18n-ready strings, identity/enrolment split (C7), Alembic, observability and supply chain (B5–B8, §21). | P1 |
| 10 | P2 items. | P2 |

After each phase report: files changed, summary, commands run, real test/build output, blockers, next phase. Update `docs/status.md`.

## 25. Working rules

1. Inspect → plan → implement in small, testable steps. Never build a parallel app.
2. Follow existing conventions; explain any stack change before making it; justify each new dependency.
3. Type hints, Pydantic schemas, clear names, comments only for non-obvious logic, one error format.
4. No placeholder functions that return success; no dead buttons; unavailable features are labelled with a reason.
5. Never fabricate data, API responses, statuses, metrics or test results.
6. Synthetic, deterministic data only; never commit real student data or `.env`.
7. Run formatters, linters, tests and builds that exist; fix regressions you cause.
8. If a source or tool is unavailable: record it, implement the adapter boundary with a labelled mock, continue.
9. No LLM decisions on identity, duplicate status, compliance or intake.
10. Function and correctness over visual polish.
11. Stop and ask before: deleting existing features, destructive migrations on non-seed data, changing deployment configuration, or any action outside the repo.

## 26. Acceptance checklist

**P0**
- ☐ Honesty conflicts C1–C4, C11, C12 and UI wording items U1–U5, U16, U17, U19 fixed; disclaimer + DEMO chip on every page
- ☐ No full APAAR value reaches the browser except via the audited reveal (U6–U8); no passwords in frontend code (U2)
- ☐ Every filter and button works or is disabled with a reason; lists paginate; error/empty/forbidden states exist (U9–U12)
- ☐ CORS restricted, no default secrets, `.xls` disabled (B1, B2, B4)
- ☐ App starts from a clean checkout with documented commands; seed is deterministic; reset works
- ☐ Cookie sessions + CSRF; roles mapped; scope enforced server-side; cross-tenant tests pass
- ☐ APAAR encrypted + blind-indexed; never in URLs, logs, list responses, QR
- ☐ Fields minimised and justified in the data dictionary
- ☐ Import: preview, mapping, validation job, row errors, transactional commit, history, error report
- ☐ `ApaarStatus` separates missing / format / simulated / provider-verified / unavailable
- ☐ Candidates explainable; `HIGH`/`MEDIUM` open cases; human decision with reason
- ☐ Cross-institution logic distinguishes overlapping vs sequential enrolments
- ☐ Intake per seat type; blocks conclusions on stale/missing/mismatched references
- ☐ Consent status recorded per student
- ☐ Audit log covers all §8.8 events without secrets or full APAAR
- ☐ Dashboard is query-backed; no unmeasured scores
- ☐ P0 tests (§19) exist and pass; output recorded
- ☐ Scenarios 1–12 demonstrable; demo script written

**P1**
- ☐ Student consent portal; verifier flow; certificates with student ID + masked APAAR + QR
- ☐ Institution API keys + machine import
- ☐ Reports/exports masked by default; unmasked gated + audited
- ☐ Matching evaluation with measured metrics and limitations
- ☐ Accessibility check recorded (axe + keyboard walkthrough); accessible dialogs; responsive shell; identity/enrolment split complete
- ☐ Single import wizard; strings extracted for i18n; observability and dependency scanning in place
- ☐ Production-readiness table (§21.1) filled in with honest status
- ☐ Architecture doc, assumptions, source register complete

**P2**
- ☐ Safe merge with undo; source registry UI; reference import UI; CI; research comparison

## 27. Required first response

Before coding:
1. Repository structure and current behaviour (from inspection, including whether it runs and what the existing pages do).
2. Commands to run backend, frontend, seed and tests.
3. Status of each §0.2, §0.3 and §0.4 item: confirmed / already fixed / not found.
4. Sources checked so far and outcomes (or "not yet checked").
5. Assumptions and blockers.
6. The phase you will start and the P0 items it covers.

Then begin Phase 0. Do not stop at planning unless a destructive change or a genuinely blocking decision needs the user.

## 28. Required end-of-session response

1. What works end-to-end now (by journey letter and scenario number).
2. Files changed.
3. Exact install/seed/run/test commands.
4. Real test and build output, including failures.
5. Demo accounts (roles only; passwords come from `.env`) and a warning not to use them in production.
6. What is synthetic, which connectors are mock / not configured / live-and-tested.
7. Sources actually checked.
8. Matching evaluation results (if run) and limitations.
9. Security/privacy controls in place and open production blockers.
10. Updated `docs/status.md` summary and the next three tasks.

## 29. Disclaimer

Independent educational / hackathon prototype specification. It grants no access to government systems, does not prove official requirements, and provides no real APAAR verification. Policy, API access, data-sharing permissions, legal basis, security review and institutional approval must be confirmed with the responsible authorities before any production use. All sample records and identifiers are synthetic.

---

## Appendix A — Canonical enumerations

Every status shown in UI, API, DB or reports uses these exact codes. UI labels in quotes. Do not add synonyms elsewhere; extend this appendix instead.

### A.1 `ApaarStatus`
| Code | Label | Meaning |
|---|---|---|
| `NOT_CHECKED` | "Not checked" | No check run yet |
| `MISSING` | "Missing" | Field empty |
| `FORMAT_INVALID` | "Format invalid" | Fails the 12-digit rule |
| `FORMAT_VALID` | "Format OK — not verified" | Passes 12-digit rule only; not proof of identity or existence |
| `AWAITING_PROVIDER` | "Verification pending" | Provider check requested, not complete |
| `SIMULATED_MATCH` | "Simulated match (demo)" | Mock provider positive; never official |
| `SIMULATED_NO_MATCH` | "Simulated no match (demo)" | Mock provider negative |
| `VERIFIED_BY_PROVIDER` | "Verified by <provider>" | Real configured provider confirmed; provider, time, reference stored |
| `NOT_FOUND_BY_PROVIDER` | "Not found by <provider>" | Real provider returned not-found |
| `PROVIDER_UNAVAILABLE` | "Provider unavailable" | Check could not complete |
| `STALE` | "Result expired" | Prior result outside freshness window |

### A.2 `SourceStatus` (institutions, programmes, intake references)
`VERIFIED_FROM_SOURCE` "Verified from cited source" · `IMPORTED_UNVERIFIED` "Imported — unverified" · `SYNTHETIC` "Synthetic (demo)" · `STALE` "Stale" · `INCOMPLETE` "Incomplete" · `SOURCE_UNAVAILABLE` "Source unavailable" · `UNKNOWN` "Unknown"

### A.3 `Severity`
`ERROR` (row rejected) · `WARNING` (row accepted, flagged) · `INFO`

### A.4 `ValidationCode`
| Code | Severity |
|---|---|
| `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `TOO_MANY_ROWS`, `FILE_EMPTY`, `ENCODING_INVALID`, `HEADER_DUPLICATE`, `HEADER_MISSING_REQUIRED`, `ROW_MALFORMED` | ERROR (file/row) |
| `REQUIRED_FIELD_MISSING`, `INVALID_ACADEMIC_YEAR`, `INVALID_ENUM_VALUE`, `UNKNOWN_PROGRAMME`, `SCOPE_MISMATCH`, `FIELD_TOO_LONG`, `DUPLICATE_ROW_IN_FILE`, `DUPLICATE_APAAR_IN_FILE` | ERROR |
| `APAAR_MISSING`, `APAAR_FORMAT_INVALID`, `POSSIBLE_DUPLICATE_IN_FILE`, `CONTROL_CHARACTERS_REMOVED`, `CONSENT_NOT_RECORDED`, `REFERENCE_DATA_STALE` | WARNING |

`APAAR_FORMAT_INVALID` is a WARNING so the row is kept for correction; its `ApaarStatus` is `FORMAT_INVALID`.

### A.5 `MatchBand` and `CandidateStatus`
`MatchBand`: `HIGH` "High-priority review" · `MEDIUM` "Review" · `LOW` "Weak candidate". Review priorities, not probabilities.

`CandidateStatus`: `OPEN` · `PROMOTED_TO_CASE` · `CLOSED`

### A.6 `CaseType`, `CasePriority`, `CaseStatus`, transitions, `ReviewDecision`
`CaseType`: `DUPLICATE_IN_INSTITUTION` · `DUPLICATE_CROSS_INSTITUTION` · `INTAKE_DISCREPANCY` · `DATA_QUALITY`

`CasePriority`: `HIGH` · `MEDIUM` · `LOW`

`CaseStatus`: `NEW` · `IN_REVIEW` · `AWAITING_EVIDENCE` · `ESCALATED` · `RESOLVED` · `DISMISSED`

| From → To | Allowed | Reason required |
|---|---|---|
| `NEW` → `IN_REVIEW` | Assignee/reviewer | No |
| `IN_REVIEW` → `AWAITING_EVIDENCE` | Reviewer | Yes |
| `AWAITING_EVIDENCE` → `IN_REVIEW` | Reviewer, or automatically when evidence added | No |
| `IN_REVIEW` → `ESCALATED` | Reviewer | Yes |
| `ESCALATED` → `IN_REVIEW` | Oversight | No |
| `IN_REVIEW` / `ESCALATED` → `RESOLVED` | Reviewer with permission | Yes + `ReviewDecision` |
| `IN_REVIEW` / `NEW` → `DISMISSED` | Reviewer with permission | Yes |
| `RESOLVED` / `DISMISSED` → `IN_REVIEW` (reopen) | Oversight / Institution admin | Yes |

All other transitions → 409.

`ReviewDecision` (set on `RESOLVED`):
`SAME_PERSON_CORRECTION_REQUIRED` "Same person — correction required" · `SAME_PERSON_LEGITIMATE` "Same person — legitimate records" · `NOT_DUPLICATE` "Not a duplicate" · `DISCREPANCY_EXPLAINED` "Discrepancy explained" · `DISCREPANCY_CONFIRMED_FOR_FOLLOW_UP` "Discrepancy confirmed — follow-up required" · `DATA_CORRECTED` "Data corrected"

"More evidence required" and "Escalate" are **status transitions**, not decisions.

### A.7 `IntakeOutcome`
`WITHIN_REFERENCE` "Within reference" · `POTENTIAL_DISCREPANCY` "Potential discrepancy — review required" · `CANNOT_DETERMINE_MISSING_REFERENCE` "Cannot determine — reference missing" · `CANNOT_DETERMINE_SCOPE_MISMATCH` "Cannot determine — scope mismatch" · `REFERENCE_STALE` "Reference may be stale" · `POLICY_RULE_UNCONFIRMED` "Cannot determine — rule unconfirmed"

### A.8 `DataMode`
`DEMO_MOCK` "Demo — synthetic data, simulated providers" · `LIVE` (only if every active connector is `LIVE_TESTED` and data is real and authorised — not expected in this project)

### A.9 `ConnectorStatus`
`LIVE_TESTED` · `DEMO_MOCK` · `NOT_CONFIGURED` · `NOT_AUTHORISED` · `UNAVAILABLE` · `FAILED`

### A.10 `JobStatus` (imports, matching runs, intake runs)
`UPLOADED` · `PREVIEW_READY` · `VALIDATING` · `VALIDATED` · `COMMITTING` · `COMPLETED` · `COMPLETED_WITH_WARNINGS` · `FAILED` · `CANCELLED`

(Matching and intake runs use `QUEUED` · `RUNNING` · `COMPLETED` · `FAILED`.)

### A.11 `EnrolmentStatus`
`ACTIVE` · `PROVISIONAL` · `COMPLETED` · `WITHDRAWN` · `TRANSFERRED_OUT` · `DISCONTINUED`

### A.12 `SeatType`
`REGULAR` · `SUPERNUMERARY` · `NRI` · `OCI` · `FOREIGN_NATIONAL` · `OTHER` (requires `admission_quota` text). Exact supernumerary sub-categories are configured per source, not hardcoded.

### A.13 `ConsentStatus` and `VerificationTokenStatus`
`ConsentStatus`: `CONSENT_ATTESTED_BY_INSTITUTION` · `CONSENT_GIVEN_BY_STUDENT` · `NOT_RECORDED` · `WITHDRAWN`

`VerificationTokenStatus`: `ACTIVE` · `EXPIRED` · `REVOKED` · `USED_UP` (if single-use)

### A.14 `AuditOutcome`
`SUCCESS` · `DENIED` · `FAILED`

## MASTER PROMPT — END
