# APAAR ReconX — Validation Test Report

Date of final run: 28 Oct 2026. All results below were produced by commands that were actually executed
against the application code in this repository. Nothing is reported as passing that was not run.

All data used is fictional. APAAR-like numbers in the dataset are test values; none were issued or
verified by the official APAAR system.

## 1. What was run

| Suite | Command (from `backend/`) | Database | Result |
|---|---|---|---|
| Automated tests | `.venv/Scripts/python -m pytest tests -q` | throwaway SQLite per run | **34 passed, 0 failed** |
| End-to-end dataset run #1 | `.venv/Scripts/python scripts/demo_e2e.py <tmp>/rep1.db` | fresh, seeded | **69/69 checks passed** |
| End-to-end dataset run #2 (repeat from clean) | `.venv/Scripts/python scripts/demo_e2e.py <tmp>/rep2.db` | fresh, seeded | **69/69 checks passed**, identical to run #1 |
| Browser (UI) walkthrough | isolated server on port 8021, throwaway DB | fresh, seeded | see §4 |

`demo_e2e.py` imports every file in `demo-data/` through the real API (upload → map columns → validate →
submit) with the real accounts, then exercises the scenarios. It refuses to run against
`backend/apaar_reconx.db`.

## 2. Defects from the brief: before and after

| # | Defect | Reproduced before the fix | After the fix |
|---|---|---|---|
| A | Duplicate Vihaan Sharma (IIT25MCA004) records | 3 active records for the roll after repeat uploads/corrections | exactly 1 active record; re-import skips it (`S2 still exactly one IIT25MCA004 after re-import`) |
| B | "Active student record not found" on correction | 2nd correction from an old ID returned 404 | corrections always apply to the current version; old IDs redirect to it |
| C | Case resolved while reason said evidence still required | resolve returned 200 and forced the record to valid | refused (409) while the case is *Awaiting evidence*, whatever the wording; refused while the record still fails its checks; records are never forced to valid |
| D | Dashboard out of sync | draft upload raised total 429 → 489 | drafts never counted; metrics equal the record and case lists for staff and reviewer (4 checks) |
| E | Repeat imports not idempotent | same file re-imported created new rows | same/older rows are skipped; summary reports added / skipped / flagged / cases |

## 3. Defects found during this validation and fixed

