# PRESENTATION GUIDE — STGS Faculty Demo
### Систем за управување со грантови за научни патувања
**Target slot:** 3–5 minutes | **Audience:** FINKI Faculty / Academic Committee

---

## 1. Presentation Timeline & Pacing

| Elapsed | Duration | Section | Key Message |
|---------|----------|---------|-------------|
| 0:00 | 30 s | **Opening statement** | "We built a production-grade grants management system — end-to-end, in a single session, using AI as our primary engineering tool." |
| 0:30 | 45 s | **System overview** | One sentence per role: Applicant → Council → Deanery → Accountant → Archive. Name the SRS, 18 functional requirements, 7 user roles. |
| 1:15 | 2:00 | **Live demo** | Follow Demo Script (Section 2). Target: login → submit application → OCR drop → duplicate banner. This is the visual centrepiece — do not rush it. |
| 3:15 | 45 s | **Development process** | Show `DEVELOPMENT_JOURNAL.md` briefly; state the workflow: every feature was built by submitting a structured prompt, reviewing the output, and iterating. Zero boilerplate typed by hand. |
| 4:00 | 45 s | **AI reflection** | Two sentences on advantages, two on limitations. Close with: "The human engineer's role shifted from syntax to supervision." |
| 4:45 | 15 s | **Close** | "All SRS requirements implemented. System is live. Questions?" |

> **Pacing rule:** If the demo runs long, cut the AI Reflection to one sentence each. Never cut the live demo.

---

## 2. Software Live Demo Script

### Pre-flight (before entering the room)
- Open browser to the deployed app URL (or `http://localhost:3000` with `npm run dev` running).
- Have the login page visible and idle — do not pre-authenticate.
- Keep DevTools closed.

---

### Step 1 — Applicant Login (Марија Петровска)
1. On the login page, locate the **"ПРИСТАП ЗА ПРЕЗЕНТАЦИЈА"** demo card grid.
2. Click the first card: **"Марија Петровска — Апликант"**.
3. The button shows a loading spinner; the app redirects automatically to `/applicant`.
4. **Say:** *"One click — the system authenticates via Supabase Auth with JWT session management. No credentials to type."*

### Step 2 — Applicant Dashboard
1. Point to the **asymmetric bento grid**: total requested amount (large tile), approved count, and in-review applications.
2. Identify one application with status **„Исплатена"** (paid) — this is the one used for the expense report.
3. **Say:** *"Every status transition in this system is enforced at the database layer via Row-Level Security. The UI reflects state; it never enforces it."*

### Step 3 — Navigate to Expense Report
1. On the paid application row, click **"Поднеси извештај →"**.
2. The form loads at `/applicant/applications/[id]/report/new`.
3. Point out the **deadline countdown banner** at the top (red if ≤ 2 days remaining).

### Step 4 — OCR Receipt Drop (R-09 demonstration)
1. Drag any `.pdf`, `.jpg`, or `.png` file onto the **drag-and-drop upload zone**.
2. The uploader immediately:
   - Validates file type and size client-side.
   - Computes a **SHA-256 hash** via `crypto.subtle.digest` (no server round-trip).
   - Uploads to Supabase Storage (`receipts` bucket).
   - Calls the simulated OCR endpoint (`/api/ocr-simulate`).
3. A **receipt card** appears with:
   - Per-field OCR results: amount, currency, date, category.
   - **Confidence bars** — green (≥ 85%), yellow (≥ 65%), red (< 65%).
   - Editable fields; any manual edit sets `isManuallyOverridden = true`.
4. **Say:** *"The OCR pipeline mirrors a real edge-function contract. TypeScript cross-field validation — analogous to a scikit-learn pipeline — flags amount overruns, date mismatches, and unknown currencies automatically."*

### Step 5 — SHA-256 Duplicate Warning Banner (R-09 / R-10)
1. Drag the **same file** onto the upload zone a second time.
2. The system computes the SHA-256 hash client-side, matches it against the existing `content_hash` in the `receipts` table, and sets `is_duplicate_suspect = true`.
3. An **amber gradient warning banner** appears at the top of the settlement view:
   - Displays the unresolved duplicate count.
   - Shows per-receipt "Потврди" (include) / "Ќе се исклучи" (exclude) action buttons.
4. **Say:** *"This is SRS requirement R-09 — duplicate receipt detection — and R-10 — mandatory human resolution before settlement confirmation. The accountant cannot bypass this step; the confirm button is disabled until every flagged receipt is resolved."*

### Step 6 — Optional: Settlement Calculator (if time permits)
1. Navigate (or describe) the accountant's settlement view at `/accounting/settlement/[id]`.
2. Point to the **ledger calculator**: advance issued vs. receipts claimed, difference highlighted in emerald (refund to applicant), orange (return to FINKI), or blue (balanced).
3. Archive number format: `СТГС-{year}-{sequence}` — generated on close.

