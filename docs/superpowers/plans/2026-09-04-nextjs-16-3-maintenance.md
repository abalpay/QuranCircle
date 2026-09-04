# Next.js 16.3 and Repository Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade QuranCircle from Next.js 16.2.11 to stable 16.3.4, retain the security remediation, and resolve safe local maintenance while explicitly tracking externally gated operations.

**Architecture:** Preserve the locale-root App Router, request-specific CSP, auth behavior, and existing caching model. Make focused dependency/configuration changes, remove accidental repository artifacts, and serve the shared OG image at its existing URL without root file-metadata inference. Use an isolated worktree, sequential Terra/high implementers, task-scoped reviews, controller gates, and a final whole-branch review.

**Tech Stack:** Node 24, npm 11, Next.js 16.3.4, React 19.2.8, next-intl 4.14.2, TypeScript 5.9, Supabase, Vitest and Playwright.

**Spec:** The user request in this conversation dated 2026-09-04, captured by the scope and constraints below.

## Global Constraints

- Target Next.js and eslint-config-next exactly 16.3.4; React and react-dom exactly 19.2.8; next-intl exactly 4.14.2; @types/node on major 24. Retain Node 24 and TypeScript 5.
- Preserve all existing dependency security fixes. No npm audit fix --force, --legacy-peer-deps, disabled install protections, or unreviewed major dependency upgrades.
- Keep strict-allow-scripts=true and exact version approvals for native install scripts. Review new scripts before explicitly approving them.
- Preserve locale routing for English, Turkish and Arabic, Arabic RTL, nonce-based CSP, auth/session behavior, private circle metadata, and the /opengraph-image, /icon and /apple-icon URLs.
- Do not enable Cache Components, partialPrefetching, React Compiler, experimental features, or change application business logic as part of the upgrade.
- Work only in the isolated maintenance worktree. Preserve the original checkout and its uncommitted security changes. Commit reviewed local changes; do not push, merge, deploy, close PRs, delete branches, delete backups, activate cleanup jobs, or mutate production.
- All database/contract/E2E mutations must target a newly provisioned local test stack, never hosted production. Do not print credentials or copy production .env files.
- Implementers are gpt-5.6-terra with high reasoning, do not spawn children, own only their assigned task, and provide command/output evidence. Controller reviews every gate; a separate task reviewer verifies spec and quality.

## Evidence and official sources (checked 2026-09-04)

