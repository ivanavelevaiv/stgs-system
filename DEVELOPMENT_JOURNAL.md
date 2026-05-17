# Development Journal — stgs-system

---

## 2026-05-17

### Task: Session Wrap-up — TypeScript Verification

**Timestamp:** 2026-05-17
**Prompt:**
> Update DEVELOPMENT_JOURNAL.md to document the successful completion of the full-fluid widescreen layout upgrades, the premium Tailwind UI refinements across all portal views, and verify that the TypeScript compiler passes with 0 errors. Then wrap up the session.

**Implementation:**
- Ran `npx tsc --noEmit` — exited with code 0, no output, **0 TypeScript errors**
- All premium UI sessions confirmed clean:
  - `src/app/globals.css` — `@keyframes shimmer` foundation used by all animated pages
  - `src/app/(dashboard)/applicant/page.tsx` — asymmetric bento grid, `STATUS_ACCENT` map, animated ping pulse
  - `src/app/(dashboard)/budget/page.tsx` — navy hero, 3 gradient stat cards, utilisation gauge, asymmetric 2+1 bento, `PipelineTile` components
  - `src/app/(dashboard)/accounting/page.tsx` — flex-row queue sections, `AppSection` component, ping dots, scale-press buttons
  - `src/components/accounting/settlement-view.tsx` — gradient-border duplicate alert, ledger calculator, `DIRECTION_META` map, scale-press CTAs
  - `src/components/accounting/advance-actions.tsx` — state machine fix + premium gradient cards
  - `src/app/(dashboard)/layout.tsx` — `w-full` on wrapper and `<main>`
  - `src/app/login/page.tsx` — split-screen with dark brand panel, 2×3 demo card grid

**Files changed:**
- None (verification only)

---

### Task: AdvanceActions State Machine Bug Fix

**Timestamp:** 2026-05-17
**Prompt:**
> Inspect AdvanceActions and ensure the payout confirmation flow is fully working. Verify the "Потврди исплата" action is visible when application status is "for_payment" or "approved". Ensure the onClick handler properly updates status to "paid" in Supabase. Double-check TypeScript and lint pass.

**Implementation:**
- Identified three `(applicationStatus, existingAdvance)` combinations that fell through all three `if` branches to `return null`, rendering a completely blank widget:
  1. `approved` + advance exists but `status = "issued"` — partial write failure where advance INSERT succeeded but app status update to `for_payment` did not
  2. `for_payment` + no advance record — advance INSERT failed but app status update succeeded
  3. `paid` + advance `status` still `"issued"` — advance status update failed after app was marked paid
- **State C fix**: changed condition from `applicationStatus === "paid" && existingAdvance?.status === "paid"` → `existingAdvance?.status === "paid"` — keyed on advance record only, tolerates app status lag
- **State A fix**: added `applicationStatus === "for_payment"` to the `!existingAdvance` branch — recovery path for case 2
- **State B fix**: changed from `existingAdvance && applicationStatus === "for_payment"` → `existingAdvance` — covers all remaining non-null advance cases including case 1 partial-failure recovery
- No changes to handlers, TypeScript types, or UI code — surgical condition-only fix
- `npx tsc --noEmit` confirmed 0 errors after change

**Files changed:**
- `src/components/accounting/advance-actions.tsx` (3 `if` condition lines modified)

---

### Task: Premium Login Page — Split-Screen Redesign

**Timestamp:** 2026-05-17
**Prompt:**
> Redesign login/page.tsx as a world-class split-screen layout: dark gradient left panel with organic glow, shimmer, and feature bullets; clean right panel with 2×3 grid of demo account cards.

