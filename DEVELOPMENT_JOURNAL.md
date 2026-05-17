# Development Journal — stgs-system

---

## 2026-05-17

### Task: Connect project to Supabase MCP server

**Timestamp:** 2026-05-17T09:xx UTC
**Prompt:**
> Please connect this project to my Supabase project using the official Supabase MCP server.

**Implementation:**
- Created `.mcp.json` in project root with HTTP transport pointing to `https://mcp.supabase.com/mcp`
- Completed Supabase OAuth 2.1 browser login
- Listed projects to confirm connection — active project: `ocuaeirmvjyliolsfxhz` (eu-west-1, Postgres 17.6.1)
- Updated `.mcp.json` to scope server to project ref via `?project_ref=ocuaeirmvjyliolsfxhz`

**Files changed:**
- `.mcp.json` (created)

---

### Task: SRS analysis, schema design, and ROADMAP generation

**Timestamp:** 2026-05-17
**Prompt:**
> Read the SRS, create a task breakdown, and generate ROADMAP.md and DEVELOPMENT_JOURNAL.md.

**Implementation:**
- Analyzed full SRS for STGS (Систем за управување со грантови за научни патувања)
- 7 user roles, 18 functional requirements, 6 use cases, 4 external integrations
- Designed 11-table schema, 5 storage buckets, 6 edge functions, 7 development phases

**Files changed:**
- `ROADMAP.md` (created)
- `DEVELOPMENT_JOURNAL.md` (updated)

---

### Task: Phase 0 — Database migrations, Next.js scaffold, Supabase client setup

**Timestamp:** 2026-05-17
**Prompt:**
> Execute Phase 0: SQL migrations on Supabase, scaffold Next.js 14 project, set up Supabase client.

