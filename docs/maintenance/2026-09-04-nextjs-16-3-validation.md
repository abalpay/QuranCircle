# Next.js 16.3.4 maintenance validation — 2026-09-04

## Outcome

**Not release-ready.** All executable local application, database, contract, and
Chromium checks passed after one temporary-artifact lint rerun, but both required
npm audit scopes timed out at the registry bulk-advisory endpoint. A zero-vulnerability
result cannot be claimed until both scopes complete successfully. External production
and content approvals below are also intentionally outstanding.

This is local branch validation, not a production smoke test or deployment approval.
No hosted data, production configuration, existing QuranCircle volumes, THRIVE
containers, branches, backups, PRs, or deployments were changed.

## Scope and environment

- Branch head validated: `3577101 docs: include discovered homepage metadata regression in plan`.
- Upgrade and maintenance checkpoints: `56e4540` (Next/React dependency alignment),
  `b94dbd7` (repository cleanup and dependency policy), and `42487d0` (metadata
  and static image routes). The earlier dependency-security checkpoint
  `86c1673 fix(deps): checkpoint dependency security remediation` remains a required
  retained ancestor.
- Node `v24.18.0`, npm `11.16.0`, Next.js `16.3.4`.
- Local Supabase CLI was `2.115.0`; CI pins `2.109.1`. This is close local coverage,
  not exact CLI parity. The later CLI update batch to `2.116.0` remains pending and
  outside this change.
- Tests used the controller-provisioned fresh stack at
  `/tmp/qurancircle-next163-db.cED3fK`, project ID
  `QuranCircle_next163_20260904`. Local status JSON was parsed privately and only
  the CI-named local values were exported. The explicit target guard required
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`; it passed. Credentials are not
  recorded here.
- The CLI reported its already-stopped local imgproxy and pooler services and its
  `2.116.0` update notice. The API and database validation services remained usable.

## Final local evidence

Every command used the Node 24 fnm path. The app checks used the real local stack
environment, CI flags, merge secret, fixed seeded short codes, and
`NEXT_PUBLIC_SITE_URL` / `PLAYWRIGHT_BASE_URL` of `http://127.0.0.1:3101`.

| Check | Result | Concise evidence / warning |
| --- | --- | --- |
| `npm ci --no-audit` | Pass | 721 packages added in 12s. |
| `npm ls --all --json` | Pass | Valid tree; `problem_count=0`. |
| `supabase test db --local --workdir /tmp/qurancircle-next163-db.cED3fK` | Pass | 2 files, 43 tests. CLI update notice only. |
| `npm run lint` | Pass after rerun | Initial run found two `no-require-imports` errors in a controller's ignored, temporary `controller-probe.cjs`; that non-versioned probe was removed without changing application or lint configuration. Rerun exited 0. |
| `npx --no-install tsc --noEmit` | Pass | Exit 0, no output. |
| `npm run build` | Pass | Next 16.3.4 build/typecheck completed; 46 static pages. `/opengraph-image`, `/icon`, and `/apple-icon` are static. No targeted Edge Runtime or `metadataBase` warnings. |
| `npm run test:unit:coverage` | Pass | 43 files, 234 tests; statements 95.45%, branches 92.55%, functions 98.78%, lines 96.92%. |
| `npm run test:contracts` | Pass | 1 file, 14 tests in 2.20s. |
| `CI=1 npm run test:e2e` | Pass | 43 Chromium tests in 54.8s, against `next start`; no skips or retries reported. Playwright printed only its `NO_COLOR` / `FORCE_COLOR` environment warning. |
| `npm audit --fetch-timeout=20000 --fetch-retries=0` | **Blocked** | One attempt; exited 1 after 20s: registry `/-/npm/v1/security/advisories/bulk` network timeout. No advisory count was returned. |
| `npm audit --omit=dev --fetch-timeout=20000 --fetch-retries=0` | **Blocked** | One attempt; exited 1 after 20s at the same endpoint. No advisory count was returned. |

The two audit commands were deliberately attempted once each with the specified
timeout and zero retries; no repeated timeout loop was used. They are release blockers,
not zero-audit evidence or waived checks. The temporary first lint failure is retained
as evidence rather than hidden; its successful rerun occurred after removal of only the
ignored controller probe.

### Supplemental rendered-page visual check

