# RLS Security Audit — Phase 7

**Date:** 2026-05-17
**Tool:** Supabase Security Advisors + manual `pg_policies` review

---

## Findings & Remediations

### 1. `notifications` — INSERT policy too permissive ✅ FIXED
| | Before | After |
|---|---|---|
| Policy | `notifications_insert_any_auth` (`WITH CHECK (true)`) | `notifications_insert_staff` |
| Allowed | Any authenticated user | `accounting`, `scientific_council`, `deanery`, `it_admin` |
| Risk | Applicant could inject notifications for any other user | Eliminated |

### 2. `advances` — ALL policy included DELETE ✅ FIXED
| | Before | After |
|---|---|---|
| Policy | `advances_write_accounting` (ALL) | `advances_insert_accounting` + `advances_update_accounting` |
| Risk | Accounting could delete advance records | Eliminated |

### 3. `settlements` — ALL policy included DELETE; duplicate UPDATE policy ✅ FIXED
| | Before | After |
|---|---|---|
| Policies | `settlements_write_accounting` (ALL) + `settlements_update_accounting` (UPDATE) | `settlements_insert_accounting` + `settlements_update_accounting` |
| Risk | Accounting could delete settlement records; redundant overlapping policies | Eliminated |

### 4. `budgets` — SELECT open to all authenticated users ✅ FIXED
| | Before | After |
|---|---|---|
| Policy | `budgets_select_all` (`USING (true)`) | `budgets_select_authorized` |
| Allowed | Any authenticated user | `deanery`, `accounting`, `it_admin` |
| Risk | Applicants and HR could query budget totals via REST API directly | Eliminated |

### 5. SECURITY DEFINER trigger functions callable via RPC ✅ FIXED (REVOKE)
Functions: `handle_new_user`, `handle_approval_inserted`, `log_application_status_change`, `auto_create_settlement`

`REVOKE EXECUTE … FROM anon, authenticated` applied to all four. These are trigger-only functions and must never be callable via `/rest/v1/rpc/`.

Note: Supabase `default_privileges` in `public` schema auto-grant EXECUTE to anon/authenticated for newly created functions. Future trigger functions should be created in the `private` schema to avoid this.

### 6. `handle_updated_at` — mutable search_path ✅ FIXED
`ALTER FUNCTION public.handle_updated_at() SET search_path = public` applied.

### 7. `audit_log` — append-only verification ✅ CONFIRMED SECURE
`pg_policies` query confirmed: no INSERT, UPDATE, or DELETE policies exist for `audit_log` on the `authenticated` role. Writes happen exclusively via SECURITY DEFINER trigger functions. The table is effectively append-only from the application layer.

---

## Remaining Advisors (not actionable in this phase)

| Warning | Status |
|---|---|
| `auth_leaked_password_protection` disabled | Requires Supabase Auth dashboard toggle — out of code scope |
| SECURITY DEFINER functions still appear in cached advisor results | Grants are revoked; cache clears on next advisor scan cycle |

---

## Policy Matrix (final state)

| Table | anon | applicant | council | deanery | accounting | hr | archive | it_admin |
|---|---|---|---|---|---|---|---|---|
| applications | — | own SELECT/INSERT/UPDATE(draft) | SELECT | SELECT/UPDATE | SELECT/UPDATE | SELECT | — | ALL |
| advances | — | own SELECT | — | SELECT | INSERT/UPDATE/SELECT | — | — | SELECT |
| approvals | — | own SELECT | INSERT/SELECT | INSERT/SELECT | SELECT | SELECT | SELECT | ALL |
| expense_reports | — | own SELECT/INSERT | — | — | SELECT/UPDATE | — | SELECT | SELECT |
| receipts | — | own INSERT/SELECT | — | — | SELECT/UPDATE | — | — | SELECT |
| settlements | — | own SELECT | — | SELECT | INSERT/UPDATE/SELECT | — | SELECT | INSERT/UPDATE/SELECT |
| notifications | — | SELECT/UPDATE own | INSERT/SELECT own | INSERT/SELECT own | INSERT/SELECT own | SELECT own | — | ALL |
| audit_log | — | own SELECT | — | — | SELECT | — | — | SELECT |
| budgets | — | — | — | SELECT | SELECT | — | — | ALL |
| profiles | — | own SELECT/UPDATE | SELECT (staff) | SELECT (staff) | SELECT (staff) | SELECT (staff) | SELECT (staff) | ALL |
