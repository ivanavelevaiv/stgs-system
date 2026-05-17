# STGS — Development Roadmap

**Scientific Travel Grant System — ФИНКИ / UKIM**

---

## 1. Product Summary

STGS digitizes the full lifecycle of scientific travel grants at ФИНКИ: application submission → multi-level approval → advance payment → expense report submission → settlement. It replaces the current paper/email/Excel process.

**Target:** First operational version within one academic semester.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) | SSR for forms and PDFs; file-based routing maps cleanly to roles |
| UI | shadcn/ui + Tailwind CSS | Accessible, customizable; quick to build role-specific dashboards |
| i18n | next-intl | Macedonian (Cyrillic) + English; RTL-safe |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) | Already provisioned; handles auth, file storage, RLS |
| Auth | Supabase Auth + iKnow OIDC/SAML provider | SSO via existing ФИНКИ identity service |
| File Storage | Supabase Storage | Documents (PDF/DOCX) and receipts (PDF/JPG/PNG) |
| OCR | Google Cloud Vision API (via Edge Function) | Best accuracy for scanned receipts in Cyrillic |
| Email | ФИНКИ SMTP relay (via Edge Function) | Required by SRS; notifications on status changes |
| Digital Signature | Supabase Edge Function → external MAdNS/UKIM PKI endpoint | Macedonia-recognized certificates |
| PDF Generation | react-pdf (server-side) | Decisions, archive documents |

---

## 3. Supabase Database Schema

### 3.1 Enums

```sql
-- User roles
CREATE TYPE user_role AS ENUM (
  'applicant', 'scientific_council', 'deanery',
  'accounting', 'hr', 'archive', 'it_admin'
);

-- Application lifecycle statuses
CREATE TYPE application_status AS ENUM (
  'draft',
  'submitted',
  'under_review_council',
  'under_review_deanery',
  'approved',
  'partially_approved',
  'rejected',
  'for_payment',
  'paid',
  'report_submitted',
  'in_settlement',
  'closed'
);

-- Approval decisions
CREATE TYPE approval_decision AS ENUM (
  'approved', 'partially_approved', 'rejected'
);

-- Payment/advance statuses
CREATE TYPE advance_status AS ENUM (
  'pending', 'issued', 'paid'
);

-- Settlement direction
CREATE TYPE settlement_direction AS ENUM (
  'refund_to_applicant', 'return_to_finki', 'balanced'
);

-- Settlement status
CREATE TYPE settlement_status AS ENUM (
  'pending', 'awaiting_proof', 'completed'
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'status_change', 'deadline_reminder', 'approval_required',
  'payment_confirmed', 'settlement_complete', 'duplicate_detected'
);

-- Expense categories
CREATE TYPE expense_category AS ENUM (
  'accommodation', 'transport', 'registration_fee', 'meals', 'other'
);

-- Document types for applications
CREATE TYPE document_type AS ENUM (
  'invitation_letter', 'paper_abstract', 'conference_program',
  'cv', 'travel_plan', 'proof_of_attendance', 'other'
);
```

### 3.2 Tables

#### `profiles`
Extends `auth.users`. Populated from iKnow on first login.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | FK → auth.users.id |
| role | user_role | Assigned by IT admin |
| first_name | text | From iKnow |
| last_name | text | From iKnow |
| department | text | From iKnow |
| title | text | e.g. "Вонреден Професор" |
| email | text UNIQUE | From iKnow |
| iknow_id | text UNIQUE | External identifier |
| is_active | boolean | For deactivation without deletion |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Users read their own row; it_admin reads/writes all.

---

#### `budgets`
Annual budget tracked per department.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| year | integer | e.g. 2026 |
| department | text | Nullable = faculty-wide |
| total_amount | numeric(12,2) | In MKD |
| allocated_amount | numeric(12,2) | Sum of approved grants; maintained by trigger |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint: `(year, department)`.

RLS: Applicants read own department; Deanery/accounting read all; it_admin writes.

---

