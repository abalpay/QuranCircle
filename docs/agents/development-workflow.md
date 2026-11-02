# Development Workflow

How work moves from a decision to production.

**Branches:** `staging` is where all work lands; `main` is production and only
ever fast-forwards to a green `staging` commit. No pull requests for own work.
Vercel deploys `main`. `main` stays the default branch, so `Closes #n` takes
effect (and issues close) when a commit is promoted.

**No deployed staging environment** (Ahmet, 2026-11-02): `staging` is verified
locally and by CI only. Vercel previews stay skipped
(`scripts/vercel-ignore-build.mjs`) because Preview points at the production
Supabase project. Revisit by adding a separate staging Supabase project. Product rules live in
[docs/product/decisions.md](../product/decisions.md); the work queue is
[docs/product/waves.md](../product/waves.md) plus GitHub issues
([issue-tracker.md](issue-tracker.md)).

## Flow

1. **Decide.** Settle product questions in conversation (`grilling` helps).
   Record the outcome as a numbered rule in `decisions.md` before building.
2. **Spec / tickets.** `/to-spec` turns a settled conversation into one spec
   issue. `/to-tickets` cuts a spec or a wave into tracer-bullet issues with
   native blocking links. Each issue carries a `wave:<n>` label.
3. **Gate.** `/qc-gate` resumes the session, reports state, and waits for Ahmet
   to name a wave or issue.
4. **Plan.** The `planner` subagent turns the wave's issues into streams, cut so
   parallel streams do not touch the same files and migrations land in order.
   Owner questions go out as one numbered comment on the wave plan issue, each
   with a recommendation; answers are recorded as
   `DECISION (Ahmet YYYY-MM-DD): …`.
5. **Implement.** One `implementer` per stream, each in its own git worktree off
   `origin/staging`, following the implementer contract below and `/implement`.
6. **Design (product-facing UI streams, D22).** The implementer builds with the
   `impeccable` skill; the gate captures before/after screenshots at 390px and
   1440px, in English and Arabic (`scripts/capture-pages.mjs`), and sends them to `impeccable:impeccable-finish-reviewer` against the issue
   and `docs/design/`; its fixes land before Ahmet sees the screenshots, so his
   review is approval, not bug-finding.
7. **Review.** An independent `reviewer` per stream, always with the security
   lens (RLS, SECURITY DEFINER `search_path`, authz in every RPC and server
   action, input bounds, what is exposed to anonymous visitors).
8. **Land on staging.** The gate merges the stream branch locally into an
   up-to-date `staging` (merge commit ending with `Closes #n` for every issue
   it completes), runs the local checks, and pushes `staging` (its GO).
   Product-facing streams land only after Ahmet's OK on before/after
   screenshots. CI (`test` workflow) runs on every `staging` push: DB tests,
   lint, typecheck, build, unit, security, contracts, Playwright.
9. **Promote.** When Ahmet says go: CI green on the exact `staging` tip, read-only
   production pre-checks, production migrations applied in version order with
   `supabase db push` (before the app when the app needs the new schema), then
   `git push origin staging:main` (fast-forward only; `main` requires the `test`
   check on that commit). Vercel deploys `main`; check it is READY and smoke the
   production URL. Promotion is only ever Ahmet's call.
10. **Hand off.** At session end the gate writes a handoff memory and moves the
   RESUME HERE pointer in `MEMORY.md`.

## Risk

- **Fast:** copy, docs, a single component. No planner; reviewer still runs.
- **Standard:** anything else. Planner + reviewer.
- **High-risk:** migrations, RLS, auth, anything touching identity or deletion.
  Planner + reviewer with the security lens, pgTAP tests for every path, and
  Ahmet sees the migration before it reaches production.

## Implementer contract

Included in every implementer prompt:

- Work only in your dedicated worktree. Commit with the repo default identity;
  no co-author lines. Never push; never `git stash`.
- Never run `supabase db reset/start/stop/push` or Playwright: the local stack is
  shared, and CI runs the full suite. The gate runs anything stack-bound.
- Never hand-edit `lib/database.types.ts`; regenerate it on migration branches.
- New migrations are new files in `supabase/migrations/`; never edit an applied
  one. Every new or changed RPC gets pgTAP coverage in `supabase/tests/database/`.
- i18n: every new string goes into `messages/en.json`, `tr.json` and `ar.json`
  (see `CLAUDE.md` for the rules and Turkish terms).
- Components that gain hooks: update their unit tests (`CLAUDE.md`).
- UI work follows `docs/design/` and uses the `impeccable` skill; READY lists
  the pages and states to capture. The gate takes the before/after screenshots
  (390px and 1440px, English and Arabic) with `scripts/capture-pages.mjs`.
- A new gotcha is one short bullet in `CLAUDE.md`, never a paragraph.
- Before READY run `npx tsc --noEmit`, `npm run lint`, and `npm run test:unit`.
  Run `npm run build` only when `next.config.ts` or a route file changes.
- Shell is zsh with BSD tools: quote globs, `sed -i ''`.
- **READY** names: branch, HEAD, base, each check with the last lines of its
  real output (a check not run is reported as not run), migration filenames,
  RPCs touched, i18n keys added.

## Approval boundaries

Ahmet decides: product behaviour and copy direction, anything in
`decisions.md`, landing product-facing work on `staging`, every promotion to
`main`, production migrations, deletions.
The gate decides everything else and says which engineering defaults it took.

## Definition of done

Issue acceptance criteria met; CI green on `staging`; reviewer findings
resolved; en/tr/ar in sync; promoted to `main` with migrations applied and
verified; issue closed by the promotion; `waves.md` updated when a wave
completes.
