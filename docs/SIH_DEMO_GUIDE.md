# APAAR ReconX — SIH26263 Demonstration Guide

Team: We Aren't Robots · Independent SIH prototype (not an official AICTE / Ministry of Education system).

Every step below was executed against this build (see `docs/TEST_REPORT.md`). Page and button names are
exactly as they appear in the app.

## 0. Before you present (5 minutes)

1. Open the live site 2–3 minutes early so the free server wakes up. A wake-up is also a fresh reset (see
   `docs/DEMO_RESET.md`).
2. Have the upload files ready. In the app, **Bulk Import** lists them under the sample files, each with a
   download link. They are also in `demo-data/`.
3. Accounts. The login page has quick sign-in buttons for the first three; type the fourth.

| Role | Email | Password |
|---|---|---|
| Institution Admin (Ilampirai Institute of Technology) | admin@college.edu.in | admin123 |
| College Staff (Ilampirai) | staff@college.edu.in | staff123 |
| College Staff (Tamravarni College of Engineering) | staff.tce@college.edu.in | staff123 |
| Oversight Reviewer (all colleges) | reviewer@reconx.in | reviewer123 |

These are prototype accounts on a demo deployment. Say so if asked.

**Every upload works the same way:** Bulk Import → drop the file → **Proceed to Column Mapping** →
(columns map automatically; the programme comes from each row's `programme` column) →
**Save Mapping & Run Validation** → review the cards and table on **Validation Results** →
**Confirm & Submit for Review**. Nothing reaches Student Records, the dashboard or Cases before that submit.

## 1. Opening (1 minute)

> "Colleges submit admission data with APAAR IDs. Mistakes like missing IDs, the same student admitted twice,
> or one ID used at two colleges are found late and by hand. APAAR ReconX checks every row on upload, opens a
> review case for each problem, and leaves the decision to a person, with every action recorded."

Show **Overview** as College Staff: totals, records passing checks, issues, open cases.

## 2. Scenarios

### S1 — Clean import (College Staff) · `students_valid.csv` (60 rows, Information Technology)
Import as above. Expected: **60 evaluated, 60 valid**. After submit: "60 record(s) added, 0 skipped,
0 flagged…, 0 review case(s) opened". **Overview** total rises by 60. **Student Records**, search `IIT25IT`.
> "A clean file goes straight in, and the import itself is in the audit trail."

### S2 — Missing APAAR ID: Vihaan Sharma, IIT25MCA004 · `students_missing_apaar.csv` (40 rows, MCA)
1. Import. Expected: 35 valid, **5 critical errors** (rows 4, 11, 19, 27, 35: "APAAR ID is missing"); after
   submit, 5 review cases.
2. Sign in as **Oversight Reviewer** → **Cases** → search `Vihaan` → **Review case**. Point out the reviewer
   only has **Mark awaiting evidence** and **Escalate**. Type a note ("Please attach the APAAR card copy")
   and click **Mark awaiting evidence**.
3. Sign in as **College Staff** → **Cases** → Vihaan → type a reason and click **Resolve**. It is
   **refused**: "This case is awaiting evidence…".
   > "The system won't let a case be closed while it is still waiting for evidence."
4. Post a note "APAAR card copy received", tick **Add as evidence**, and send. The case returns to *Under review*.
5. **View Profile →** → **Submit Correction** → *New APAAR ID*: `110200000004` (a documented test value) →
   reason → **Confirm & Save Version**. Expected: "Saved as version 2. The record now passes all checks."
   Show **Audit Version History (2)** (version 1 is preserved) and **Reconciliation with reference record**
   (all fields agree with the sandbox record).
6. Back in **Cases** → Vihaan → reason "APAAR ID added from the card copy; record passes all checks" →
   **Resolve**. Accepted.
7. Optional: import the same file again. Result: "0 record(s) added, 40 skipped". There is still exactly one
   IIT25MCA004.
   > "Re-uploading is safe: nothing is duplicated and nothing is overwritten. Changes go through corrections."

### S3 — Data errors · `students_invalid.csv` or `.xlsx` (30 rows, AI & Data Science)
After **Save Mapping & Run Validation**, use **Errors Only** / **Warnings**. Rows 1–12 each have a deliberate
problem:
* missing name/APAAR (1, 2);
* malformed APAAR (3–5);
* impossible or too-young DOB (6, 7);
* admission before birth (8);
* gender and email format (9, 10, warnings);
* several problems on one row (11: missing field, gender and email);
* a missing required field (12).

Rows 13–30 pass. Expected: 10 errors, 2 warnings; after submit, 10 cases.
> "Each problem is reported on its own row with a plain-language reason, before anything is saved."

### S4 — Duplicates · `students_duplicates.csv` (34 rows, CSBS)
After submit: 33 added, **1 skipped** (row 6 repeats row 5 exactly), 6 cases. Open **Duplicate Review**:
* **Myra Varghese / Saanvi Shetty**: same roll IIT25CSBS010 for two different students (DUP_ROLL).
* **Harini Krishnan** (row 22): same name and date of birth as roll IIT25CSBS021. Shown as "Why this pair
  was selected: same name and date of birth".
* **Kavya Kumar** (row 26): the APAAR ID is already active at another college. That college's details show
  as *Hidden* to college users.
* **Vivaan Pillai / Kavya Varghese** (rows 29–30): one APAAR ID on two rows.
* Rows 16–17 have similar names but different dates of birth, and are correctly **not** flagged.

Decisions (College Staff, from **Open case to record a decision**):
* Harini: reason "Different students: parents' names differ on the admission forms" →
  **Dismiss — not an issue**.
* Saanvi Shetty (the mistyped roll): **View Profile →** → **Submit Correction** → *Roll Number*
  `IIT25CSBS035` → save. Back in the case → **Resolve**. Myra Varghese's case can now be resolved too, because
  the roll conflict is gone.
* Kavya Kumar: as **Oversight Reviewer** → **Escalate** with a reason. Escalated cases are decided by the
  **Institution Admin**, for example **Dismiss — not an issue** with "Transferred; withdrawal letter from the
  previous college attached". Resolving is refused while the record still conflicts.
> "A match is a reason to review, not proof. We never merge or delete records automatically; both records stay
> until a person decides, and the reason is recorded."

### S5 — Reconciliation with reference records · `students_reconciliation.csv` (16 rows, M.Tech CSE)
After submit: 4 cases (rows 3, 6, 9, 12). **Cases** → **Reference Mismatch** tab, or open a student such as
IIT25MTCS012. **Reconciliation with reference record** shows field by field what differs (row 12: name and
date of birth). Add evidence, then **Submit Correction** with the reference values, then **Resolve**.
> "Reference data here is a sandbox dataset we created. In production this is where a registry connector would
> plug in. We don't claim any official APAAR verification."

### S6 — Intake over the reference · `students_intake_overflow.csv` (18 rows, Mechanical)
Must be run on a fresh instance. Expected: the **last 3 rows** are flagged "Potential intake discrepancy —
review required". After submit, **Intake Reconciliation** shows Mechanical Engineering as
*Potential discrepancy — review required* with difference **+3**.
> "We compare enrolment with the intake reference (approved, supernumerary and NRI seats) and raise a review
> item. It is not a finding of wrongdoing."

### S7 — College isolation · `students_other_institution.csv` (50 rows, MCA, Tamravarni)
Sign in as `staff.tce@college.edu.in` and import it. Then:
* Ilampirai **College Staff** → **Student Records** → search `TCE25MCA` → **0 results**.
* **Oversight Reviewer** → same search → **50**.
> "Each college sees only its own students; the server enforces this, not just the screen."

### Wrap-up views
* **Reports & Exports** → **Export CSV**: a spreadsheet-safe CSV with masked IDs.
* **Review Monitoring** (Admin/Reviewer): recent decisions, escalations, recurring problems.
* **Audit Trail**: who did what, when, and why.
* **Validation Rules**: the institution's configurable checks.
* **Student Record** → **Enrolment Record**: the printable record.

## 3. Who does what (enforced by the server)

| Action | College Staff | Institution Admin | Oversight Reviewer |
|---|---|---|---|
| Upload, validate, submit files | ✓ | ✓ | — |
| Correct records (new version + reason) | ✓ | ✓ | — |
| Resolve / dismiss cases | ✓ | ✓ | — |
| Assign cases (**Assigned to** → **Save**) | — | ✓ | — |
| Mark awaiting evidence | ✓ | ✓ | ✓ |
| Escalate | — | ✓ | ✓ |
| Request re-review of a closed case | — | — | ✓ |
| Users & Roles, Validation Rules (edit) | — | ✓ | — |
| See other colleges | — | — | ✓ |

## 4. Likely judge questions

* **"Is this connected to APAAR / DigiLocker?"** No. Identifiers are only format-checked. Reconciliation runs
  against a sandbox reference dataset. Connectors are shown as sandbox on **Integrations & Sources**.
* **"What if two records really are the same student?"** Staff record the decision with a reason. A wrong
  record is corrected, not deleted, and the history stays.
* **"Can someone close a case without fixing it?"** No. A case can't be resolved while the record still
  fails its checks, or while it is awaiting evidence. Data errors can't be dismissed.
* **"Why can't the reviewer resolve?"** Decisions sit with the college that owns the data. The reviewer
  oversees, escalates and can reopen.
* **"How is privacy handled?"** IDs are masked everywhere. Revealing a full ID is limited to the college's
  own staff and is logged. Exports are masked.

## 5. Implemented

* CSV/XLSX import with auto column mapping, a per-row programme, and a preview before submit.
* Row-level validation:
  * required fields;
  * APAAR format;
  * date and age rules;
  * gender and email format;
  * institution-configurable rules.
* Duplicate detection:
  * the same APAAR ID within the college;
  * the same APAAR ID at another college;
  * the same roll number;
  * the same name and date of birth;
  * exact repeated rows.
* Idempotent re-imports with an added / skipped / flagged / cases summary.
* Review cases with history, evidence, awaiting evidence, escalation, assignment, re-review and justified
  decisions.
* Versioned corrections with a mandatory reason; the previous version is always kept.
* Intake reconciliation per programme.
* Sandbox reference reconciliation.
* Dashboard figures that match the record lists.
* Reports, a formula-safe masked CSV export, a full audit trail, three enforced roles and college isolation.

## 6. Limitations (say them before you're asked)

* There is no live APAAR, DigiLocker, AISHE or AICTE connection; reference data is fictional sandbox data.
* All colleges, students and IDs are fictional.
* No notifications: email and SMS are not built.
* An import never updates existing records; changes go through **Submit Correction**.
* OCI and foreign-national seats are not tracked separately in the intake reference.
* The demo deployment uses SQLite on a free host and resets when it restarts or sleeps. Production would use
  PostgreSQL.
* Prototype accounts have known passwords and there is no SSO yet ("Government SSO — coming soon").
* Evidence is recorded as notes; there is no document upload.