- [Next.js 16.3 release](https://nextjs.org/blog/next-16-3): stable release; new caching/navigation features are opt-in and not required for the version update.
- [16.3.4 release](https://github.com/vercel/next.js/releases/tag/v16.3.4) and npm registry: latest stable 16.3 patch; Next depends on @swc/helpers 0.5.23.
- [Official upgrade guide](https://nextjs.org/docs/app/getting-started/upgrading): manual framework/React/eslint-config update is supported. Exact versions here prevent inadvertently taking a later major.
- [Next 16 migration guide](https://nextjs.org/docs/app/guides/upgrading/version-16): Node >=20.9, TS >=5.1, async request APIs; this project already uses proxy.ts and async request APIs.
- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router): preserve the plugin and locale-root setup. Registry 4.14.2 supports Next 16 and uses @swc/core ~1.16.0.
- [Metadata precedence and metadataBase](https://nextjs.org/docs/app/api-reference/functions/generate-metadata): file-based metadata overrides explicit metadata; base applies at its segment and descendants.
- [Generated image metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) and [route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route): preserve shared image content and opt a GET handler into static caching explicitly.
- [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference): group update-types are minor/patch/major; ignore rules use version-update:semver-major.
- [Supabase changelog](https://supabase.com/changelog.md): reviewed recent breaking-change entries; no hosted schema or SDK update is included here. CLI refresh remains a separate tested batch.

## Baseline and scope decisions

Original HEAD: f5878ab98aed6f7f6ec379de9be175aec33e4ef5 on main. Uncommitted package.json/package-lock.json security changes and security_best_practices_report.md must be copied unchanged and checkpointed first in the worktree. Previously verified: 234 unit tests, lint/build passing and zero npm audit findings; revalidate in the new environment.

The current invalid dependency tree is Next's @swc/helpers 0.5.15 versus @swc/core's optional peer >=0.5.17. Update parent packages, not a forced helper override. Keep existing security overrides initially; only remove an override if evidence shows every dependent path is safe and audit remains zero.

The open PR set has changed: #54 now joins #26, #43, #51 and #52. No PR will be closed or rebased remotely during this task. Document what is superseded after the local branch is merged. The older report's date-stamped verification is historical, not proof of the upgraded tree.

## Controller setup and preflight gate

- [ ] Create branch agent/nextjs-16-3-maintenance in a separate worktree, using git worktree add; the referenced using-git-worktrees skill is not installed, so use standard Git directly.
- [ ] Copy only the two modified manifests, the security report, and this plan from the original checkout. Inspect the security diff/report for unintended data, then commit the security checkpoint separately from the plan.
- [ ] Create the plan-scoped SDD ledger with scripts/sdd-workspace. Record task consistency and shared-file/interface checks.
- [ ] Give workers absolute worktree and task-brief paths. No worker may run commands in the original checkout.
- [ ] Use local-only, non-secret build environment values until a local Supabase stack is ready.

### Task 1: Framework dependency alignment

**Files:** Modify package.json and package-lock.json only; record results in the task report.

**Interfaces:** Consumes the security checkpoint. Produces a valid npm tree, fixed framework versions, and baseline build/test evidence used by later tasks.

- [ ] Capture RED evidence with `npm ls --all` before updating, or reproduce from the original installed tree without modifying it. Record the SWC peer mismatch.
- [ ] Apply these package values using apply_patch:

```json
{
  "dependencies": {
    "next": "16.3.4",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "next-intl": "4.14.2"
  },
  "devDependencies": {
    "eslint-config-next": "16.3.4",
    "@types/node": "^24.13.3"
  }
}
```

- [ ] Regenerate the lockfile with `npm install --package-lock-only --ignore-scripts`. Inspect resolved @swc/core and any new hasInstallScript entries against the prior lockfile. Verify the npm tarball/manifest and script for each new native version. Replace the obsolete @swc/core@1.15.13 approval with its newly resolved exact version; retain unrelated valid approvals and msw:false. Do not globally allow a package name or all scripts.
- [ ] Run `npm ci`, `npm ls --all`, `npm audit`, and `npm audit --omit=dev`. All must pass with no invalid tree and zero findings. If dedupe is needed, first review `npm dedupe --dry-run`; no broad unrelated upgrades.
- [ ] Run `npm run lint`, `npx --no-install tsc --noEmit`, `npm run test:unit`, and `npm run build` with NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3101 and local Supabase placeholders. Record pre-existing versus new warnings. Build warnings belong to Task 3; any new incompatibility must be resolved before approval.
- [ ] Self-review manifest/lockfile drift, commit `chore(deps): upgrade Next.js stack to 16.3.4`, and report commands, exit codes, test counts, warnings, native-script review and exact versions.

**Gate 1:** Independent spec/quality review plus controller inspection of lockfile, scripts and version/audit results. Do not proceed with an invalid npm tree or weakened controls. Execution ruling: the official advisory POST endpoint timed out under verified Node 24/npm 11 while registry GET worked. Local changes may proceed conditionally with that audit blockage recorded; both audits remain mandatory at the final release gate and unavailable audit results are never reported as zero findings.

### Task 2: Dependabot policy and repository hygiene

**Files:** Modify .github/dependabot.yml, .gitignore, README.md, docs/follow-up-tasks/README.md. Remove .run-agent.sh, the tracked empty root file whose literal name is `"Read on Quran.com"`, and the six tracked .cursor/skills symlinks (find-skills, frontend-design, supabase-postgres-best-practices, vercel-composition-patterns, vercel-react-best-practices, web-design-guidelines). Do not remove symlink targets.

**Interfaces:** Consumes Task 1 framework/runtime versions. Produces reproducible dependency policy, accurate docs, and a clone without machine-specific artifacts.

- [ ] Before deleting, verify exact paths, file types, Git tracking and lack of references. These are recoverable tracked-file removals; leave all ignored local skill directories and backups untouched.
- [ ] Add next-intl to next-react. Restrict next-react, supabase, test-tooling, and production-dependencies groups to `update-types: [minor, patch]`. Remove TypeScript from test-tooling so unsupported majors remain standalone. Add a development-dependencies fallback group, excluding TypeScript. Keep the weekly Melbourne schedule and GitHub Actions group. Increase npm open-pull-requests-limit from 3 to 5 for the additional groups. Add only this runtime-alignment ignore:

```yaml
    ignore:
      - dependency-name: "@types/node"
        update-types: ["version-update:semver-major"]
```

- [ ] Add portable ignores without deleting local data:

```gitignore
/backups/
/.cursor/skills/
/.run-agent.sh
```

- [ ] README: say English/Turkish/Arabic, document Chromium E2E accurately, list `(en, tr, ar)`, use `npm ci && npm run dev`, and describe Node 24. Document that local agent skills are deliberately untracked and must be installed by each developer.
- [ ] Update follow-up tasks date and PR table: #43 superseded by framework batch only after merge; #54 superseded by security checkpoint only after merge; #26 should align with Node 24 rather than 26; #51/#52 must refresh/re-split after policy lands. Explain exact allowScripts approvals must accompany native dependency changes. Preserve outstanding Arabic review/production smoke/indexing work as outstanding. Include later dependency batches and CLI 2.109.1→2.116.0 as separate tested maintenance, not a change silently included here.
- [ ] Validate YAML parsing with the installed js-yaml package; assert every npm group excludes major upgrades, TypeScript is not captured by the development fallback, and framework packages land in the first matching next-react group. Run `git diff --check`, verify removed paths are absent and symlink targets untouched. Verify README matches package.json and playwright.config.ts.
- [ ] Commit `chore: clean repository artifacts and dependency update policy` and report exact removed files/recoverability, validation and unresolved external actions.

**Gate 2:** Independent spec/quality review plus controller verification that no useful skill target, backup, branch, production resource, or remote PR changed.

### Task 3: Metadata and icon build warnings

**Files:** Move shared image implementation from app/opengraph-image.tsx to lib/og-image.tsx; create app/opengraph-image/route.ts; modify app/icon.tsx and app/apple-icon.tsx; create tests/e2e/metadata-assets.spec.ts. Execution finding also requires app/[locale]/page.tsx and tests/unit/app/home-seo-metadata.test.ts for missing homepage OG image regression. Keep lib/brand.ts and locale layout public contracts unchanged.

**Interfaces:** /opengraph-image remains a 1200x630 PNG; /icon a 32x32 PNG; /apple-icon a 180x180 PNG. Explicit absolute OG/Twitter metadata continues to use BRAND_SOCIAL_IMAGE_PATH. Localized public-circle image routes remain untouched.

- [ ] Reproduce both warning classes from Task 1 build. If the upgrade already eliminates metadataBase warning, prove rendered metadata correctness and avoid unnecessary OG route movement; record that evidence for controller review.
- [ ] Add HTTP-level regression tests using the existing Playwright test runner. For each of the three image paths, require 200, image/png, the PNG signature and correct IHDR dimensions. Core assertion:

```ts
const body = await response.body();
expect(body.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
expect(body.readUInt32BE(16)).toBe(width);
expect(body.readUInt32BE(20)).toBe(height);
```

- [ ] Add rendered metadata assertions for /, /tr, /ar using an HTML-limited bot user agent so metadata is in the head. Assert canonical and social image origins match NEXT_PUBLIC_SITE_URL; html lang and dir match en/ltr, tr/ltr and ar/rtl. Assert no root 404 metadata references a fallback localhost origin different from the configured origin. Use real HTTP/DOM outputs, not source-text assertions.
- [ ] Execution finding: homepage page-level openGraph replaces layout openGraph by shallow merge, losing images (also observed in existing production HTML). Add BRAND_SOCIAL_IMAGE_PATH to its existing brand import and declare the following field in its openGraph object; add a unit regression asserting this image in all three locale metadata results. This is a focused metadata correction, not a layout or SEO-content refactor.

```ts
images: [{
  url: toAbsoluteUrl(BRAND_SOCIAL_IMAGE_PATH),
  width: 1200,
  height: 630,
  alt: "QuranCircle",
}],
```
- [ ] If warning persists, move the existing OG JSX unchanged to lib/og-image.tsx, remove metadata-only exports that are no longer consumed, and use a standard route handler:

```ts
import createOgImage from "@/lib/og-image";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return createOgImage();
}
```

- [ ] Remove `export const runtime = "edge"` from icon.tsx and apple-icon.tsx, allowing supported default Node static generation. Keep image content and size exports unchanged. Do not add a new root layout or disrupt locale html/body ownership.
- [ ] Build again with the configured site origin. Require both targeted warning classes absent and all image URLs present in output. Run focused metadata/brand unit tests and the new E2E spec against local-only environment. Record baseline failure/warning and corrected behavior.
- [ ] Commit `fix: preserve canonical metadata and statically generate icons` and report tests, render results, route behavior and any evidence-driven deviation.

**Gate 3:** Independent spec/quality review plus controller check of actual image bytes, locale/canonical metadata, CSP and build output. No warning suppression is accepted as a fix.

### Task 4: Integrated validation and operational handoff

**Files:** Create docs/maintenance/2026-09-04-nextjs-16-3-validation.md; update docs/follow-up-tasks/README.md with a link and explicit release blockers. Update security_best_practices_report.md with a dated upgrade addendum only; retain historical evidence.

**Interfaces:** Consumes the reviewed branch from Tasks 1–3. Produces a release evidence document with pass/fail/blocked results and a separate external-action checklist.

- [ ] Provision a fresh isolated local Supabase test stack, following `supabase --help` and command-specific help first. Existing THRIVE containers must remain untouched. Do not reuse stopped QuranCircle database volumes; if they exist, use a unique local project_id through a temporary worktree config edit and restore only that own edit with apply_patch afterwards. Ports 54320–54329 must be free. No production credentials/config copies.
- [ ] Export only local stack credentials into command environments without printing them, following the repo CI names. Retain assertSafeSupabaseTestTarget. Run DB unit tests, contract tests, full unit coverage, lint, typecheck, production build, and full Chromium E2E against `next start` as CI does. Run npm ci, npm ls --all and both audits on the final lockfile. Record CLI version if different from CI; do not claim exact CI parity when versions differ.
- [ ] Investigate failures, distinguish baseline/environment issues from changes, and escalate code fixes outside assigned files to the controller. Do not disable/skips tests, weaken assertions, or hide errors to pass. Do not touch production to make tests runnable.
- [ ] Use the webapp-testing skill's local Playwright reconnaissance for a supplemental visual check if browser tests uncover a layout concern; preserve existing native TS suites rather than replacing them. Capture representative English/Turkish/Arabic pages if useful, inspect before claiming visual success.
- [ ] Write the evidence document with exact versions, commands, outcomes, security audit counts, warnings, files removed, rollback commits and official links. State explicitly that local browser tests are not production smoke tests.
- [ ] Include externally gated actions with acceptance criteria: native Arabic review by a qualified speaker; production read-only smoke then explicit authorization before account mutation tests; Search Console canonical/hreflang/indexing validation; verify all environments have transactional account-deletion migration and rollback window is closed before removing compatibility RPC/app call in a separate reviewed migration; anonymous cleanup aggregate preflight/canary/activation requires explicit approval per docs/testing.md; secure backup retention decision; merged-branch pruning after inventory review; remote PR closure/rebase only after branch merge.
- [ ] Record branch cleanup candidates via read-only `git branch --merged main` and patch-equivalence checks, but do not delete them. Record the original checkout backup filenames/metadata only, never contents. Acknowledge they are not present in the isolated checkout.
- [ ] Commit `docs: record upgrade validation and gated maintenance follow-ups`. Stop only the local stack started for this task, preserving its data unless explicitly approved for deletion; leave unrelated containers running.

**Gate 4:** Controller reconciles all test evidence and external blockers. A final whole-branch reviewer checks the combined diff, security checkpoint and unresolved minor findings. Leave reviewed commits on the maintenance branch for user-approved integration; no push/merge/deploy is implied.

## Acceptance and rollback

Implementation acceptance requires a valid npm tree, zero audits, passing lint/typecheck/unit/build and image/metadata checks. Full database/E2E validation must pass before release; environment-blocked checks are explicitly release-blocking, not waived. Production rollout remains separate.

Rollback is a revert of the focused maintenance commits, retaining the earlier security checkpoint. Do not reset the original checkout or roll back applied database migrations. Since no database changes or deployment happen in this plan, there is no production data rollback.