**Implementation:**
- Executed SQL migrations via Supabase MCP: 9 enums, 11 tables, 15 indexes, 6 trigger functions, 8 triggers, 42 RLS policies, 5 storage buckets, 11 storage policies
- Seeded 2026 faculty-wide budget row (100,000 МКД)
- Scaffolded Next.js 14 project manually: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `components.json`, `src/app/globals.css`, `src/app/layout.tsx`
- Set up Supabase clients: `client.ts` (browser), `server.ts` (SSR with cookies), `middleware.ts` (session refresh + auth redirect)
- Created `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Files changed:** (all scaffold + config files created)

---

### Task: Set up DEVELOPMENT_JOURNAL.md with auto-logging

**Timestamp:** 2026-05-17
**Prompt:**
> Create DEVELOPMENT_JOURNAL.md and set up auto-logging after every task.

**Implementation:**
- Created `CLAUDE.md` with standing instruction to update journal after every task
- Added `Stop` hook to `.claude/settings.local.json`: blocks session end if journal not updated in last 10 minutes

**Files changed:**
- `DEVELOPMENT_JOURNAL.md` (created)
- `CLAUDE.md` (created)
- `.claude/settings.local.json` (updated)

---

## 2026-05-17 (continued)

### Task: Phase 1 — UC-01 Applicant Dashboard and grant application form

**Timestamp:** 2026-05-17
**Prompt:**
> Build UC-01: Applicant Dashboard, multi-step grant application form, mock iKnow SSO, document upload to Supabase Storage, submit to `applications` table with status `submitted`.

**Implementation:**
- `src/lib/iknow-mock.ts` — mock iKnow SSO returning fixture profile (Марија Петровска, Вонреден Профессор)
- `src/app/login/page.tsx` — email/password login, redirects to `/applicant`
- `src/app/(dashboard)/layout.tsx` — auth-guarded layout with sidebar + LogoutButton
- `src/app/(dashboard)/applicant/page.tsx` — lists applications with status badges
- `src/lib/application-status.ts` — Macedonian labels + Tailwind colors for all 12 statuses
- Multi-step form: `step-conference-details.tsx`, `step-budget.tsx`, `step-documents.tsx`, `step-review.tsx`, `new-application-form.tsx`
- Submit flow: `crypto.randomUUID()` pre-generates app ID → INSERT `applications` → upload files to `application-documents` bucket → INSERT `application_documents` metadata rows

**TypeScript fix — `@supabase/ssr` version incompatibility:**
- Root cause: `@supabase/ssr@0.5.2` / `@supabase/supabase-js@2.105.4` type mismatch; `Schema` type collapsed to `never`
- Fix: upgraded `@supabase/ssr` to `0.10.3`; updated `setAll` cookie API signature in `server.ts` and `middleware.ts`
- Result: `npx tsc --noEmit` passes with 0 errors

**Files changed:**
- `src/lib/iknow-mock.ts`, `src/lib/application-status.ts` (created)
- `src/app/login/page.tsx`, `src/app/(dashboard)/layout.tsx`, `src/components/logout-button.tsx` (created)
- `src/app/(dashboard)/applicant/page.tsx`, `src/app/(dashboard)/applicant/applications/new/page.tsx` (created)
- `src/components/application-form/*.tsx` (5 files created)
- `src/types/database.types.ts` (replaced with MCP-generated types)
- `src/lib/supabase/server.ts`, `middleware.ts` (updated — ssr 0.10.3 API)

---

### Task: Demo login buttons for live presentation

**Timestamp:** 2026-05-17
**Prompt:**
> Add "Демо најава (Апликант)" and "Демо најава (Деканат)" buttons to the login page that auto-authenticate.

**Implementation:**
- Seeded two demo users in `auth.users` + `auth.identities` via SQL
- Profiles: Марија Петровска (applicant), Александар Ристески (deanery/Декан)
- Added `DEMO_USERS` constant and demo button section ("Демо пристап" divider) to login page
- Both buttons call `supabase.auth.signInWithPassword` with hard-coded credentials

**Demo credentials:**
- Апликант: `demo.applicant@finki.ukim.edu.mk` / `Demo@Finki2026`
- Деканат: `demo.dekanat@finki.ukim.edu.mk` / `Demo@Finki2026`

**Files changed:**
- `src/app/login/page.tsx` (updated)

---

### Task: Fix "Database error querying schema" — missing auth.identities rows

**Timestamp:** 2026-05-17

**Root cause:** Direct SQL `INSERT INTO auth.users` does not create `auth.identities` rows. GoTrue requires `auth.identities` with `provider='email'` to authenticate email/password logins.

**Fix:** Inserted `auth.identities` rows for both demo users. Note: `email` column is `GENERATED ALWAYS AS` — must be omitted from INSERT.

**Lesson learned:** Always insert into both `auth.users` AND `auth.identities` when seeding via raw SQL. The Admin API handles this automatically.

---

### Task: Fix persisting "Database error querying schema" — NULL token columns

**Timestamp:** 2026-05-17

**Root cause (from auth logs):**
```
sql: Scan error on column index 3, name "confirmation_token": converting NULL to string is unsupported
```
GoTrue scans token columns into Go `string` (not `*string`). Raw INSERT left `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change` as NULL.

**Fix:** `UPDATE auth.users SET confirmation_token='', recovery_token='', email_change_token_new='', email_change='' WHERE id IN (...)`.

**Lesson learned:** When seeding `auth.users` via raw SQL, set all six token columns to `''`: `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, `reauthentication_token`.

---

### Task: Phase 2 — UC-02 Review Dashboard and Decision Flow

**Timestamp:** 2026-05-17
**Prompt:**
> Build the Review Dashboard for Scientific Council and Deanery roles: queue, application detail, decision form (Одобри/Делумно одобри/Одбиј), required justification (R-03), mock digital signature (R-04), budget deduction on approval.

**Implementation:**

**Trigger flow (Phase 0 DB):**
- Council approval on `under_review_council` → status → `under_review_deanery`
- Deanery approval → status → `approved`/`partially_approved`, `approved_amount` set, budget `allocated_amount` incremented
- Rejection by either → status → `rejected`, `rejection_reason` set

**3rd demo user seeded:**
- `demo.council@finki.ukim.edu.mk` / `Demo@Finki2026` — Илија Николовски, Претседател на Научен совет (scientific_council)
- All `auth.users` token columns set to `''`, `auth.identities` row created

**Login page:** Added 3rd demo button "Демо најава (Совет)"; fixed deanery redirect to `/review`

**Dashboard layout:** Role-aware nav — reviewer roles see "Преглед на апликации"; applicant sees "Мои апликации" / "Нова апликација"

**Review queue (`/review`):** Status filter by role; table with applicant, conference, dates, amount, status badge, "Разгледај →" link

**Application detail (`/review/[id]`):** Applicant info, conference details, budget, documents with signed download URLs (300s TTL), approval history, conditional decision form

**Decision form:** Radio (Одобри / Делумно одобри / Одбиј), amount field, required notes (R-03), "Потпиши и финализирај одлука" spinner button (mock MAdNS PKI R-04). On submit: pre-transitions status for council, links budget_id for deanery, inserts `approvals` row with `signature_payload` JSON — DB trigger handles rest.

**Files changed:**
- `src/app/login/page.tsx` (updated — 3rd demo button, deanery redirect fixed)
- `src/app/(dashboard)/layout.tsx` (updated — role-aware nav)
- `src/app/(dashboard)/review/page.tsx` (created)
- `src/app/(dashboard)/review/[id]/page.tsx` (created)
- `src/components/review/decision-form.tsx` (created)

---

### Task: Polish logout button in sidebar

**Timestamp:** 2026-05-17
**Prompt:**
> Add a persistent, visible "Одјави се" button to the shared dashboard layout using shadcn/ui styling.

**Implementation:**
- Added `LogOut` icon from lucide-react
- Added `loading` state — shows "Одјавување..." and disables during sign-out
- Styled with transparent border baseline → `border-destructive/40` + red text + subtle red bg on hover
- Icon shifts left on hover for polish; sits in sidebar footer visible on every authenticated page

**Files changed:**
- `src/components/logout-button.tsx` (updated)
- `DEVELOPMENT_JOURNAL.md` (updated)

---

### Task: Fix Vercel build error — unescaped entity in advance-actions.tsx

**Timestamp:** 2026-05-17
**Prompt:**
> Fix the Vercel build error: unescaped double quote on line 169 of advance-actions.tsx causing react/no-unescaped-entities lint failure.

**Implementation:**
- Root cause: closing `"` (ASCII U+0022) in Macedonian quote pair `„За исплата"` in JSX text content — ESLint `react/no-unescaped-entities` flags raw `"` in JSX
- Fix: replaced raw double-quote with HTML numeric entity `&#8221;` (right double quotation mark) and opening with `&#8222;` — numeric entities are safe in JSX text nodes and pass the lint rule

**Files changed:**
- `src/components/accounting/advance-actions.tsx` (line 169 fixed)

---

### Task: Phase 3 — UC-03 Accounting Queue and Payment Confirmation

**Timestamp:** 2026-05-17
**Prompt:**
> Complete Phase 3: finish UC-03 — Accounting queue, payment reference confirmation, and 4th demo button (Сметководство).

**Implementation:**
- `src/app/(dashboard)/accounting/page.tsx` — accounting queue grouped in 3 sections: "Чека на издавање" (approved/partially_approved), "За исплата" (for_payment), "Исплатено" (paid); redirects non-accounting roles
- `src/app/(dashboard)/accounting/[id]/page.tsx` — detail page for accountant: renders `AdvanceActions` widget at top, plus applicant info, conference details, approval decisions, and documents
- `src/app/(dashboard)/layout.tsx` — added `accounting` role branch to sidebar nav → routes to `/accounting`
- `src/app/login/page.tsx` — 4th demo button: Снежана Јованова (Сметководител), redirects to `/accounting`
- Supabase: seeded `demo.accountant@finki.ukim.edu.mk` / `Demo@Finki2026` with role `accounting` — used split INSERT (auth.users) + UPSERT (profiles) to work around trigger that auto-creates a profiles row on user insert

**4th demo credentials:**
- Сметководство: `demo.accountant@finki.ukim.edu.mk` / `Demo@Finki2026`

**Build result:** `npx next build` — 9 routes, 0 errors, 0 TS errors

**Files changed:**
- `src/app/(dashboard)/accounting/page.tsx` (created)
- `src/app/(dashboard)/accounting/[id]/page.tsx` (created)
- `src/app/(dashboard)/layout.tsx` (updated)
- `src/app/login/page.tsx` (updated)
- `src/components/accounting/advance-actions.tsx` (updated)

---
