# QuranCircle application security audit

Date: 15 September 2026. Local base commit: `5b951d9a501cf083e1fda7f1946d2d522dfe1165`, including the pending dependency patches.

## Remediation status — 15 September 2026

- **APP-01 fixed in production:** `send-email` version 19 requires verified webhook signatures. Safe unsigned and invalid-signature requests both returned HTTP 401. Eight local tests use real signature verification with a stubbed mail transport; no real email was sent.
- **APP-02 fixed in production:** migration `20260915011633_fix_juz_authorization.sql` rejects unrelated callers even when the creator is null, and locks parent rows before authorization. The legacy mark-read entrypoint delegates to the completion-aware implementation.
- **APP-03 fixed in production:** migration `20260915012118_bound_rpc_inputs_and_work.sql` enforces name/description/claimer lengths and batch sizes in RPCs and validates matching text constraints against existing data. Per-user limits allow 10 successful creations/hour and 120 other successful mutations/minute. Failed transactions roll back their counters; these limits do not replace infrastructure request-flood protection.
- **APP-04 fixed in production at the database boundary:** omitted/null snapshot limits now return at most three Khatms by default, capped at 20. Explicit one-Khatm proxy/OG requests are implemented locally, awaiting web deployment.
- **APP-05 pending:** the latest security advisor still reports leaked-password protection disabled. Supabase dashboard sign-in is required; its browser tab is open for the user.
- **Dependency patches and web changes are local, not deployed:** Vercel CLI returned `Not authorized`. No commit or push was made.

Validation: npm audit reports zero known vulnerabilities; lint, typecheck, production build, 234 existing unit tests, eight email signature tests, isolated database security regressions, and the image optimization browser test passed. An additional null-limit unit regression was added. Security regressions are wired into CI. No complete authenticated browser E2E suite was run during this remediation.

Database regressions cover unrelated callers, null/deleted creators, authorized claimers/creators, archived circles, missing sessions/rows, input boundaries, snapshot pagination, quotas/reset/user isolation, and private helper grants. Existing production data was not used as test fixtures. Production migrations changed schema/functions and added the private limiter table; existing user content was not rewritten.

Remaining advisor notices include intentional callable SECURITY DEFINER RPCs, guest-access policies, and private tables with RLS and no policies. Those are not automatically permission defects; reviewed grants and the intended link-based/guest access model are documented below. The new rate-limit table intentionally has no client policy or privileges.

The following sections preserve the original audit findings and evidence **before remediation**.

## Executive summary

**Two high-priority production issues need attention:** the deployed email function accepts unsigned requests, and four database mutation functions fail to reject unauthorized callers when a circle's creator is null. The latter occurs naturally after account deletion.

Also confirmed: direct RPC calls bypass application input-size limits; snapshot reads default to an effectively unlimited history; and Supabase's leaked-password protection is disabled.

This was an application-wide, risk-based review of the repository and accessible production configuration. It is not a claim that every possible vulnerability has been found. Production data was not modified, and no email was sent. The database exploit reproductions used synthetic data in a separate, network-isolated PostgreSQL container.

| ID | Priority | Finding | Verification |
|---|---|---|---|
| APP-01 | High | Deployed email hook accepts unsigned requests | Deployed source and harmless live request |
| APP-02 | High | Authorization fails open for circles without a creator | Live function definitions and isolated mutation reproductions |
| APP-03 | Medium | Direct RPCs bypass input-size limits | Live constraints/definitions and isolated inserts |
| APP-04 | Medium | Public snapshot RPC has an unlimited default | Live definition and isolated read reproduction |
| APP-05 | Medium hardening | Leaked-password protection disabled | Live Supabase security advisor |

The main npm lockfile still reports zero known vulnerabilities after the dependency patches. The Edge Function has a separate dependency surface; see the coverage notes below.

## APP-01 — Unsigned requests accepted by the deployed email function

**Severity: High. Confidence: confirmed deployment defect.**

### Evidence

Supabase project `vbxdcuucynuneqanrquw` has `send-email` version **18**, with gateway `verify_jwt: false`. The fetched deployed entrypoint differs materially from the local file:

```text
Deployed send-email/index.ts:75  Fallback for missing signature headers
Deployed send-email/index.ts:83  verified = JSON.parse(payload) as VerifiedPayload;
Deployed send-email/index.ts:143 const { error } = await resend.emails.send({
Deployed send-email/index.ts:145   to: [user.email],
```

The deployed fallback assumes registering an Auth hook makes the endpoint private. It does not. The same deployed function logs all incoming headers at lines 22–26, potentially retaining authentication or signature material unnecessarily.