#### `applications`
Core entity. One application per conference trip.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| applicant_id | uuid FK → profiles | |
| budget_id | uuid FK → budgets | Set on submission |
| conference_name | text | |
| conference_location | text | City, Country |
| conference_url | text | |
| paper_title | text | Nullable |
| travel_start_date | date | |
| travel_end_date | date | |
| purpose | text | Description of scientific value |
| requested_amount | numeric(12,2) | |
| approved_amount | numeric(12,2) | Nullable until decision |
| status | application_status | Default 'draft' |
| rejection_reason | text | Nullable |
| approval_notes | text | Nullable |
| archive_number | text | Nullable; assigned on close |
| report_deadline | date | Computed: travel_end_date + 14 days |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| submitted_at | timestamptz | Nullable |

RLS: Applicants see own rows; council/deanery/accounting see all submitted+; it_admin full.

---

#### `application_documents`
Files attached to an application during submission (R-01).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| application_id | uuid FK → applications | |
| document_type | document_type | |
| storage_path | text | Supabase Storage bucket path |
| file_name | text | Original filename |
| file_size_bytes | integer | |
| mime_type | text | application/pdf, application/vnd.openxmlformats... |
| uploaded_by | uuid FK → profiles | |
| uploaded_at | timestamptz | |

Storage bucket: `application-documents` (private, RLS-controlled).

---

#### `approvals`
One row per approval step (Scientific Council, then Deanery).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| application_id | uuid FK → applications | |
| approver_id | uuid FK → profiles | |
| approver_role | user_role | scientific_council or deanery |
| decision | approval_decision | |
| approved_amount | numeric(12,2) | Nullable for rejection |
| notes | text | Mandatory; justification |
| signature_payload | jsonb | Certificate details + timestamp from MAdNS |
| signed_at | timestamptz | |
| created_at | timestamptz | |

Unique constraint: `(application_id, approver_role)` — one decision per stage.

---

#### `advances`
Advance payment issued to applicant before travel (R-07, UC-03).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| application_id | uuid FK → applications UNIQUE | One advance per application |
| amount | numeric(12,2) | Equals approved_amount |
| status | advance_status | Default 'pending' |
| payment_reference | text | Nullable; entered by Accounting |
| payment_date | date | Nullable |
| issued_by | uuid FK → profiles | Accounting user |
| issued_at | timestamptz | |
| confirmed_by | uuid FK → profiles | Nullable |
| confirmed_at | timestamptz | Nullable |

---

#### `expense_reports`
Submitted after travel, within 14 days (R-08, UC-04).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| application_id | uuid FK → applications UNIQUE | |
| applicant_id | uuid FK → profiles | |
| total_claimed | numeric(12,2) | Sum of approved receipts |
| proof_of_attendance_path | text | Storage path |
| notes | text | Nullable |
| status | text | submitted → under_review → settled |
| submitted_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

#### `receipts`
Individual receipts attached to an expense report (R-09, R-10).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| expense_report_id | uuid FK → expense_reports | |
| storage_path | text | Supabase Storage |
| file_name | text | |
| content_hash | text | SHA-256 of file bytes; duplicate detection |
| amount | numeric(12,2) | Nullable until OCR or manual entry |
| currency | char(3) | Default 'MKD' |
| expense_date | date | Nullable |
| category | expense_category | |
| ocr_raw | jsonb | Raw OCR response payload |
| ocr_confidence | real | 0.0–1.0 |
| is_duplicate_suspect | boolean | Default false |
| is_manually_verified | boolean | Default false; set by Accounting |
| uploaded_at | timestamptz | |

Storage bucket: `receipts` (private).

---

#### `settlements`
Settlement calculation per application after expense report review (R-11, UC-05).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| application_id | uuid FK → applications UNIQUE | |
| advance_amount | numeric(12,2) | Snapshot at settlement time |
| claimed_amount | numeric(12,2) | Validated total from receipts |
| difference | numeric(12,2) | claimed - advance (positive = owe applicant) |
| direction | settlement_direction | |
| status | settlement_status | Default 'pending' |
| return_proof_path | text | Nullable; uploaded by applicant if they owe |
| payment_reference | text | Nullable; if ФИНКИ owes extra |
| processed_by | uuid FK → profiles | Accounting |
| processed_at | timestamptz | |
| created_at | timestamptz | |

---

