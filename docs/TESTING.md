# Testing Auth + Email Flows

This guide covers both ownership/auth testing and the Resend email flow (signup, password reset) for QuranCircle.

## Auth + Ownership Scenarios

Run these checks after schema/app updates:

1. Home and browse pages load without forcing anonymous sign-in.
2. Opening `/s/<shortCode>` initializes an anonymous/auth session and realtime invalidation subscription.
3. Anonymous visitor claims/unclaims/marks read on their own claims without opening auth modal.
4. Anonymous visitor cannot create circles or access account settings.
5. Authenticated non-anonymous user can create/manage circles and access account settings.
6. Archive blocks all claim-state mutations.
7. Anonymous-to-account upgrade preserves ownership:
   - claim as anonymous
   - sign in/up
   - verify claimed Juz still appear in **My Juz**
8. Tampered merge cookie/state does not merge a foreign anonymous identity.
9. Account deletion is all-or-nothing:
   - cleanup RPC succeeds, then auth user deletion succeeds
   - on cleanup failure, no auth deletion occurs
10. Private realtime channel behavior:
   - members receive invalidation updates
   - non-members cannot subscribe to private event topics
11. Auth precondition blocking:
   - if `POST /api/auth/prepare-merge` fails for an anonymous session, login/signup/OAuth is blocked with:
   - `Could not secure claim transfer, retry required.`
12. Merge retryable failure behavior:
   - force a transient `merge_anonymous_identity` failure
   - `POST /auth/callback` returns `merge_retryable_error`
   - merge cookie is not cleared, and client retries until terminal status

## Merge Troubleshooting (My Juz)

When claims appear in All Juz but not in My Juz after signup/login:

1. In browser DevTools Network, verify merge preparation:
   - `POST /api/auth/prepare-merge` returns `{"prepared":true,...}` before auth submit.
2. Verify merge finalization:
   - `POST /auth/callback` may return `pending_auth` briefly.
   - it may also return `merge_retryable_error` during transient backend failures.
   - It must eventually return terminal status (`merged`, `no_pending_merge`, `no_merge_required`, or `invalid_merge_state`).
3. Verify DB ownership moved to authenticated UID:

```sql
SELECT id, juz_number, claimed_by_user_id, claimed_by_name
FROM public.juzs
WHERE khatm_id = '<khatm-id>'
  AND status <> 'unclaimed'
ORDER BY juz_number;
```

`claimed_by_user_id` should match the authenticated `auth.users.id` after merge.

## Realtime Policy Verification

Run these in Supabase SQL Editor for staging to confirm private channel authorization is configured:

```sql
select version
from supabase_migrations.schema_migrations
order by version;
```

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'realtime'
  and tablename = 'messages';
```

```sql
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('can_access_event', 'ensure_event_membership', 'merge_anonymous_identity')
order by proname;
```

Expected outcomes:

1. `00013_realtime_invalidation.sql` and `00016_realtime_policy_topic_fix.sql` appear in migration history.
2. `authenticated_event_invalidation_subscribe` exists on `realtime.messages`.
3. `can_access_event`, `ensure_event_membership`, and `merge_anonymous_identity` functions are present.

## Ops Checks (No CAPTCHA Rollout)

1. Confirm Supabase Auth rate limits are active (`anonymous_users`, `sign_in_sign_ups`).
2. Confirm DB mutation RPC guards reject abuse paths.
3. Confirm anonymous-user cleanup policy is set to 30 days.
4. Confirm monitoring alerts are configured:
   - anonymous sign-ins near/over 30 per hour per IP
   - claim mutation error rate above 5% in 5 minutes
   - merge finalize failures above 2% in 15 minutes

## Static Validation

Run before staging sign-off:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`

## Production Hardening Release Gates

Use these explicit gates for phased rollout sign-off.

### Phase 0 (Baseline) Gate

Pass:
1. `supabase db reset --local --yes` succeeds.
2. `npm run lint` passes.
3. `npx tsc --noEmit` passes.
4. `npm run test:unit` passes.
5. `npm run test:e2e` passes with local Supabase env exported.

Fail:
1. Any command above fails.
2. Any migration fails to apply locally.