**Implementation:**
- Replaced single centered card with `h-screen flex overflow-hidden` split-screen layout
- **Left panel (`hidden lg:flex lg:w-[45%]`)** — `from-slate-900 via-indigo-950 to-slate-950` gradient:
  - 3 organic glow blobs (blurred rounded-full circles in indigo/violet/blue at low opacity)
  - 28 px dot-grid texture overlay via inline `backgroundImage` radial-gradient at 4.5% opacity
  - Panel-wide shimmer sweep (`animate-[shimmer_9s_...]`) at 4% via opacity
  - 168 px `STGS` watermark in bottom-right corner at 4% opacity
  - ФИНКИ/УКИМ frosted badge (inline-flex with `bg-white/10 border border-white/15`)
  - Title block with its own inner shimmer (`animate-[shimmer_4.5s_1.5s_infinite]`) at 13% via opacity; "научни патувања" in `text-indigo-300`
  - 4 feature bullet points with `bg-indigo-500/20 border border-indigo-500/40` dot indicators
  - University credits at bottom in `text-white/28`
- **Right panel (`flex-1`)** — clean `bg-background` with `max-w-lg` content container:
  - Mobile-only STGS header (`lg:hidden`)
  - `rounded-xl` form inputs with `focus:ring-primary/30 transition-shadow`; submit button with spinner + scale press
  - Divider: `text-[10px] tracking-[0.2em]` label "ПРИСТАП ЗА ПРЕЗЕНТАЦИЈА"
  - **2×3 grid of demo cards** — each `rounded-xl border-2 border-border/70 bg-muted/20` with:
    - Colored role dot + `text-[9px] tracking-[0.18em]` role label (`ROLE_DOT`, `ROLE_TEXT`, `ROLE_SHORT` maps)
    - Name (parsed from `sublabel` via `· ` split) as `text-sm font-bold group-hover:text-primary`
    - Title/description as `text-xs text-muted-foreground`
    - `hover:border-primary/40 hover:shadow-md active:scale-[0.97]` transitions
    - Backdrop-blur loading overlay per-card when that demo is loading
- All 6 `handleDemoLogin` hooks and form state (`email`, `password`, `loading`, `demoLoading`, `error`) preserved unchanged

**Files changed:**
- `src/app/login/page.tsx` (rewritten)

---

### Task: Full-fluid Layout — Remove max-w Constraints

**Timestamp:** 2026-05-17
**Prompt:**
> Make the app fully fluid and full-width. Update the dashboard layout wrapper, strip max-w constraints from applicant, budget, accounting, hr, archive, and review pages.

**Implementation:**
- `src/app/(dashboard)/layout.tsx`: added `w-full` to the outer wrapper div and to `<main>` (`flex-1 overflow-auto w-full`)
- Stripped `max-w-5xl` (and `mx-auto` where present) from the root `<div>` of 6 pages, replacing with `w-full`:
  - `applicant/page.tsx`, `budget/page.tsx`, `accounting/page.tsx`, `hr/page.tsx`, `archive/page.tsx`, `review/page.tsx`
- Intentionally left `max-w-*` intact on detail/form pages (`review/[id]`, `accounting/[id]`, `accounting/settlement/[id]`, `applicant/.../report/new`, `notifications`) — narrow columns aid readability for single-record forms

**Files changed:**
- `src/app/(dashboard)/layout.tsx` (modified)
- `src/app/(dashboard)/applicant/page.tsx` (modified)
- `src/app/(dashboard)/budget/page.tsx` (modified)
- `src/app/(dashboard)/accounting/page.tsx` (modified)
- `src/app/(dashboard)/hr/page.tsx` (modified)
- `src/app/(dashboard)/archive/page.tsx` (modified)
- `src/app/(dashboard)/review/page.tsx` (modified)

---

### Task: Premium UI — Accounting Queue, Settlement View, Advance Actions

**Timestamp:** 2026-05-17
**Prompt:**
> Upgrade accounting/page.tsx and the settlement view to a high-end ticketing system with gradient borders, scale-press buttons, premium ledger rows, and a sleek duplicate-suspect alert banner.

