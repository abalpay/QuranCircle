# Application Security Remediation Implementation Plan

**Goal:** Resolve APP-01 through APP-05 in the September 15 security audit, preserving guest participation and link-only circles.
**Architecture:** Deploy the signed email webhook first. Patch callable database functions through tested migrations; enforce validation at the database boundary. Verify deployed definitions and Auth settings independently of repository state.
**Tech Stack:** Next.js, TypeScript, Supabase/Postgres, Deno, standardwebhooks.
**Spec:** docs/security-audit-2026-09-15.md

## Constraints

- Preserve existing dependency changes and user edits.
- No real emails or destructive production test fixtures.
- Use isolated PostgreSQL for mutation tests; production verification uses catalogs and safe rejected requests.
- Keep guest claims, 30-section batches, and link-based viewing.

## 1. Email hook

- [x] Verify real standardwebhooks signatures against the current handler with a stubbed renderer/mail transport; test missing, invalid, stale, and tampered signatures.
- [x] Deploy `supabase/functions/send-email/index.ts` and both templates; verify the no-email unsigned request returns 401.

## 2. Ownership

- [x] Create migration via CLI; copy current definitions of unclaim/read/unread/completion functions, replacing the rejection with `v_uid IS DISTINCT FROM v_event_creator AND v_uid IS DISTINCT FROM v_claimed_by`.
- [x] Lock the parent event, then Khatm, then Juz consistently before authorization; enforce archive and existing-row checks.
- [x] Test unrelated caller, creator, claimer, null creator, missing session/row, and archived state in isolated PostgreSQL. Apply and verify production definitions/grants.

## 3. Validation and work limits

- [x] Add RPC checks for trimmed name <=200, description <=2000, claimer <=100 and array cardinality 1..30 before unnest.
- [x] Add matching text constraints without rewriting existing user content; inspect aggregate violations before validating constraints.
- [x] Make omitted/null snapshot limits default to 3, capped at 20; pass explicit bounded limits in proxy and OG callers.
- [x] Enforce per-user mutation rate limits through a private database helper, preserving the public RPC signatures.
- [x] Test boundaries, anonymous access, repeated calls, snapshot pagination and grants, then apply migration.

## 4. Auth protection

- [x] Read live Auth settings without exposing secrets; enable leaked-password protection if the account plan/API permits it. Verify the resulting setting or document the exact external blocker.

## 5. Final verification

- [x] Run affected tests, lint, typecheck, production build, audit, database regressions and security advisors.
- [x] Update the audit with deployed state, test evidence, and any remaining limitations.

## Deployment handoff

Supabase email and both database migrations are live and verified. APP-05 remains disabled pending dashboard sign-in; web dependency/caller changes await Vercel authentication (`vercel whoami`: Not authorized). No commit/push or web deployment was performed. See the audit status for validation and limitations.