### Phase 1 (Merge Security) Gate

Pass:
1. Migration `00027_harden_merge_rpc_permissions.sql` applies successfully.
2. Authenticated or anonymous client calls to `merge_anonymous_identity(UUID)` fail with permission denied.
3. `/auth/callback` merge path succeeds for valid anonymous-to-auth upgrade flow.
4. `tests/e2e/merge-security.spec.ts` passes.

Fail:
1. Legacy merge RPC is still callable by non-service roles.
2. Legitimate merge flow regresses.

### Phase 2 (Snapshot + Realtime Reliability) Gate

Pass:
1. Migration `00028_snapshot_windowed_read_rpc.sql` applies successfully.
2. Circle page loads with bounded khatm window and supports loading older cycles.
3. Realtime bootstrap for private circles requires successful membership initialization.
4. `tests/e2e/smoke.spec.ts` realtime and event API assertions pass.

Fail:
1. Snapshot responses remain unbounded at default path.
2. Private realtime marks ready without membership success.
3. Async handlers leave loading states stuck.

### Phase 3 (Correctness + A11y + Config) Gate

Pass:
1. Migration `00029_public_events_cursor_pagination.sql` applies successfully.
2. `/api/event` returns structured error payloads with correct status classes.
3. Browse supports loading beyond initial page via cursor pagination.
4. Site URLs resolve from `NEXT_PUBLIC_SITE_URL` rather than hardcoded host values.
5. Auth modal forgotten-password/back actions are keyboard accessible.
6. Cross-tab install prompt state stays synchronized via `storage` events.
7. `tests/e2e/browse-pagination.spec.ts` and updated install prompt tests pass.

Fail:
1. API still conflates not-found and upstream failures.
2. Browse remains capped to initial fixed dataset.
3. A11y or install sync regressions are observed in automated tests.

## Focused QA Checklist (Event-Level Filters + My Juz Flow)

Use this quick checklist before shipping changes around filters, claiming, or status actions:

1. Default filter on `/s/<shortCode>` is **Available**.
2. Switching filters updates URL query (`?filter=all|available|mine`) and refresh preserves selection.
3. Invalid filter query (example: `?filter=invalid`) gracefully falls back to **Available** UI.
4. Claim guidance text appears above grids: `Tap Juz to select, then press Claim.`
5. After first claim, a toast action appears: **Go to My Juz**.
6. Opening **My Juz** clears the first-time nudge badge/highlight.
7. In **All** and **Available**, tapping a claimed tile does **not** mark it read.
8. In **My Juz**, claimed rows show **Mark Read** + **Unclaim**; read rows show **Undo** + **Unclaim**.
9. Completed/non-matching khatms stay visible as collapsed stubs (not fully hidden).
10. If a claim creates a new khatm, toast shows **Jump to new Khatm** and action scrolls correctly.
11. Creator-only management section appears only for event creators.
12. Archive rules still block claim-state mutations as expected.

## Automated Regression Baseline (Unit + E2E)

This project now includes:

1. Unit tests with Vitest under `tests/unit/`
2. Playwright smoke E2E tests under `tests/e2e/`
3. Deterministic local seed fixtures in `supabase/seed.sql`
4. PR test gate via GitHub Actions in `.github/workflows/test.yml`

### Local Run (recommended flow)

1. Start local Supabase:
   - `supabase start`
2. Reset DB with migrations + seed fixtures:
   - `supabase db reset --local --yes`
3. Load local Supabase env into your shell:
   - `eval "$(supabase status -o env | sed 's/^/export /')"`
4. Export app env variables:
   - `export NEXT_PUBLIC_SUPABASE_URL="$API_URL"`
   - `export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"`
   - `export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"`
   - `export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3101"`
   - `export NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH="true"`
   - `export PLAYWRIGHT_PORT="3101"`
   - `export AUTH_MERGE_COOKIE_SECRET="local-merge-cookie-secret"`
5. Install Playwright browser once per machine:
   - `npx playwright install --with-deps chromium`
6. Run tests:
   - Unit: `npm run test:unit`
   - Unit + coverage gates: `npm run test:unit:coverage`
   - DB/RPC contract checks: `npm run test:contracts`
   - E2E smoke: `npm run test:e2e`
   - Combined: `npm run test:ci`
   - Mutation suite (nightly/opt-in): `npm run test:mutation`