**Implementation:**
- **`src/app/(dashboard)/accounting/page.tsx`** — full redesign:
  - Hero header: deep teal/emerald-950 gradient (distinct palette from budget/applicant pages)
  - Queue-count pills: compact color-coded chips (amber/blue/emerald/violet) shown above queue sections
  - `AppSection` component extracted from inner function — accepts `accentBorder`, `dotColor`, `chipCls` per section; renders `rounded-2xl` card with `divide-y` rows and animated ping dot on section headings
  - Each application row: flex layout (replaces `<table>`), `border-l-4` accent keyed to section color, `group` hover with primary color transition on conference name, scale-press "Обработи →" button
  - Empty state: dashed-border card with emoji + description
- **`src/components/accounting/settlement-view.tsx`** — premium redesign:
  - **Duplicate suspect banner**: 1 px gradient border wrapper (`p-[1px] rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-400`) with inner `bg-card rounded-[15px]`; warning emoji icon, unresolved count badge, per-receipt rows with amber/emerald tinted backgrounds; "Потврди" button with scale-press
  - **Settlement calculator**: ledger rows inside `rounded-xl overflow-hidden border` block; advance/receipts/excluded rows with semantic bg tints; difference row with large bold number colored per direction (emerald/orange/blue); direction summary card; confirm buttons with `hover:scale-[1.02] active:scale-[0.98] shadow-md`
  - All receipts: `rounded-2xl` card with header bar and hover rows, replacing plain `<ul>`
- **`src/components/accounting/advance-actions.tsx`** — premium redesign:
  - State A (issue advance): blue-indigo gradient mini card displaying the MKD amount (4xl font + shimmer); `rounded-2xl` wrapper; scale-press CTA
  - State B (confirm payment): `rounded-xl` form inputs with `focus:ring-primary/30` shadow, scale-press confirm button; amount displayed prominently in header
  - State C (paid): emerald gradient success card with shimmer — matches applicant paid-state aesthetic

**Files changed:**
- `src/app/(dashboard)/accounting/page.tsx` (rewritten)
- `src/components/accounting/settlement-view.tsx` (rewritten)
- `src/components/accounting/advance-actions.tsx` (rewritten)

---

### Task: Premium Bento Grid — Deanery Budget Dashboard UI Upgrade

**Timestamp:** 2026-05-17
**Prompt:**
> Upgrade the Deanery Budget Report (`/budget`) with gradient stat cards, shimmer animations, bento grid, color-coded progress bars, and premium hover effects. Do not change any data-fetching logic.

**Implementation:**
- Rewrote `src/app/(dashboard)/budget/page.tsx` JSX (all data fetching and business logic preserved):
  - **Hero header**: deep navy gradient (`indigo-950 → blue-950 → slate-900`), shimmer sweep + decorative translucent circles — distinct palette from the applicant dashboard to give each page its own identity
  - **3 equal-width gradient stat cards**: slate (total budget), amber-orange (allocated, shimmer delayed 0.8 s), emerald/red (remaining — flips to red gradient with shadow when `remaining < 0`; delays 1.6 s for staggered shimmer)
  - **Overall utilisation gauge**: large percentage readout (text-4xl, color-keyed to utilisation: blue < 60%, amber 60–85%, red ≥ 85%) with a gradient progress bar that uses the same 3-zone color scheme
  - **Asymmetric bottom bento** (`grid-cols-3`, 2+1 split):
    - Left (col-span-2): per-department breakdown — `rounded-2xl` card with header bar, `divide-y` rows, group hover with primary color transition on department name; each row has a color-coded `%` badge (blue/amber/orange/red) and a gradient progress bar using `barGradient` chosen by utilisation tier
    - Right (col-span-1): pipeline mini-tiles (Одобрени/Исплатени/Затворени) — small gradient cards (`amber`, `blue-indigo`, `emerald`) with staggered shimmer via inline `animation` style
  - **Empty state**: dashed-border card with emoji, description, matches applicant dashboard style
  - Removed the old `SummaryCard` component (replaced by inline gradient cards)