One unauthenticated request without webhook signature headers returned **HTTP 200, `{}`**. The submitted body was deliberately limited to:

```json
{"user":{},"email_data":{"email_action_type":"signup"}}
```

The deployed signup branch returns before rendering or calling Resend, so this validated the bypass without sending mail or creating an Auth user.

### Impact

An outsider can reach the email-send path with attacker-supplied recipient and action data, potentially exhausting sending quotas, damaging sender reputation, and generating unwanted branded authentication emails. Actual delivery abuse was not exercised; it depends on the configured Resend credentials and sender permissions. This finding does not establish that an attacker can forge a valid Supabase recovery token or take over an account.

### Fix

The local [email entrypoint](../supabase/functions/send-email/index.ts) already rejects missing signatures at `supabase/functions/send-email/index.ts:81` and verifies the body at line 104. Deploy the reviewed local function and templates, verify its hook secret format/configuration, and confirm unsigned requests return 401. Keep signature verification mandatory; do not restore a JSON-only fallback. Gateway JWT verification being disabled is not itself a bug for a signed Auth webhook. See [Supabase's Send Email Hook documentation](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook).

Test a valid signed request using a stubbed mail transport before deployment. After deployment, test invalid and missing signatures through the safe no-send path. A real recovery-email smoke test should use an explicitly selected recipient. Remove full-header diagnostics; review historical log access and rotate credentials if logs actually retained sensitive credentials. No such exposure or abuse was established in this audit.

## APP-02 — Null creator bypasses Juz ownership checks

**Severity: High. Confidence: confirmed.**

### Evidence

The following functions use the same rejection condition:

```sql
IF v_uid <> v_event_creator AND v_uid <> v_claimed_by THEN
  RAISE EXCEPTION 'Only the claimer or event creator ...';
END IF;
```

Locations:

- `supabase/migrations/00012_mutation_rpcs.sql:289` — `unclaim_juz`.
- `supabase/migrations/00012_mutation_rpcs.sql:347` — legacy `mark_juz_read`.
- `supabase/migrations/00012_mutation_rpcs.sql:401` — `unmark_juz_read`.
- `supabase/migrations/20260725044903_add_khatm_completion_metrics.sql:84` — `mark_juz_read_with_completion`.
- `supabase/migrations/20260721064435_transactional_account_deletion.sql:30` deliberately sets `events.created_by` to null when deleting a creator.

The deployed definitions contain these checks, and the `authenticated` role can execute the functions. Anonymous Auth sessions also use that role. An attacker still needs an active session, a valid circle short code, and a Juz identifier; knowing the link allows retrieval of those identifiers through the intended snapshot API.

SQL comparison with null produces unknown, not true. A PL/pgSQL `IF` only rejects when its condition is true. Thus, when `v_event_creator` is null and the caller is not the claimer, the rejection is skipped. [PostgreSQL comparison semantics](https://www.postgresql.org/docs/current/functions-comparison.html).

### Reproduction

A network-isolated PostgreSQL 17 container loaded the relevant migration function bodies, a minimal application schema, and synthetic Auth identities. With a null circle creator and a different Juz owner, the unrelated caller successfully:

```text
mark_juz_read_with_completion → {"updated":true,"newly_completed":false}
unmark_juz_read               → true
mark_juz_read                → true
unclaim_juz                  → true
```

This is a database-level defect, not just hidden UI controls. The tests did not mutate production records. Auth helpers in the isolated harness supplied synthetic identity values; production function definitions and execute grants were inspected separately.

### Impact and fix

An unrelated session can clear or change another participant's reading state in an unarchived circle after its creator is deleted. Fix **all four functions**, including the legacy callable RPC. Use a null-safe rejection:

```sql
IF v_uid IS DISTINCT FROM v_event_creator
   AND v_uid IS DISTINCT FROM v_claimed_by THEN
  RAISE EXCEPTION 'Unauthorized';
END IF;
```

Retain the explicit null-session rejection. Add tests for caller/claimer/creator combinations with null owners, both Auth user types, missing records, and archived circles. Existing ownership checks and updates in the older functions also occur in separate statements without a row lock; make authorization and mutation atomic when repairing them, and add concurrent reassignment tests. A concurrency exploit was not independently reproduced during this audit.

## APP-03 — Database API bypasses application size validation

**Severity: Medium. Confidence: confirmed validation bypass; resource impact not load-tested.**

### Evidence

The application caps circle names at 200 characters, descriptions at 2,000, claimer names at 100, and batch arrays at 30 entries:

- `lib/actions/events.ts:24` — `createEventSchema`.
- `lib/actions/juz.ts:18` — claim input schemas.

But callers can access the database RPCs directly:

- `supabase/migrations/00023_validate_create_event_rpc_short_code.sql:31` only rejects empty names; it does not cap names/descriptions.
- `supabase/migrations/00025_remove_lock_feature.sql:38` only rejects empty claimer names.
- The same claim function unnests the supplied array at line 61 before any cardinality limit.

The live columns are unrestricted PostgreSQL `text`, and live table constraints contain no corresponding length checks. Direct table privileges are revoked, but that does not protect the explicitly callable privileged RPC path.

### Reproduction and impact

The isolated RPC tests accepted and stored a **201-character name, 2,001-character description, and 101-character claimer name**. These are deliberately small boundary probes. They establish the bypass, not a measured denial of service.

An authenticated caller can submit larger content directly, increasing storage, rendering, and response costs. Guest sessions can exploit the claim-name path. Repeated claim calls also create another Khatm once all 30 Juz are claimed, with no application-level rate or growth quota found. Supabase Auth sign-in rate limits do not constrain subsequent database RPC calls. Hosting/gateway limits were not exhaustively verified.

### Fix

Validate normalized text lengths inside the RPCs and add matching table constraints. Reject oversized arrays before `unnest`. Preserve the intentional ability to claim all 30 sections; rate limits should address request frequency and automated growth rather than silently restore the removed five-Juz product restriction. Enforce abuse controls on the direct Supabase access path as well as Next.js routes.

## APP-04 — Snapshot RPC defaults to an unbounded history

**Severity: Medium. Confidence: confirmed unbounded read; resource impact not load-tested.**

### Evidence

`supabase/migrations/00028_snapshot_windowed_read_rpc.sql:8` defaults `p_khatm_limit` to null. At line 71:

```sql
LIMIT COALESCE(v_requested_limit, 2147483647)
```

The deployed function matches. Both `anon` and `authenticated` can execute it. Although the normal application page asks for three Khatms, two other callers omit the limit:

- `lib/supabase/proxy.ts:145` — circle-existence lookup.
- `app/[locale]/s/[shortCode]/opengraph-image.tsx:42` — image metadata lookup.

`lib/actions/events.ts:80` also explicitly preserves a null limit supplied to the server action.

### Reproduction and impact

With 22 synthetic Khatms, the default call returned **22**, while an explicit limit of 20 returned **20**. A normal page request can therefore perform an unnecessary full-history aggregation in its proxy. Direct unauthenticated RPC calls can do the same. A JSON aggregate is one result value, so the Data API row limit does not cap its nested history.

Large circles can make these requests consume excessive database work, response bandwidth, and server memory. APP-03's automated growth paths can amplify this. No production stress test was performed.

### Fix

Apply a bounded default even when the supplied limit is explicitly null. Use a lightweight existence/metadata RPC for the proxy and OG renderer, or at minimum explicitly bound their current calls. Keep pagination for history. Review the public listing's 2,000-event database cap against the application's smaller cap as part of the same workload budget.

## APP-05 — Leaked-password protection is disabled

**Severity: Medium hardening. Confidence: confirmed live setting.**

The production Supabase security advisor returns `auth_leaked_password_protection`: **Leaked Password Protection Disabled**. This is a dashboard/Auth configuration finding, not a line of application code.

Password complexity checks cannot prevent reuse of already-compromised passwords. Enable the available leaked-password protection, retaining existing strength requirements. Verify with a disposable local/staging account rather than an existing user. [Supabase remediation guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

This is an increased credential-stuffing risk, not evidence of compromised users.

## Other hardening and unresolved checks

- **Account recovery/reauthentication:** the account page supplies `current_password` (`components/account-page-client.tsx:160`), but the recovery page updates the password with only an active session (`components/reset-password-page-client.tsx:58`). The server recovery page allows any non-anonymous user. Local config has `secure_password_change = false` (`supabase/config.toml:210`). Verify the *live* Auth enforcement before classifying this as a password-policy bypass; the remote configuration diff was unavailable. A recovery-flow guard alone does not replace Auth API enforcement. Account deletion also accepts a valid session without a recent-reauthentication check.
- **Webhook dependency coverage:** the Edge Function imports `react@18.3.1`, `resend@4.0.0`, `@react-email/components@0.0.22`, and `standardwebhooks@1.0.0` separately from the root npm lockfile. No committed Edge Function lockfile was found. An isolated npm resolution of these imports reports a moderate transitive PrismJS DOM-clobbering advisory. The inspected templates use server-side email rendering, not browser syntax highlighting, so an exploitable PrismJS path was **not established**. The reconstructed npm graph is not proof of the exact deployed Deno/esm.sh graph. Add locked Edge dependency auditing. [PrismJS advisory](https://github.com/advisories/GHSA-x7hr-w5r2-h6wg).
- **Privileged module boundary:** add `import 'server-only'` to `lib/supabase/admin.ts` as a build-time safeguard. Current usages were confined to server actions/routes, and no service key was found in browser assets.
- **Custom cookie POST routes:** `prepare-merge` and callback POST do not explicitly validate Origin. The signed, HttpOnly, SameSite=Lax merge cookie and current-session checks materially limit abuse; a working cross-site identity-transfer exploit was not established. Consider same-origin checks as defense in depth.
- **Logs:** besides the deployed header logging in APP-01, application mutation functions sometimes return raw database messages. Prefer stable public errors and redacted structured diagnostics.
- **Platform configuration:** live password reauthentication settings, CAPTCHA, WAF/rate rules, backup/restore readiness, hosting account MFA, and secret rotation history were not fully accessible or tested. No infrastructure-wide security certification is implied.

## Controls verified and advisor interpretation

- All five live public application tables have RLS enabled. Direct read/write privileges for `anon` and `authenticated` are revoked; access is through selected RPCs.
- Both merge RPCs are unavailable to client roles and remain service-role-only. The application verifies merge-cookie HMAC, expiry, source identity format, and current target user.
- Private and cron schemas are not usable by the authenticated client role, and clients cannot create objects in `public`.
- No public views or Storage buckets were present in the inspected schema inventory.
- Public read RPCs deliberately support public listings, aggregate stats, and link-based circle access. Knowing an unlisted circle link intentionally grants its snapshot; that product behavior is not treated as a data leak.
- Realtime subscriptions are private broadcasts carrying invalidation metadata rather than claim/user rows. The policy checks event access.
- Live homepage headers included a nonce-based CSP, no production `unsafe-eval`, frame denial, nosniff, HSTS, and private/no-store caching.
- Searched raw HTML insertion sites serialize structured data and escape `<`. No demonstrated stored/DOM XSS, SQL injection, command injection, SSRF, or server-key exposure was found in the inspected entrypoints and data flows.
- A redacted pattern scan of tracked text files found no matching private keys, GitHub tokens, AWS access keys, Supabase secret keys, or JWT literals. Three locally configured non-public secret values were checked against `.next/static`; none appeared. This was not an entropy-based or full Git-history secrets scan.
- CI uses pinned action commits, read-only repository permissions, and checkout without persisted credentials.
- Supabase advisor warnings about executable `SECURITY DEFINER` functions identify boundaries needing manual review, not automatically exploitable functions. APP-02 shows why that manual review matters. The cleanup audit table's missing RLS policies is intentional deny-by-default access, not a reason to add a public policy.

## Validation and scope

Reviewed the security-sensitive paths across authentication, server actions/API routes, merge/deletion, database mutations and grants, read APIs, Realtime, email, user-content rendering, caching, and CI/deployment configuration. Inventory included 28 app TypeScript files, 23 library files, 66 components, three hooks, and 36 SQL migrations; review depth focused on executable entrypoints and trust boundaries, not a line-by-line certification of every UI file.

Performed:

1. Production catalog/definition/grant queries and Supabase security advisor checks.
2. Deployed Edge Function inspection and one unsigned, no-email-path request.
3. Public homepage header inspection.
4. Isolated PostgreSQL reproductions for APP-02, APP-03, and APP-04.
5. Main lockfile audit: zero findings. TypeScript check: passed.
6. Targeted tracked-file and browser-bundle secret checks.
7. Independent Edge-import npm dependency assessment, with the Deno coverage limitation above.

The earlier dependency-patch validation also passed lint, 234 unit tests, production build, and the image-optimization test. Those tests do not cover the newly discovered database edge cases. The full database-backed E2E/contract suites were not rerun: the running local Supabase stack belongs to a different project, so it was left untouched. The isolated reproduction container was removed after testing.

## Remediation order

1. Deploy the already-hardened email hook after validating signature configuration; verify unsigned requests are denied.
2. Add and test a migration fixing all four null-sensitive Juz authorization checks, including atomic ownership validation.
3. Enforce RPC input limits and bounded snapshot reads; add abuse controls that cover direct database calls.
4. Enable leaked-password protection and verify live recovery/reauthentication controls.
5. Lock and audit Edge Function dependencies and add deployment-drift checks so repository fixes are demonstrably live.

**No application fixes or production deployments were made in this audit.** Existing dependency edits and the dependency report were preserved.