### Seeded E2E Fixtures

Smoke tests target fixed circle short codes:

1. `E2ESMOKE1` (open circle)
2. `E2EARCH1` (archived circle)

Override with env vars when needed:

1. `E2E_SMOKE_SHORT_CODE`
2. `E2E_ARCHIVED_SHORT_CODE`

Build caveat:

1. In restricted networks, Next.js Google Font fetches can fail even when app code is valid.
2. If build fails with Google Font fetch errors, treat it as an environment/network issue unless reproducible in unrestricted staging/CI.

## Auth Email Hook Staging Smoke

Run these before production release when using the custom hook (`supabase/functions/send-email`):

1. Recovery email:
   - trigger reset password from the app
   - verify hook logs show a verified signed request and `email_action_type=recovery`
   - verify email is delivered
2. Magic link (if enabled in your flow):
   - trigger magic-link sign-in flow
   - verify signed request and successful delivery
3. Invite / email-change flow (if used):
   - trigger one non-recovery auth email action
   - verify signed request and successful delivery
4. Invalid signature rejection:
   - call the hook endpoint with missing/invalid webhook signature headers
   - verify HTTP 401 and rejection log entry

Production gate:

1. Do not deploy unless staging has:
   - at least one successful signed recovery email
   - at least one expected 401 invalid-signature rejection

## Choosing Your Approach

| Approach | When to use |
|----------|-------------|
| **Test email accounts** | Ongoing testing; keep your main account intact |
| **Full reset** | One-time wipe; you have no important data |
| **Delete user only** | Test confirmation without clearing events/khatms |
| **Mark unconfirmed** | Test resend confirmation without deleting |

---

## Option A: Test Email Accounts (Recommended)

Use temporary or alias emails so you don't need to delete your main account.

### Gmail + syntax
All addresses deliver to the same inbox:
- `yourname+test1@gmail.com`
- `yourname+test2@gmail.com`
- `yourname+signup@gmail.com`

### Temporary email services
- [temp-mail.org](https://temp-mail.org)
- [guerrillamail.com](https://guerrillamail.com)

---

## Option B: Full Reset

Wipes all custom data and auth users. Use when you want a completely fresh state.

**Run in Supabase Dashboard → SQL Editor:**

```bash
# Or run the script:
# supabase/scripts/reset-for-testing.sql
```

See [supabase/scripts/reset-for-testing.sql](../supabase/scripts/reset-for-testing.sql).

---

## Option C: Delete User Only

Removes your auth account; events and khatms remain. Cascades handle bookmarks and user references.

**Via Dashboard:** Authentication → Users → Delete

**Via SQL:** See [supabase/scripts/delete-user-for-testing.sql](../supabase/scripts/delete-user-for-testing.sql).

---

## Option D: Test Resend Without Deleting

1. Mark your user as unconfirmed (SQL Editor):

```sql
UPDATE auth.users 
SET email_confirmed_at = NULL,
    confirmation_sent_at = NOW()
WHERE email = 'your-email@example.com';
```

2. Use the resend confirmation feature in your app, or in browser console:

```javascript
const { error } = await supabase.auth.resend({
  type: 'signup',
  email: 'your-email@example.com',
});
```

---

## Local Supabase (Optional)

For isolated testing with instant resets and no risk to production:

```bash
supabase start  # starts local Postgres, Auth, Inbucket, Studio
```

- **Inbucket**: Catches all auth emails at http://localhost:54324 (no real emails sent)
- **Studio**: Database UI at http://localhost:54323
- **Reset**: `supabase db reset` wipes and reapplies migrations

To use local Supabase with the app, create `.env.local` with the local URLs (shown after `supabase start`):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase start>
NEXT_PUBLIC_SITE_URL=http://localhost:3001
AUTH_MERGE_COOKIE_SECRET=<openssl rand -base64 32>
```

**Port conflict?** If `supabase start` fails with "port is already allocated", another Supabase project may be running. Stop it with `supabase stop --project-id <other-project-id>` or change ports in `supabase/config.toml`.