**Files changed:**
- `src/app/(dashboard)/budget/page.tsx` (rewritten — premium bento layout)

---

### Task: Phase 7 — Hardening & Launch (RLS Audit, Session Expiry, E2E Testing)

**Timestamp:** 2026-05-17
**Prompt:**
> Perform an RLS Audit, implement 30-minute session expiry, initialize Playwright with a UC-01 E2E test, and update ROADMAP + JOURNAL.

**Implementation:**

**RLS Audit (6 issues fixed via Supabase MCP execute_sql):**
- `notifications_insert_any_auth` (WITH CHECK true → staff-only): any authenticated user could inject notifications for arbitrary recipients. New policy `notifications_insert_staff` restricts INSERT to `accounting`, `scientific_council`, `deanery`, `it_admin`.
- `advances_write_accounting` (ALL → INSERT+UPDATE): ALL includes DELETE, which accounting should never do. Replaced with separate INSERT and UPDATE policies.
- `settlements_write_accounting` (ALL) + `settlements_update_accounting` (duplicate UPDATE): consolidated into `settlements_insert_accounting` + `settlements_update_accounting` (no DELETE).
- `budgets_select_all` (USING true → role-restricted): applicants and hr could query budget tables via REST API. Restricted to `deanery`, `accounting`, `it_admin`.
- 4 SECURITY DEFINER trigger functions callable via RPC by anon/authenticated: `REVOKE EXECUTE` applied to `handle_new_user`, `handle_approval_inserted`, `log_application_status_change`, `auto_create_settlement`. These are trigger-only functions.
- `handle_updated_at` mutable search_path: `ALTER FUNCTION … SET search_path = public` applied.
- `audit_log` append-only: confirmed via `pg_policies` query — no INSERT/UPDATE/DELETE policies exist for authenticated role. Writes only via SECURITY DEFINER triggers.
- Full audit report saved to `docs/security/rls-audit-phase7.md`.

**Session Expiry (NFR-01):**
- Created `src/middleware.ts`: standard Supabase SSR middleware that refreshes the JWT on every request and redirects unauthenticated users to `/login`. Uses `getUser()` (validates with Supabase server) rather than `getSession()` (trust-only).
- Created `src/components/layout/inactivity-guard.tsx`: client component mounted in dashboard layout. Listens to `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`, `click` events. Resets a 30-minute timer on each event. On timeout, calls `supabase.auth.signOut()` and redirects to `/login`.
- Added `<InactivityGuard />` to `src/app/(dashboard)/layout.tsx`.

**E2E Testing (Playwright):**
- Installed `@playwright/test` as devDependency.
- Created `playwright.config.ts`: chromium only, sequential workers, auto-starts `next dev` for local runs, supports `PLAYWRIGHT_BASE_URL` override for CI/Vercel.
- Created `tests/e2e/uc01-application-submit.spec.ts`: covers full UC-01 happy path — demo login, 4-step form (conference details, budget, document upload, review), submission, and assertion of the resulting entry on the applicant dashboard.
- Added `test:e2e`, `test:e2e:ui`, `test:e2e:report` scripts to `package.json`.
- Added playwright output dirs to `.gitignore`.
- Browser installation: run `npx playwright install chromium` before first test run.

**Files changed:**
- `src/middleware.ts` (created)
- `src/components/layout/inactivity-guard.tsx` (created)
- `src/app/(dashboard)/layout.tsx` (modified — added InactivityGuard import + mount)
- `playwright.config.ts` (created)
- `tests/e2e/uc01-application-submit.spec.ts` (created)
- `package.json` (modified — added @playwright/test dev dep + test scripts)
- `.gitignore` (modified — added Playwright output dirs)
- `docs/security/rls-audit-phase7.md` (created)
- `ROADMAP.md` (modified — Phase 7 🔄 in progress, 3 items checked)

---

## 2026-05-17

### Task: Premium Bento Grid — Applicant Dashboard UI Upgrade

