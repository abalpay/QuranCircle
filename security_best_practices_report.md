# Dependency vulnerability review

Reviewed: 15 September 2026. Repository: `abalpay/QuranCircle`.
Local commit: `5b951d9a501cf083e1fda7f1946d2d522dfe1165`.

## Remediation completed locally — 15 September 2026

Applied in priority order: sharp **0.35.4**, js-yaml **4.3.2**, then Vitest and coverage **4.1.11**. Updated the sharp script permission and regenerated the lockfile. npm also refreshed compatible transitive Vite/Rolldown dependencies during Vitest resolution.

Validation:

- Clean `npm ci` passed; installed Next.js now matches the declared **16.3.4**.
- Full lockfile and production-only audits both report **zero vulnerabilities**.
- Confirmed native sharp **0.35.4** loads libheif **1.23.2**.
- Lint and production build passed.
- Unit coverage: **234 tests across 43 files passed**; 96.92% line coverage, with all configured thresholds met.
- Existing image-optimization Playwright test passed against `next start` using the production build and local placeholder service settings. No live database was needed for this image-only test.
- Full database-backed E2E and contract suites were not run.

Changes are local; they have not been committed, merged, or deployed. GitHub alerts will need verification after these changes reach the default branch. The findings below preserve the original pre-fix review.

## Original review summary

GitHub has **five open Dependabot alerts covering three distinct advisories**: two high severity and one moderate severity. All three affect versions in the committed npm lockfile. Patch releases are available for each. Prioritize sharp because it is a production dependency.

The explicit lockfile audit reports seven affected package entries (four high, three moderate). These include parent packages inheriting a dependency's vulnerability; they are not seven separate security flaws. No critical-rated package findings were returned. This review identifies known dependency advisories, not evidence of compromise or a complete application penetration test.

## High severity

### 1. sharp 0.35.3 — vulnerable image decoder

- Evidence: `package.json:71`, `package-lock.json:11846`; dependency path `next → sharp`.
- [GitHub alert #26](https://github.com/abalpay/QuranCircle/security/dependabot/26).
- The upstream libheif defects can cause memory corruption and possible code execution on glibc Linux under certain conditions when processing untrusted images. [Advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
- Application relevance: `components/landing/verse-callout.tsx:10` uses Next.js image optimization for a bundled PNG. `next.config.ts` has no remote image allowlist. This limits the evident input surface, but does not establish that the deployed decoder cannot receive hostile content. Deployment binaries and attacker-controlled image reachability were not verified.
- Fix: change the sharp override to **0.35.4 or later**, regenerate the lockfile, and update the version-specific `allowScripts` entry at `package.json:82` if retaining that policy. Rebuild and redeploy. For a deployment using global libheif, verify that library is at least 1.23.2.
- npm also flags `next` through this dependency; the audit did not identify a separate Next.js advisory.

### 2. js-yaml 4.3.1 — CPU exhaustion

- Evidence: `package.json:73`, `package-lock.json:9902`; development dependency path `eslint → @eslint/eslintrc → js-yaml`.
- [GitHub alert #27](https://github.com/abalpay/QuranCircle/security/dependabot/27).
- Crafted YAML merge sources can consume excessive CPU despite the parser's merge limit. [Advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh).
- Application relevance: found in development tooling; no direct js-yaml use found in the searched application code. Exposure requires tooling to parse attacker-controlled YAML. This is not an established public website denial-of-service route.
- Fix: change the override to **4.3.2 or later within the compatible v4 line**, then regenerate the lockfile. The existing exact override prevents normal dependency resolution from selecting the patch.
- The lockfile audit also flags parent `@eslint/eslintrc` through this issue.

## Moderate severity

### 3. Vitest / @vitest/mocker 4.1.10 — arbitrary file read

- Evidence: `package.json:55`, `package.json:62`, `package-lock.json:6882`, `package-lock.json:6931`, `package-lock.json:13254`.
- GitHub alerts [#23](https://github.com/abalpay/QuranCircle/security/dependabot/23), [#24](https://github.com/abalpay/QuranCircle/security/dependabot/24), and [#25](https://github.com/abalpay/QuranCircle/security/dependabot/25) share the same advisory.
- Redirect mocks can read files outside intended boundaries. Unauthenticated exploitation concerns exposed standalone mocker/interceptor plugins; Vitest browser mode uses authenticated RPC. [Advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- Application relevance: unit tests use jsdom and contract tests use Node. No browser-mode configuration or standalone mocker plugin was found in the inspected configuration/application/test files. This is development tooling, with lower demonstrated exposure in this project.
- Fix: upgrade **vitest and @vitest/coverage-v8 together to 4.1.11**, ensuring transitive `@vitest/mocker` is also patched. Coverage is flagged through its Vitest dependency.
- Existing [Dependabot PR #62](https://github.com/abalpay/QuranCircle/pull/62) proposes the Vitest update. Its full diff and compatibility were not reviewed; verify coverage alignment before merging.

## Verification and remediation order

1. Update the two exact overrides and the matching Vitest/coverage pins; regenerate `package-lock.json` without a forced major upgrade.
2. Perform a clean install. Local `node_modules` currently contains Next.js **16.2.11**, whereas both the manifest and lockfile specify **16.3.4**. `npm ls` reports this mismatch, so the current installation is unsuitable for validating the declared dependency set.
3. Run `npm audit --package-lock-only` and `npm audit --omit=dev`, confirming these advisories disappear.
4. Run lint, unit coverage, production build, and the existing `tests/e2e/image-optimization.spec.ts` against the rebuilt application. Verify contract tests only with the repository's safe test target configured.
5. Merge and redeploy the tested patch; confirm GitHub closes all five alerts after rescanning the default branch.

## Review scope and evidence

- Retrieved all open GitHub Dependabot alerts (five results, below the 100-result page size) and checked the published advisory details.
- Audited the root npm dependency tree and explicitly audited the committed lockfile. The installed-tree audit returned six affected entries; the lockfile audit returned seven, adding `@eslint/eslintrc` as an affected parent.
- The installed production-only audit returned `sharp` and its parent `next` (two high entries, one underlying advisory).
- Inspected dependency paths, image configuration/use, test configuration, and Dependabot configuration. Weekly npm and GitHub Actions updates are already configured in `.github/dependabot.yml`.
- No dependency changes, fixes, merges, deployments, or exploit attempts were performed. No regression tests were run because this was a review. The GitHub email itself was not available; its exact contents were not verified.
- Findings reflect available advisory data on the review date. An absence of an audit finding does not guarantee that a dependency has no undiscovered vulnerabilities. Non-npm tooling and deployment system libraries were not independently scanned.
