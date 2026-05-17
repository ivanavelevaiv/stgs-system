# STGS — Систем за управување со грантови за научни патувања

**Scientific Travel Grant System · Faculty of Computer Science and Engineering (ФИНКИ), UKIM**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%2017-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

STGS replaces ФИНКИ's paper/email/Excel grant workflow with a fully digital lifecycle: from **application submission** through **multi-level approval**, **advance payment**, **OCR-assisted expense reporting**, **financial settlement**, and **archival** — with complete audit logging and role-gated dashboards at every stage.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Feature Modules](#feature-modules)
- [Engineering Highlights](#engineering-highlights)
- [Database Schema](#database-schema)
- [Security Model](#security-model)
- [Local Setup](#local-setup)
- [Demo Credentials](#demo-credentials)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)

---

## Overview

ФИНКИ runs a competitive scientific travel grant programme. Before STGS, the process relied on physical forms, email threads, and manual Excel tracking — making status tracking opaque, settlement error-prone, and archiving inconsistent.

STGS digitizes the **entire lifecycle** in a single system, enforcing business rules at the database layer (PostgreSQL RLS), automating calculations (advance vs. claimed amount reconciliation), and providing every stakeholder with a role-appropriate, real-time view.

**Grant lifecycle — 12 statuses:**

```
draft → submitted → under_review_council → under_review_deanery
      → approved / partially_approved / rejected
      → for_payment → paid
      → report_submitted → in_settlement → closed
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript) | SSR data fetching, file-based routing per role |
| **UI** | Tailwind CSS + shadcn/ui | Accessible component system; Cyrillic-safe |
| **Backend** | Supabase (Postgres 17, Auth, Storage) | Database, JWT auth, file storage, RLS |
| **Auth** | Supabase Auth + iKnow OIDC/SAML | SSO via ФИНКИ's identity provider |
| **File Storage** | Supabase Storage (5 private buckets) | Application documents, receipts, signed decisions |
| **OCR Pipeline** | Next.js API route (`/api/ocr-simulate`) | Receipt field extraction with confidence scoring |
| **E2E Testing** | Playwright | UC-01 application submission happy path |
| **Language** | Macedonian (Cyrillic) | Primary UI language per SRS |

---

## System Architecture

### Role Hierarchy & Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STGS Workflow                               │
│                                                                     │
│  APPLICANT          SCIENTIFIC          DEANERY       ACCOUNTING   │
│  ─────────          COUNCIL             ───────       ──────────   │
│  Submit app    →    Review &       →    Final     →   Issue        │
│  (4-step form)      recommend           decision      advance      │
│                                                        ↓           │
│  Submit expense ←───────────────── [status: paid] ────┘           │
│  report + receipts                                                  │
│         ↓                                                           │
│         └──────────────────────────────→  Settle (compare         │
│                                            advance vs. claimed)    │
│                                                ↓                   │
│  ┌──── HR ───────────────────────────────── ARCHIVE ─────────┐    │
│  │  Read-only view of approved decisions   Closed apps with  │    │
│  │  (headcount, approved amounts)          archive numbers   │    │
│  └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Route Map

| Role | Primary Routes |
|---|---|
| `applicant` | `/applicant`, `/applicant/applications/new`, `/applicant/applications/[id]/report/new` |
| `scientific_council` | `/review`, `/review/[id]` |
| `deanery` | `/review`, `/review/[id]`, `/budget` |
| `accounting` | `/accounting`, `/accounting/[id]`, `/accounting/settlement/[id]` |
| `hr` | `/hr` |
| `archive` | `/archive` |
| `it_admin` | All routes |
| All roles | `/notifications` |

---

## Feature Modules

### UC-01 — Application Submission
- 4-step wizard: Conference Details → Budget Categories → Document Upload → Review
- Auto-populated applicant profile from iKnow SSO
- Drag-and-drop document upload (PDF/JPG/PNG) to private Supabase Storage bucket
- Budget breakdown across 5 categories (accommodation, transport, registration, meals, other)
- Client-side validation before each step; mandatory invitation letter

### UC-02 — Multi-Level Review & Approval
- Separate queues for Scientific Council and Deanery
- Decision form: Approve / Partially Approve (with amount override) / Reject
- Mandatory written justification (R-03)
- Simulated MAdNS/UKIM digital signature on approval (`signature_payload` stored in `approvals`)
- Database trigger automatically advances `application.status` and deducts from `budgets.allocated_amount`

### UC-03 — Advance Payment
- Accounting queue segmented by status: pending issuance → for payment → paid
- Issue advance action locks in `approved_amount` as advance
- Confirm payment: enter payment reference + date; simulated PKI signing
- In-app notification fired to applicant on both events

### UC-04 — Expense Report & OCR
- Report form available only when `status = paid`
- Per-receipt drag-and-drop upload; each file flows through:
  1. MIME/size validation
  2. SHA-256 hash computed via Web Crypto API → duplicate detection
  3. Upload to `receipts` Storage bucket
  4. OCR simulation (`/api/ocr-simulate`) returns amount, currency, date, category, and per-field confidence scores
  5. TypeScript cross-field validation (`src/lib/ocr-validation.ts`)
- Confidence breakdown UI: colour-coded bars (green ≥ 85%, yellow ≥ 65%, red < 65%) with manual override
- Deadline countdown banner (red if ≤ 2 days to `report_deadline`)

### UC-05 — Settlement & Archive
- Accounting settlement view shows advance vs. claimed amount in real time
- Duplicate suspect queue: accountant resolves flagged receipts (include/exclude)
- Settlement calculator determines direction automatically:
  - `difference > 0.5 MKD` → **refund to applicant** (ФИНКИ pays difference)
  - `difference < -0.5 MKD` → **return to ФИНКИ** (applicant returns excess)
  - Otherwise → **balanced** (no transfer needed)
- On close: generates `archive_number` (`СТГС-YYYY-XXXX`), transitions to `closed`
- Archive role: searchable read-only table of all closed applications

### UC-06 — Reporting & Notifications
- **Deanery budget dashboard** (`/budget`): total/allocated/remaining cards, utilisation progress bar, per-department breakdown
- **Applicant budget widget**: live stats (total requested, total approved, in-review count) on dashboard
- **HR read-only view** (`/hr`): all post-approval applications with applicant details, approved amounts, archive numbers
- **Notification center** (`/notifications`): per-item mark-as-read, mark-all-read, link to application; unread count badge in sidebar for all roles

---

## Engineering Highlights

### SHA-256 Duplicate Receipt Detection
Receipt files are hashed client-side using the browser's native **Web Crypto API** before upload — no server round-trip required for detection:

```ts
// src/components/expense-report/receipt-uploader.tsx
async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

The hash is stored in `receipts.content_hash`. If a duplicate is found within the session, `is_duplicate_suspect = true` is set and the receipt is flagged for manual accounting review before being included in settlement.

### OCR Field Validation Pipeline
`src/lib/ocr-validation.ts` implements a TypeScript cross-field validator that mirrors a scikit-learn pipeline — each field is independently scored, and cross-field rules (e.g. date must fall within the travel window ± 1 day, amount must not exceed 2× approved grant) are enforced with precise warning messages:

```ts
export function validateOcrFields(
  fields: OcrFields,
  context: ApplicationContext
): ValidationResult
```

### Row Level Security — Production Hardened
Every table is RLS-enabled. A Phase 7 security audit (see [`docs/security/rls-audit-phase7.md`](docs/security/rls-audit-phase7.md)) identified and fixed **6 vulnerabilities**:

| Issue | Risk | Fix |
|---|---|---|
| `notifications` INSERT open to all authenticated | Any user could inject notifications for others | Restricted to staff roles only |
| `advances` ALL policy | Accounting could DELETE advance records | Split to INSERT + UPDATE |
| `settlements` ALL policy + duplicate UPDATE | DELETE capability + redundant policies | Consolidated to INSERT + UPDATE |
| `budgets` SELECT open to all authenticated | Applicants could query budget totals via REST | Restricted to deanery/accounting/it_admin |
| 4 SECURITY DEFINER trigger functions callable via RPC | Functions callable unauthenticated via `/rest/v1/rpc/` | `REVOKE EXECUTE` from anon/authenticated |
| `handle_updated_at` mutable search_path | SQL injection vector | `SET search_path = public` |

The `audit_log` table is **strictly append-only**: no INSERT, UPDATE, or DELETE policies exist for any application-layer role. All writes flow exclusively through SECURITY DEFINER trigger functions.

### 30-Minute Inactivity Session Expiry (NFR-01)
Two complementary mechanisms enforce the session timeout:

1. **`src/middleware.ts`** — Next.js middleware runs on every request, refreshes the Supabase JWT cookie, and redirects unauthenticated users to `/login`. Uses `getUser()` (server-validated) rather than `getSession()` (trust-only).

2. **`InactivityGuard`** — Client component mounted in the dashboard layout. Tracks six activity events (`mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`, `click`). On 30 minutes of silence, calls `supabase.auth.signOut()` and redirects.

### Deterministic OCR Simulation
The `/api/ocr-simulate` route produces **consistent, realistic demo results** via a seeded FNV-style hash of the storage path and filename — the same file always returns the same confidence scores, making demo sessions reproducible without a live Vision API connection.

---

## Database Schema

11 tables, 9 enums, Postgres 17 (Supabase, eu-west-1).

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users`; holds role, title, department from iKnow |
| `budgets` | Annual budget per department; `allocated_amount` maintained by trigger |
| `applications` | Core grant application entity; 12-status lifecycle |
| `application_documents` | Files attached at submission; paths to `application-documents` bucket |
| `approvals` | One row per approval stage (council + deanery); includes signature payload |
| `advances` | Advance payment record; issued and confirmed by accounting |
| `expense_reports` | Post-travel expense submission; linked to one application |
| `receipts` | Individual receipts with OCR data, `content_hash`, confidence scores |
| `settlements` | Final reconciliation: advance vs. claimed; direction + status |
| `notifications` | In-app + email notification log |
| `audit_log` | Immutable event log; no application-layer write access |

**Storage buckets** (all private, RLS-enforced):
`application-documents` · `receipts` · `signed-decisions` · `proof-of-attendance` · `return-proofs`

---

## Security Model

| Concern | Implementation |
|---|---|
| Authentication | Supabase Auth (JWT); production: iKnow OIDC/SAML SSO |
| Authorisation | PostgreSQL Row Level Security on every table |
| Session expiry | 30-min inactivity auto-logout (middleware + client guard) |
| Audit trail | Append-only `audit_log` written by SECURITY DEFINER triggers |
| File access | Signed URLs (300 s TTL) generated server-side per request |
| Sensitive functions | EXECUTE revoked from `anon`/`authenticated` on all trigger functions |
| Input validation | Zod-style TypeScript validation at form boundaries + DB constraints |

---

## Local Setup

### Prerequisites

- Node.js ≥ 20
- A Supabase project with the schema applied (see `ROADMAP.md §3`)
- `.env.local` with your project credentials (see below)

### Installation

```bash
git clone https://github.com/ivanavelevaiv/stgs-system.git
cd stgs-system
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in your Supabase dashboard under **Project Settings → API**.

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the demo login buttons to authenticate as any role without needing real iKnow credentials.

### Production Build

```bash
npm run build
npm start
```

---

## Demo Credentials

The login page includes one-click demo buttons for all six roles. All share the same password: `Demo@Finki2026`.

| Role | Email | Name | Portal |
|---|---|---|---|
| Applicant | `demo.applicant@finki.ukim.edu.mk` | Марија Петровска | `/applicant` |
| Scientific Council | `demo.council@finki.ukim.edu.mk` | Илија Николовски | `/review` |
| Deanery | `demo.dekanat@finki.ukim.edu.mk` | Александар Ристески | `/review` + `/budget` |
| Accounting | `demo.accountant@finki.ukim.edu.mk` | Снежана Јованова | `/accounting` |
| Archive | `demo.archive@finki.ukim.edu.mk` | Бранко Стојановски | `/archive` |
| HR | `demo.hr@finki.ukim.edu.mk` | Марко Димитриевски | `/hr` |

---

## Running Tests

### E2E (Playwright)

Install the Chromium browser binary once:

```bash
npx playwright install chromium
```

Run against a local dev server (auto-started):

```bash
npm run test:e2e
```

Run against a deployed environment:

```bash
PLAYWRIGHT_BASE_URL=https://your-deployment.vercel.app npm run test:e2e
```

Interactive UI mode:

```bash
npm run test:e2e:ui
```

The test suite currently covers **UC-01** (Application Submission) end-to-end: demo login → 4-step form → document upload → submit → assertion. See [`tests/e2e/uc01-application-submit.spec.ts`](tests/e2e/uc01-application-submit.spec.ts).

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Auth-gated routes (shared sidebar layout)
│   │   ├── applicant/        # Applicant dashboard + application forms
│   │   ├── review/           # Council & Deanery review queue + detail
│   │   ├── accounting/       # Accounting queue, advance actions, settlement
│   │   ├── archive/          # Read-only archive search
│   │   ├── budget/           # Deanery budget dashboard
│   │   ├── hr/               # HR read-only decisions view
│   │   └── notifications/    # Notification centre
│   ├── api/
│   │   └── ocr-simulate/     # Deterministic OCR simulation endpoint
│   └── login/                # Login page with demo buttons
├── components/
│   ├── application-form/     # 4-step wizard (conference, budget, docs, review)
│   ├── accounting/           # AdvanceActions, SettlementView
│   ├── expense-report/       # ReceiptUploader, ReceiptCard, ExpenseReportForm
│   ├── layout/               # InactivityGuard, NotificationBell
│   ├── notifications/        # NotificationList (client component)
│   └── review/               # DecisionForm
├── lib/
│   ├── supabase/             # client.ts, server.ts
│   ├── application-status.ts # Status labels + Tailwind colour map
│   ├── iknow-mock.ts         # Mock iKnow SSO profile
│   ├── notifications.ts      # createNotification() helper
│   └── ocr-validation.ts     # Cross-field OCR validation pipeline
├── middleware.ts             # Session refresh + auth redirect
└── types/
    └── database.types.ts     # MCP-generated Supabase TypeScript types

tests/
└── e2e/
    └── uc01-application-submit.spec.ts

docs/
└── security/
    └── rls-audit-phase7.md   # Full RLS audit findings & remediation
```

---

## Acknowledgements

Built for **Факултет за компјутерски науки и инженерство** (ФИНКИ), Универзитет Св. Кирил и Методиј, Скопје.

The system is designed to be production-ready pending integration of live iKnow OIDC credentials, ФИНКИ SMTP relay configuration, and MAdNS PKI certificate provisioning for legally recognised digital signatures.