After the CI-mode suite, the controller independently used a native Python Playwright
probe against its own temporary local server on port 3137. At a 414×896 mobile viewport,
`/`, `/tr`, and `/ar` each returned 200 with the expected language/direction, a visible
`h1`, no horizontal overflow, and zero page errors after `networkidle`. The controller
visually inspected the English, Turkish, and Arabic screenshots and found no obvious
regression; the probe stopped its own server successfully. The ignored SDD evidence is
`visual-smoke.py`, `mobile-en.png`, `mobile-tr.png`, and `mobile-ar.png`. This is
supplemental local evidence, not production browser smoke coverage.

## Read-only production evidence (not rollout acceptance)

Controller read-only metadata/aggregate checks established that production has applied
`20260721064435 transactional_account_deletion`,
`20260721064653 cleanup_unreferenced_anonymous_users`,
`20260722072721 move_policy_helpers_to_private`, and
`20260725044903 add_khatm_completion_metrics`. The auth-users trigger
`cleanup_user_data_before_auth_delete` is enabled and invokes
`private.cleanup_user_data_before_auth_delete`; `public.cleanup_current_user_data()`
still exists as a compatibility RPC.

The cron job `qurancircle-cleanup-unreferenced-anonymous-users` is inactive, scheduled
`30 3 * * 0`, with aggregate `cleanup_runs=0` and
`last_cleanup_completed_at=null`. This proves neither all-environment rollout nor
rollback-window expiry; it does not authorize removal of the RPC or activation of
cleanup.

Read-only HTTP GETs to production `/`, `/tr`, `/ar`, `robots.txt`, and `sitemap.xml`
returned the expected success/content results, locale direction/canonicals, and CSP.
The controller's local production-build probe independently received correct PNG
responses/dimensions for all three image routes and distinct matching CSP nonces in
two homepage responses. Those observations are useful evidence only: local browser
tests are not production smoke tests, and no production browser/auth/user-journey
mutation was performed.

## Required external actions before release or follow-up removal

- [ ] Restore registry access and obtain zero findings from both audit scopes above.
- [ ] Have a qualified native Arabic speaker review all user-facing Arabic copy in
  context on mobile and desktop; update catalog parity and browser evidence for any
  wording change.
- [ ] Perform an authorized production read-only browser smoke across English,
  Turkish, and Arabic; obtain separate explicit authorization before any account
  mutation tests.
- [ ] Validate canonical, `hreflang`, sitemap, and indexing state in Google Search
  Console for representative localized URLs.
- [ ] Verify every environment has the transactional account-deletion migration and
  that the rollback window is closed before a separately reviewed migration removes
  the compatibility RPC and app call.
- [ ] Obtain explicit approval for anonymous-user cleanup: aggregate preflight,
  canary, then activation, following `docs/testing.md`; do not activate it here.
- [ ] Make and record a secure backup-retention decision before any deletion.
- [ ] Review branch inventory before pruning, and close/rebase remote PRs only after
  the relevant branch has merged.

## Cleanup inventory and recovery

Read-only `git branch --merged main` found these deletion candidates; none was deleted:
`agent/arabic-localization`, `agent/ios-viewport-diagnostics`,
`agent/localization-follow-up-docs`, `agent/redesign-qurancircle-logo`,
`agent/seo-growth-release`, and `codex/responsive-hero-footer-languages`.
`git cherry main` marks `5e544a7` on `agent/patch-postcss-path-traversal` and
`df73564` on `agent/patch-undici-cache-vulnerability` as patch-equivalent (`-`), but
each still requires inspection before deletion.

The original checkout backups are not present in this isolated worktree. Metadata only:
`backups/prod-public-after-2026-02-19-1600.sql` (0 bytes) and
`backups/prod-public-after-2026-02-19-1602.sql` (55,688 bytes), both dated
2026-02-19. Their contents were never read and the files were untouched.

If approved integration must be rolled back, revert focused maintenance commits in
reverse order from the integration tip (including this validation record, then
`42487d0` and `56e4540` as applicable) while retaining security checkpoint `86c1673`.
Do not reset the original checkout or reverse applied database migrations; this plan
made no schema/deployment change, so no production-data rollback is implied.

## Files removed in this maintenance sequence

`b94dbd7` removed obsolete repository artifacts (the quoted Quran.com file,
`.cursor/skills/*`, and `.run-agent.sh`). `42487d0` replaced
`app/opengraph-image.tsx` with `app/opengraph-image/route.ts` and
`lib/og-image.tsx`. Validation itself removed no tracked file; the only transient file
removed after the initial lint error was the ignored controller probe described above.