| Found by | Problem | Fix |
|---|---|---|
| UI walkthrough | Importing through the UI saved every row with **no programme** (the file's `programme` column was ignored; the table showed a "CSE" placeholder). Intake checks did not run for UI imports. | Each row's programme column is matched to the college's programmes by code or name; **Programme for this file** picker added on Map Columns; unknown programmes are flagged; intake checked per programme; placeholder removed. E2E now imports exactly like the UI and checks every row's programme (7 checks). |
| UI walkthrough | Resolving with "APAAR card copy still pending from the student" **was accepted** (wording check missed it) | Structural rule: a case in *Awaiting evidence* cannot be resolved or dismissed until evidence is added. Wording check broadened. Regression test added (pytest + E2E). |
| UI walkthrough | Correction form had no roll number or programme fields (needed for the duplicate-roll scenario) | **Roll Number** and **Programme** added to *Submit Student Record Correction* (server checks the programme belongs to the college) |
| UI walkthrough | Case title kept "(No APAAR)" after the APAAR was corrected | case title refreshed when a correction moves the case to the new version |
| UI walkthrough | "Issues & Cases (0)" while a case was still open | count includes open cases |
| UI walkthrough | **Dismiss — not an issue** shown on data-error cases (server always refuses it) | hidden for invalid-data cases |
| UI walkthrough | **Re-map Columns** shown after submission (server refuses it) | hidden once submitted |
| UI walkthrough | Duplicate comparison showed "Missing" for another college's hidden fields | shown as "Hidden" |
| UI walkthrough | Import summary said "flagged with errors" when some were warnings | "flagged for review" |
| Earlier inspection | Export button opened a POST URL without auth; CSV formula injection; cases opened for drafts | authenticated download; cells starting `= + - @ tab CR` neutralised; cases only on submit |

## 4. Browser walkthrough (actually performed)

Isolated server (`reconx-qa` launch config, port 8021, DB in the temp folder; the main local DB was not touched).

| Step | Account | Observed |
|---|---|---|
| Bulk Import → `students_missing_apaar.csv` → Proceed to Column Mapping → Save Mapping & Run Validation | College Staff | 40 evaluated, 35 valid, 5 errors, 0 skipped; Vihaan Sharma row 4 "APAAR ID is missing"; programme shown as Master of Computer Applications (after fix) |
| Confirm & Submit for Review | College Staff | "40 record(s) added, 0 skipped, 5 flagged…, 5 review case(s) opened" |
| Student Record → Submit Correction → APAAR `110200000004` + reason | College Staff | "Saved as version 2. The record now passes all checks."; v2 badge; Audit Version History (2) |
| Cases → Review case (Vihaan) | Oversight Reviewer | only **Mark awaiting evidence** and **Escalate** offered; marking succeeded |
| Cases → Review case → Resolve with "APAAR card copy still pending…" | College Staff | before fix: accepted (defect); after fix: refused with "This case is awaiting evidence…" and Dismiss hidden |
| Duplicate Review → Harini Krishnan / Kavya Kumar | College Staff / Institution Admin | matching record and reason shown ("same name and date of birth", "same APAAR ID"); other college's details hidden |
| Reports & Exports, Intake Reconciliation, Student Records | Institution Admin | pages load; buttons: Export CSV, Add Student, Upload New Batch |

Demo-guide decision paths checked through the API on the state left by E2E run #2: Myra Varghese's roll case
resolves once the other roll is corrected (200); reviewer escalates Kavya Kumar's case (200); staff cannot
decide an escalated case (403); admin resolve refused while the record still conflicts (409); admin dismiss
with justification accepted (200).

Not walked through in the browser (covered by API tests only): admin assignment, reviewer escalation to
admin decision, request re-review, CSV download contents, Validation Rules editing, Users & Roles.

## 5. End-to-end checks (run #1 and #2 identical)

```
S1 valid file: 60 inserted, 0 flagged, 0 cases · dashboard total +60 · visible in Student Records · import in audit
S3 every deliberate problem detected on its row · row 11 several problems at once · rows 13-30 clean ·
   10 errors, 2 warnings, 10 cases
S2 five rows flagged, five cases · exactly one active Vihaan Sharma · APAAR missing / invalid ·
   reviewer marks awaiting evidence · resolve refused while evidence outstanding ·
   any decision refused while awaiting evidence, however worded · evidence returns case to review ·
   correction creates version 2 that passes · dashboard issues -1, valid +1, total unchanged ·
   corrected record matches its sandbox reference · case resolves · version 1 preserved ·
   re-importing the same file adds nothing · still exactly one IIT25MCA004
S4 exact repeated row 6 skipped · rows 10-11 DUP_ROLL · rows 16-17 not flagged · row 22 POSSIBLE_DUP_PERSON ·
   row 26 DUP_APAAR_CROSS · rows 29-30 DUP_APAAR_SAME · both conflicting records kept ·
   duplicate review shows the matching record and why · dismissed with justification ·
   roll conflict cannot be resolved before fixing · roll corrected -> passes · roll case resolves
S5 rows 3, 6, 9, 12 differ from reference · other rows match · four reference-mismatch cases ·
   row 12 shows exact field differences (name, DOB) · correcting clears the mismatch · case resolves
S6 exactly the last 3 rows exceed the intake reference · Mechanical shows Potential discrepancy (+3)
S7 second college imports 50 rows · Ilampirai staff cannot see them · reviewer sees them ·
   direct access to another college's record refused (403)
Roles: staff cannot manage users · staff cannot change validation rules · reviewer cannot decide a case ·
   reviewer cannot correct records · admin can assign a case · reviewer reopens a decision ·
   staff re-decides after reopen
Every expected case in review_cases.csv was opened (29)
Metrics (staff, reviewer): totals equal the record lists; open cases equal the case list
Export: valid CSV with one row per open issue; identifiers masked
Oversight summary lists the staff decisions
Every file: every row filed under its programme column (7 files + re-import)
```

## 6. Automated test list (34)

Auth & roles (9): valid/invalid login · protected endpoints need a session · /me role and scope · staff see
only their institution · reviewer sees all · admin-only operations · reviewer cannot change college data ·
oversight summary access · audit trail access.
Corrections & cases (6): missing-APAAR workflow (awaiting evidence, refused decisions, evidence, correction,
resolve) · correction that remains invalid · reason and real change required · duplicate dismissed with
justification · assignment, escalation and reopen · manual student entry.
Dashboard & reports (6): dashboard equals lists · open-case metric equals case list · metrics follow each
operation · intake reconciliation counts committed records · export is valid CSV and neutralises formulas ·
audit records actor, action and outcome.
Import (13): valid batch · draft not on record · repeat import idempotent · exact duplicate row skipped ·
same roll different details flagged not merged · row-level errors · missing required column · unsupported,
empty and malformed files · submitted file locked · cross-institution APAAR collision · XLSX import ·
programme taken from each row · unknown programme flagged.

## 7. Readiness summary

**Ready for the SIH demonstration** on a freshly started instance, with the limitations in
`docs/SIH_DEMO_GUIDE.md` §6 stated openly. Every scenario in the brief ran successfully twice from a clean
database through the real API; the core flows were also driven in the browser, where nine UI/API defects
were found and fixed. Remaining risk: the Render free plan resets its SQLite database whenever the
service restarts or sleeps, so imports made before the demo can disappear (see `docs/DEMO_RESET.md`).

Design decision to disclose: the brief's Phase 2 asked for reviewers to resolve/assign cases. The role
design agreed earlier keeps decisions with college staff and assignment with the institution admin;
reviewers monitor, mark awaiting evidence, escalate and request re-review. This is enforced on the server.