#### `notifications`
In-app + email notification log (R-05, R-13).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| recipient_id | uuid FK → profiles | |
| application_id | uuid FK → applications | Nullable |
| type | notification_type | |
| title | text | |
| body | text | |
| is_read | boolean | Default false |
| email_sent | boolean | Default false |
| email_sent_at | timestamptz | Nullable |
| created_at | timestamptz | |

---

#### `audit_log`
Immutable event log for compliance and archiving (R-17, NFR-02).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_type | text | 'application', 'advance', 'settlement', etc. |
| entity_id | uuid | |
| action | text | e.g. 'status_changed', 'document_uploaded' |
| performed_by | uuid FK → profiles | |
| old_value | jsonb | Nullable |
| new_value | jsonb | Nullable |
| ip_address | inet | For security audit |
| performed_at | timestamptz | |

Append-only: no UPDATE/DELETE permissions granted on this table to any role.

---

### 3.3 Key Triggers & Functions

| Name | Fires On | Purpose |
|---|---|---|
| `update_budget_on_approval` | INSERT on `approvals` (deanery approved) | Deducts `approved_amount` from `budgets.allocated_amount` |
| `compute_report_deadline` | INSERT on `applications` | Sets `report_deadline = travel_end_date + 14` |
| `auto_create_settlement` | UPDATE on `expense_reports` (status → under_review) | Creates `settlements` row with initial calculation |
| `log_status_change` | UPDATE on `applications.status` | Inserts row into `audit_log` |
| `notify_on_status_change` | UPDATE on `applications.status` | Inserts row(s) into `notifications` |

---

### 3.4 Supabase Storage Buckets

| Bucket | Access | Contents |
|---|---|---|
| `application-documents` | Private (RLS) | Invitation letters, CVs, abstracts, travel plans |
| `receipts` | Private (RLS) | Scanned receipts (PDF/JPG/PNG) |
| `signed-decisions` | Private (read: applicant + archive) | OCR-stamped, digitally signed decision PDFs |
| `proof-of-attendance` | Private (RLS) | Conference certificates/badges |
| `return-proofs` | Private (RLS) | Proof of applicant returning excess funds |

---

### 3.5 Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `process-ocr` | Storage upload to `receipts` | Calls Vision API; updates `receipts.ocr_raw`, `.amount`, `.confidence` |
| `send-notification-email` | DB webhook on `notifications.email_sent = false` | Relay to ФИНКИ SMTP |
| `check-duplicate-receipt` | INSERT on `receipts` | Computes SHA-256; marks `is_duplicate_suspect` |
| `sign-decision` | HTTP from frontend (deanery action) | Calls MAdNS PKI; stores `signature_payload` in `approvals` |
| `generate-archive-pdf` | Application reaches 'closed' status | Generates signed decision PDF; uploads to `signed-decisions` bucket |
| `deadline-reminder-cron` | Scheduled (daily) | Checks `report_deadline`; inserts reminder notifications |

---

## 4. Use Case → Schema Mapping

| Use Case | Primary Tables | Edge Functions | Requirement Coverage |
|---|---|---|---|
| UC-01 Application Submission | `applications`, `application_documents` | — | R-01, R-14, R-15 |
| UC-02 Review & Approval | `approvals`, `applications`, `budgets` | `sign-decision` | R-02, R-03, R-04, R-06 |
| UC-03 Advance Payment | `advances`, `applications` | `send-notification-email` | R-07 |
| UC-04 Expense Report | `expense_reports`, `receipts` | `process-ocr`, `check-duplicate-receipt` | R-08, R-09, R-10 |
| UC-05 Settlement | `settlements`, `advances`, `expense_reports` | `generate-archive-pdf` | R-11 |
| UC-06 Budget Overview | `budgets`, `applications`, `advances` | — | R-06, R-12 |
| Cross-cutting | `notifications`, `audit_log` | `send-notification-email`, `deadline-reminder-cron` | R-05, R-13, R-17 |

---

## 5. Development Phases

### Phase 0 — Foundation (Week 1–2)
**Goal:** Deployable skeleton with auth, schema, and role-based navigation.