**Timestamp:** 2026-05-17
**Prompt:**
> "Go all out—make it look like a high-end SaaS product with gradient stat cards, subtle shimmers, the animated pulse on the unread badge, and a proper asymmetric layout."

**Implementation:**
- Added `@keyframes shimmer` to `src/app/globals.css` — translateX(-100%) → translateX(100%) with skewX(-12deg) for a diagonal light-sweep effect
- Rewrote `src/app/(dashboard)/applicant/page.tsx` JSX (all data fetching and routing preserved):
  - **Hero header card**: full-width dark-gradient tile (`slate-900 → slate-800`) with shimmer sweep, decorative translucent circles, and a white "Нова апликација" CTA button with scale hover
  - **Asymmetric bento stat grid** (`grid-cols-3`, 2+1 split):
    - Large tile (col-span-2): blue-indigo gradient, 5xl font for the total-requested MKD figure, shimmer at 3 s
    - Right column — two stacked cards:
      - Approved: emerald gradient, 2xl number, shimmer offset by 1 s delay
      - In-review: violet-purple gradient, shimmer offset by 0.5 s delay, animated `ping` pulse dot beside the count when > 0
  - **Application list tile**: `rounded-2xl` card with `bg-muted/20` header bar, `divide-y` rows, left 4 px border accent per status (`STATUS_ACCENT` map, 12 statuses), group hover with conference name colour transition
  - **Empty state**: dashed-border card with emoji, subtitle, prominent CTA button
- All shadcn-style utilities used (no new packages)

**Files changed:**
- `src/app/globals.css` (modified — shimmer @keyframes added)
- `src/app/(dashboard)/applicant/page.tsx` (rewritten — premium bento layout)

---

## 2026-05-17

### Task: Phase 6 — Reporting & Notifications (UC-06)

**Timestamp:** 2026-05-17
**Prompt:**
> Build the Deanery Budget Report Dashboard, Applicant Budget Widget, Notification Center, HR View, 6th demo button, and update ROADMAP + JOURNAL.

**Implementation:**
- Seeded `demo.hr@finki.ukim.edu.mk` with role `hr` (Марко Димитриевски, Раководител на ЧР)
- Created `src/lib/notifications.ts` — `createNotification()` helper typed to DB `notification_type` enum
- Created `src/app/(dashboard)/budget/page.tsx` — Deanery budget dashboard with 3 summary cards (total/allocated/remaining), utilisation bar, pipeline breakdown (approved/paid/closed), per-department bars; gated to `deanery` + `it_admin`
- Created `src/app/(dashboard)/hr/page.tsx` — HR read-only view; all post-approval applications in a summary table with applicant name, department, conference, dates, approved amount, status badge + archive number; gated to `hr` + `it_admin`
- Created `src/app/(dashboard)/notifications/page.tsx` — server-fetched notification list passed to client component
- Created `src/components/notifications/notification-list.tsx` — client component; unread badge, mark-as-read per item, mark-all-read button
- Created `src/components/layout/notification-bell.tsx` — sidebar link with unread count badge
- Updated `src/app/(dashboard)/applicant/page.tsx` — budget widget (3 cards: total requested, total approved, in-review count) shown when user has applications
- Updated `src/app/(dashboard)/layout.tsx` — added HR nav link for `hr` role, budget link for `deanery`, both links for `it_admin`, notification bell for all roles with server-fetched unread count
- Updated `src/app/login/page.tsx` — 6th demo button "Демо најава (Човечки ресурси)" → Марко Димитриевски → `/hr`
- Integrated `createNotification()` into `advance-actions.tsx` (advance issued, payment confirmed) and `settlement-view.tsx` (return required, application closed)
- Fixed TS errors: `null` index in budget page (added `b.department ?` guard), `Set<string>` spread in hr page (changed to `Array.from`), `notification_type` enum mismatch (mapped to valid DB values)
- 0 TypeScript errors on final check