---

## 3. Development Journal Summary

> All work was performed in a single extended session on **2026-05-17**, using Claude as the primary engineering tool. Every file, migration, and component originated from a structured natural-language prompt. No syntax was hand-typed; every decision was reviewed by the engineer before acceptance.

### Phase Timeline

| Phase | Milestone | Outcome |
|-------|-----------|---------|
| **Analysis** | SRS parsed → 18 functional requirements, 7 roles, 6 use cases mapped | `ROADMAP.md` generated |
| **Phase 0** | Supabase schema deployed via MCP: 9 enums, 11 tables, 15 indexes, 6 trigger functions, 42 RLS policies, 5 storage buckets | Full DB in one prompt |
| **Phase 1** | UC-01: Applicant dashboard, 4-step grant application form, iKnow SSO mock, Supabase Storage upload | 0 TS errors on first build |
| **Phase 2** | UC-02: Review dashboard for Scientific Council and Deanery; decision form with mock MAdNS digital signature (R-04); budget deduction trigger | DB triggers handle all state transitions |
| **Phase 3** | UC-03: Accounting queue, advance issuance, payment confirmation widget with state-machine logic | 3-state advance widget, fully typed |
| **Phase 4** | UC-04: Expense report form, drag-and-drop receipt upload, simulated OCR, SHA-256 duplicate detection (R-09), TypeScript cross-field validator | Mirrors production edge-function contract |
| **Phase 5** | UC-05: Settlement calculator, duplicate resolution queue, archive with `СТГС-{year}-{n}` numbering, Archive role portal | 13 routes, 0 errors |
| **Phase 6** | UC-06: Deanery budget dashboard, HR read-only view, Notification Center, role-gated sidebar links | 6 demo accounts, full role matrix |
| **Phase 7** | Security hardening: RLS audit (6 policies corrected), 30-minute inactivity session expiry (NFR-01), Playwright E2E scaffold for UC-01 | Audit report saved to `docs/security/rls-audit-phase7.md` |
| **UI Polish** | Premium bento grids, shimmer animations, split-screen login, asymmetric stat cards — all portals redesigned | 0 TS errors on final `npx tsc --noEmit` |

**Workflow proof:** Every entry in `DEVELOPMENT_JOURNAL.md` contains an exact user prompt under `**Prompt:**`. The prompt is the specification; the implementation is the AI output; the engineer is the reviewer.

---

## 4. AI Engineering Reflection

### Advantages

**Rapid prototyping at architectural scale.**
A complete 11-table relational schema with triggers, RLS policies, and storage buckets was designed, validated, and deployed in a single prompt-response cycle. The same cycle that in traditional development requires a DBA, a backend architect, and a security review happened sequentially within one session.

**Automatic generation of secure, typed architectures.**
The AI produced idiomatic TypeScript throughout — proper `crypto.subtle.digest` for client-side hashing, `getUser()` over `getSession()` for server-side auth validation, cookie-based SSR Supabase clients with the correct `setAll` API — without being instructed on these specifics. Security-correct patterns emerged from the model's training, not from hand-coding.

**Seamless testing and tooling integration.**
Playwright E2E configuration, `package.json` test scripts, `.gitignore` entries, and CI-compatible base URL overrides were all generated as part of Phase 7 in a single prompt. The test scaffold covered the full UC-01 happy path — login, 4-step form, submission, dashboard assertion — without any manual test writing.

**Automated database security auditing.**
The Phase 7 RLS audit identified six policy weaknesses — overly permissive DELETE grants, unrestricted INSERT for notifications, anon-accessible budget tables, and SECURITY DEFINER functions callable via RPC — and generated the corrective SQL for each. This audit would normally require a dedicated security engineer and a separate review sprint.

---

### Limitations

**Absolute dependency on an unambiguous SRS baseline.**
The AI generates code that is consistent with the specification it receives. Any ambiguity, missing requirement, or incorrect constraint in the SRS is faithfully reproduced in the implementation — without complaint. In this project, the SRS was treated as a contract; had it contained contradictions, the AI would have resolved them silently and arbitrarily. The quality of the output is strictly bounded by the quality of the input specification. Garbage in, garbage out — at production speed.

**Shift of the engineer's role from authorship to supervision.**
The human engineer in this workflow does not write syntax. The role becomes: formulating precise prompts, reviewing generated output for correctness and security, catching subtle logic errors (e.g., the three-case state-machine fault in `advance-actions.tsx` identified in Phase 7), and maintaining architectural coherence across sessions. This is a fundamentally different skill set — closer to a technical lead or system architect than a developer — and engineers who approach AI-assisted development expecting to delegate responsibility rather than redirect it will produce insecure, inconsistent systems.

---

*Document prepared for FINKI faculty presentation — 2026-05-20*