- [ ] Initialize Next.js 14 project (TypeScript, App Router, Tailwind, shadcn/ui)
- [ ] Configure next-intl for Macedonian + English
- [ ] Apply full Supabase schema (migrations)
- [ ] Configure Supabase Auth with iKnow OIDC provider
- [ ] Build profile sync: on first login, upsert `profiles` from iKnow claims
- [ ] Role-based route guard middleware
- [ ] Seed: budget rows for current year, test users for each role
- [ ] CI/CD: GitHub Actions → Vercel (or ФИНКИ server) preview deploys

**Deliverable:** Any iKnow user can log in, lands on a role-appropriate dashboard shell.

---

### Phase 1 — Application Submission (Week 3–4)
**Goal:** Applicant can submit a complete grant application. (UC-01)

- [ ] Application form: conference details, dates, amounts, purpose
- [ ] Auto-populate first_name / last_name / department / email from profile (R-14)
- [ ] Document upload component: drag-and-drop, type selector, size/format validation (R-01, R-15)
- [ ] Application checklist validation before submission
- [ ] Status transition: draft → submitted
- [ ] Applicant's "My Applications" list with status badges
- [ ] In-app notification + email on submission confirmation (R-05)

**Deliverable:** Applicant can submit an application end-to-end; Supabase Storage holds documents.

---

### Phase 2 — Review & Approval (Week 5–6)
**Goal:** Scientific Council and Deanery can review and decide. (UC-02)

- [ ] Scientific Council queue: list of submitted applications with filters
- [ ] Application detail view: documents viewer, budget context, requester profile
- [ ] Decision form: Approve / Partially Approve (amount field + justification) / Reject (R-03)
- [ ] Digital signature integration (R-04): call `sign-decision` Edge Function on submit
- [ ] Status flow: submitted → under_review_council → under_review_deanery → approved/partially_approved/rejected
- [ ] Trigger: `update_budget_on_approval` on Deanery decision (R-06)
- [ ] Email notification to applicant on each decision (R-05)
- [ ] Deanery decision auto-generates `advances` row (status: pending)

**Deliverable:** Full multi-step approval flow with digital signature and budget deduction.

---

### Phase 3 — Advance Payment (Week 7) ✅ COMPLETE
**Goal:** Accounting processes advance payment. (UC-03)

- [x] Accounting dashboard: list of applications grouped by status (approved / for_payment / paid)
- [x] "Issue advance" action: creates advances row, status → for_payment
- [x] "Confirm payment" action: enters payment_reference + date, status → paid; mock MAdNS R-07
- [x] Digital signature simulation by Accounting on confirmation
- [ ] Budget overview widget (Deanery): allocated vs. paid vs. remaining per department/year (R-06)

**Deliverable:** Payment status lifecycle complete; applicant sees real-time status updates.

---

### Phase 4 — Expense Report & OCR (Week 8–9) ✅ COMPLETE
**Goal:** Applicant submits final report; receipts are OCR-processed. (UC-04)

- [x] Expense report form (available only after status = paid) — `/applicant/applications/[id]/report/new`
- [x] Receipt upload: drag-and-drop, PDF/JPG/PNG, 10 MB limit, category + manual amount entry
- [x] `process-ocr` simulation: `/api/ocr-simulate` returns amount/currency/date/category + per-field confidence
- [x] SHA-256 content hash duplicate detection: client-side via `crypto.subtle.digest`; `is_duplicate_suspect` flag
- [x] OCR confidence breakdown UI: per-field bars (green/yellow/red), overall score, manual override
- [x] `src/lib/ocr-validation.ts`: cross-field validation (amount range, date in travel window, known currency)
- [x] Proof of attendance upload (`proof-of-attendance` bucket)
- [x] Status transition: paid → report_submitted on submit
- [ ] Status transition: report_submitted → in_settlement (Phase 5 trigger)
- [ ] Trigger: `auto_create_settlement` with initial calculation (Phase 5)

**Deliverable:** Applicant can submit receipts; OCR extracts data automatically with manual override.

---

### Phase 5 — Settlement & Archive (Week 10–11) ✅ COMPLETE
**Goal:** Accounting reviews and finalizes settlement; application archived. (UC-05)