**Files changed:**
- `src/lib/notifications.ts` (created)
- `src/app/(dashboard)/budget/page.tsx` (created)
- `src/app/(dashboard)/hr/page.tsx` (created)
- `src/app/(dashboard)/notifications/page.tsx` (created)
- `src/components/notifications/notification-list.tsx` (created)
- `src/components/layout/notification-bell.tsx` (created)
- `src/app/(dashboard)/applicant/page.tsx` (modified)
- `src/app/(dashboard)/layout.tsx` (modified)
- `src/app/login/page.tsx` (modified)
- `src/components/accounting/advance-actions.tsx` (modified)
- `src/components/accounting/settlement-view.tsx` (modified)
- `src/app/(dashboard)/accounting/[id]/page.tsx` (modified)
- `src/app/(dashboard)/accounting/settlement/[id]/page.tsx` (modified)
- `ROADMAP.md` (modified — Phase 6 marked ✅ COMPLETE)

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

### Task: Phase 4 — UC-04 Expense Report & OCR workflow

**Timestamp:** 2026-05-17
**Prompt:**
> Build UC-04 Expense Report: form for paid applications, drag-and-drop receipt upload (PDF/JPG/PNG), OCR simulation with per-field confidence, SHA-256 duplicate detection, manual override UI, scikit-learn-equivalent TypeScript validation. Update ROADMAP and DEVELOPMENT_JOURNAL.

**Implementation:**

**Architecture:**
- Client-side SHA-256 hash via `crypto.subtle.digest` — computed before upload; checked against all hashes in the current session; sets `is_duplicate_suspect = true` on match
- `process-ocr` simulated as Next.js API route `/api/ocr-simulate`: deterministic seeded RNG on `storagePath+fileName` → plausible amount/currency/date/category + per-field confidence scores (varies with file size); mirrors real edge function contract
- `src/lib/ocr-validation.ts` — TypeScript cross-field validator (equivalent of scikit-learn pipeline): validates amount > 0 and ≤ 2× approved amount, date within ±1/+2 days of travel window, currency in known list; returns per-field warning map
- Duplicate detection stores `content_hash` in `receipts` row; `is_duplicate_suspect` shown as orange warning banner in receipt card

**Components:**
- `receipt-uploader.tsx`: drag-and-drop zone + file input fallback; per-file flow: validate → hash → upload to `receipts` bucket → OCR → validate fields → emit fully hydrated `ReceiptData`; graceful error states per file
- `receipt-card.tsx`: shows OCR confidence bars per field (green ≥85%, yellow ≥65%, red <65%); editable inputs for amount/currency/date/category; duplicate warning; sets `isManuallyOverridden=true` on any field edit
- `expense-report-form.tsx`: orchestrates state for all receipts; deadline countdown banner (red if ≤2 days); running total with diff vs approved amount; proof of attendance upload; on submit: inserts `expense_reports` + all `receipts` rows + sets application status → `report_submitted`

**Page:**
- `/applicant/applications/[id]/report/new` — server component; auth + role check; must be `paid`; shows read-only summary if already submitted (`report_submitted`/`in_settlement`/`closed`)
- `/applicant` dashboard — "Поднеси извештај →" button appears only for `paid` applications

**ROADMAP updates:**
- Phase 3 marked ✅ COMPLETE (with one minor item deferred: Deanery budget overview widget → Phase 6)
- Phase 4 marked 🔄 IN PROGRESS with all implemented items checked

**Build result:** `npx next build` — 11 routes, 0 TS errors, 0 lint errors

**Files changed:**
- `src/lib/ocr-validation.ts` (created)
- `src/app/api/ocr-simulate/route.ts` (created)
- `src/components/expense-report/receipt-card.tsx` (created)
- `src/components/expense-report/receipt-uploader.tsx` (created)
- `src/components/expense-report/expense-report-form.tsx` (created)
- `src/app/(dashboard)/applicant/applications/[id]/report/new/page.tsx` (created)
- `src/app/(dashboard)/applicant/page.tsx` (updated — report link for paid apps)
- `ROADMAP.md` (updated — Phase 3 ✅, Phase 4 🔄)