- [x] Accounting settlement view: `/accounting/settlement/[id]` — advance vs claimed, receipt breakdown
- [x] Duplicate suspect queue: mark receipts as verified (include) or leave unverified (exclude)
- [x] Settlement calculator: real-time difference + direction badge (refund / return / balanced)
- [x] Confirm settlement: creates `settlements` row with direction/status; transitions application
- [x] Return flow: `return_to_finki` → status `in_settlement` (awaiting_proof); "Close" button when ready
- [x] Archive action: generates `archive_number` (СТГС-YYYY-XXXX), marks application `closed`
- [x] Archive role: `/archive` read-only search by archive_number, conference name, applicant
- [x] 5th demo user: `demo.archive@finki.ukim.edu.mk` — Бранко Стојановски (archive role)
- [x] RLS: added `settlements` INSERT + UPDATE policy for accounting; SELECT for archive role
- [ ] Edge Function `generate-archive-pdf`: signed PDF bundle → `signed-decisions` bucket (Phase 7)

**Deliverable:** Full settlement lifecycle; every closed application gets a generated archive number.

---

### Phase 6 — Reporting & Notifications (Week 12) ✅ COMPLETE
**Goal:** Budget dashboards, smart reminders, complete notification coverage. (UC-06)

- [x] Applicant budget widget: approved / paid / claimed / remaining on applicant dashboard (R-12)
- [x] Deanery budget report: `/budget` — total/allocated/remaining cards, utilisation bar, per-department breakdown (UC-06)
- [x] HR role: read-only dashboard `/hr` — all post-approval applications, summary counters, applicant details
- [x] Notification center: `/notifications` — in-app list, mark-as-read, mark-all-read, link to application (R-05)
- [x] Notification bell in sidebar: unread count badge, visible to all roles
- [x] Notification creation integrated: advance issued, advance paid, settlement return required, application closed
- [x] 6th demo button: HR role (Марко Димитриевски)
- [ ] Edge Function `deadline-reminder-cron`: daily check; insert reminders 7 days and 1 day before `report_deadline` (R-13) — deferred to Phase 7
- [ ] Email template polish: Macedonian + English variants (R-16) — deferred to Phase 7

**Deliverable:** Full observability for all roles; status changes generate in-app notifications.

---

### Phase 7 — Hardening & Launch (Week 13–14) 🔄 IN PROGRESS
**Goal:** Production-ready, secure, and performance-validated system.

- [x] RLS audit: full `pg_policies` review; 6 issues found and fixed (NFR-01, NFR-02) — see `docs/security/rls-audit-phase7.md`
- [x] Session expiry: Next.js middleware (session refresh + auth guard) + `InactivityGuard` client component auto-logs out after 30 min inactivity (NFR-01)
- [x] E2E test setup: Playwright initialized; UC-01 Application Submission happy path test written (`tests/e2e/uc01-application-submit.spec.ts`)
- [ ] GDPR / LZDP compliance check: data minimization, right-to-erasure plan
- [ ] End-to-end tests for remaining use cases (UC-02 through UC-06)
- [ ] Performance: application list page < 2s under 50 concurrent users
- [ ] Uptime target: 99.0% in ФИНКИ working hours (NFR-03)
- [ ] 10-minute onboarding test with a real applicant (NFR-04)
- [ ] iKnow production credentials + SMTP production relay
- [ ] MAdNS production certificate configuration
- [ ] User acceptance testing with stakeholders (each role)
- [ ] Soft launch: parallel operation with old process for 4 weeks

---

## 6. MoSCoW Priority Summary

| Priority | Requirements | Phases |
|---|---|---|
| **Must Have** | R-01,02,03,04,05,06,07,08,11,17,18 | 0–5, 7 |
| **Should Have** | R-09,10,12,13,14 | 1, 4, 6 |
| **Could Have** | R-15,16 | 1, 6 |
| **Won't Have (v1)** | Flight/hotel booking, non-travel grants | — |

---

## 7. Key Constraints (from SRS)

- Deanery must remain a **human** final approver — no automated approval path may bypass it.
- Digital signatures must use **UKIM/MAdNS certificates** accepted by Macedonian institutions.
- Mandatory **Macedonian (Cyrillic)** interface support.
- Physical originals of certain documents must still be submitted to Accounting — the system tracks this but does not replace it.
- Annual travel budget ≈ **100,000 MKD**; system overhead must not reduce it.
- First operational version due: **end of one academic semester** from project start.