---

### Task: Phase 5 — UC-05 Settlement & Archive

**Timestamp:** 2026-05-17
**Prompt:**
> Implement Phase 5: Settlement & Archive. Accounting settlement view, duplicate suspect queue, settlement calculator with direction, archive action with archive_number, 5th demo button (Архива). Update ROADMAP Phase 4 → complete, log Phase 5.

**Implementation:**

**DB / RLS changes (Supabase MCP):**
- Added `settlements_insert_accounting` policy: accounting + it_admin can INSERT settlements
- Added `settlements_update_accounting` policy: accounting + it_admin can UPDATE settlements
- Added `settlements_select_archive` policy: archive role can SELECT settlements
- Added `reports_select_archive` policy: archive role can SELECT expense_reports
- Seeded `demo.archive@finki.ukim.edu.mk` / `Demo@Finki2026` — Бранко Стојановски, role `archive`

**`/accounting/page.tsx`:**
- Added `report_submitted` + `in_settlement` to the ACCOUNTING_STATUSES query
- Added "Порамнување" section below "Исплатено"
- Smart link: `report_submitted`/`in_settlement` → `/accounting/settlement/[id]`, others → `/accounting/[id]`

**`/accounting/settlement/[id]/page.tsx` (server):**
- Loads application (must be `report_submitted` or `in_settlement`)
- Loads expense_report, all receipts, advance amount, existing settlement
- Renders summary cards + `SettlementView` client component

**`settlement-view.tsx` (client):**
- Manages `receipts` state (duplicate resolution propagates locally + to DB in real-time)
- **Duplicate Queue**: each flagged receipt shows "Потврди" (include) / "Ќе се исклучи" (exclude) — calls `receipts.update(is_manually_verified)` live
- **Settlement Calculator**: 
  - Included = non-duplicate OR manually verified duplicate
  - `claimed_amount` = sum(included), `difference` = claimed - advance
  - `direction`: refund_to_applicant (>0.5), return_to_finki (<-0.5), balanced otherwise
  - Color-coded direction badge per case
- **Confirm Settlement**: INSERTs `settlements` row; if balanced/refund → immediately closes with `archive_number`; if return_to_finki → sets `in_settlement`, shows "Close" button
- **Archive number format**: `СТГС-{year}-{zero-padded-count}` — queries count of non-null archive_numbers to determine next sequence

**`/archive/page.tsx` (server):**
- Accessible to `archive` + `it_admin` roles
- Lists all `closed` applications with archive numbers in a table
- URL-param search (`?q=`) across archive_number, conference_name, applicant full name (client-side name filter after DB query)
- Shows: archive number (mono), applicant, conference, travel dates, approved amount, close date

**Layout + Login updates:**
- `layout.tsx`: accounting → "Сметководство"; added `archive` role → `/archive`; `it_admin` → all three links
- `login/page.tsx`: 5th demo button "Демо најава (Архива)" · Бранко Стојановски

**ROADMAP:**
- Phase 4 marked ✅ COMPLETE
- Phase 5 marked ✅ COMPLETE

**Build result:** `npx next build` — 13 routes, 0 TS errors, 0 lint errors

**Files changed:**
- `src/components/accounting/settlement-view.tsx` (created)
- `src/app/(dashboard)/accounting/settlement/[id]/page.tsx` (created)
- `src/app/(dashboard)/archive/page.tsx` (created)
- `src/app/(dashboard)/accounting/page.tsx` (updated — settlement queue + routing)
- `src/app/(dashboard)/layout.tsx` (updated — archive + it_admin nav)
- `src/app/login/page.tsx` (updated — 5th demo button)
- `ROADMAP.md` (updated — Phase 4 ✅, Phase 5 ✅)

---
