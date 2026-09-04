# Dependency Security Review

Date: 2026-09-03

## Executive summary

Before the targeted remediation, `npm audit` reported 13 affected dependency entries: 10 high and 3 moderate. Those entries collapsed to four root dependency families and seven unique advisories, all in development-only packages.

The application bundle and production dependency tree were not exposed to these findings. The risk was concentrated in local development and CI, particularly when tooling processed attacker-controlled repository content. Remediation was warranted because the standard pull-request workflow installs dependencies and runs lint/build tasks on submitted code (`.github/workflows/test.yml:3-8,39-40,70-77`).

Status: **Resolved on 2026-09-03.** Both the full audit and `npm audit --omit=dev` now report zero vulnerabilities. The non-breaking remediation did not change the direct Next.js, ESLint, Stryker, or `typed-rest-client` versions.

## High upstream severity / medium project risk

### DEP-001: `brace-expansion` denial of service

- Rule ID: REACT-SUPPLY-001 / DEP-001
- Status: Resolved
- Severity: Medium in this project; upstream severity High
- Advisories: [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg), [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895)
- Location: `package.json:65-66`; `package-lock.json:5243-5247`, `6340-6344`, `7276-7280`
- Evidence: The lockfile previously contained vulnerable versions 1.1.16, 2.1.2, and 5.0.7. It now resolves patched versions 1.1.18, 2.1.4, and 5.0.9.
- Dependency paths:
  - ESLint and its plugins -> `minimatch@3.1.5` -> `brace-expansion@1.1.18`
  - `eslint-config-next` -> TypeScript ESLint -> `minimatch@9.0.9` -> `brace-expansion@2.1.4`
  - Stryker -> `minimatch@10.2.5` -> `brace-expansion@5.0.9`
- Impact: Crafted brace/glob patterns can exhaust memory or block the event loop. In this repository the package is only used by development tooling, so the realistic impact is a local or CI denial of service rather than a production outage.
- Fix applied: Updated the explicit 1.x override to 1.1.18 and refreshed the other compatible transitive versions to 2.1.4 and 5.0.9.
- Mitigation: No longer required after the update; existing CI timeouts remain useful defense in depth.
- False-positive notes: npm propagates this root issue through `minimatch`, ESLint, `eslint-config-next`, and multiple plugins. Those propagated entries account for most of the 10 high findings; they are not separate vulnerabilities.

### DEP-002: `browserslist` memory exhaustion and malicious stats-file handling

- Rule ID: REACT-SUPPLY-001 / DEP-002
- Status: Resolved
- Severity: Medium in this project; upstream severity High
- Advisories: [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g)
- Location: `package-lock.json:7300-7304`; `.github/workflows/test.yml:7,76-77`
- Evidence: Stryker's Babel toolchain previously installed vulnerable `browserslist@4.28.1`; it now resolves patched `browserslist@4.28.8`. The pull-request workflow runs the production build, which can invoke Browserslist through build tooling. No `browserslist-stats.json` file is currently tracked.
- Impact: Repeated attacker-influenced queries can cause unbounded memory growth, while a malicious custom stats file can crash tooling or alter a newly-created object's prototype. Exposure is limited to build/development processes, but a malicious repository change could disrupt CI.
- Fix applied: Refreshed the lockfile to `browserslist@4.28.8` (4.28.7 is the first patched release).
- Mitigation: Review unexpected `browserslist-stats.json` additions and retain CI timeouts/resource limits.
- False-positive notes: The application does not call Browserslist at runtime and has no custom Browserslist stats file, so remote production exploitation is not evident.

## Moderate upstream severity / low project risk

### DEP-003: `@humanfs/node` symlink-following file disclosure

- Rule ID: REACT-SUPPLY-001 / DEP-003
- Status: Resolved
- Severity: Low in this project; upstream severity Moderate
- Advisory: [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g)
- Location: `package-lock.json:1095-1104`; `package.json:56`
- Evidence: ESLint previously installed development-only `@humanfs/node@0.16.7`; the lockfile now resolves patched `@humanfs/node@0.16.8`. Search of the installed ESLint and `@eslint` sources found no caller of the vulnerable `copy()` or `copyAll()` methods.
- Impact: A symlink in an attacker-controlled source tree could make a copy operation disclose readable files outside that tree. No reachable copy operation was identified in the current ESLint path, so practical exploitability here is low.
- Fix applied: Refreshed the lockfile to `@humanfs/node@0.16.8`.
- Mitigation: Avoid using repository-provided symlink trees as input to file-copying utilities in privileged developer or CI environments.
- False-positive notes: The vulnerable methods exist in the installed package, but no application or ESLint call site was found in this dependency tree.

### DEP-004: `qs` denial of service

- Rule ID: REACT-SUPPLY-001 / DEP-004
- Status: Resolved
- Severity: Low in this project; upstream severity Moderate
- Advisories: [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g)
- Location: `package.json:70`; `package-lock.json:11188-11199`, `12547-12558`
- Evidence: Stryker's `typed-rest-client@2.3.1` pins an older `qs`, and the project override previously raised it only to vulnerable `qs@6.15.3`. The override now resolves patched `qs@6.16.0`. The dependency is marked development-only.
- Impact: Specific parse configurations can bypass array limits and allocate excessive memory; a parse/stringify round trip with attacker-controlled object keys can throw. The app does not import this `qs` package, so risk is limited to Stryker tooling rather than request processing in production.
- Fix applied: Changed the override to `qs@6.16.0`.
- Mitigation: No longer required after the update; continue treating untrusted query data as hostile input.
- False-positive notes: npm also marks `typed-rest-client` as affected because it depends on `qs`; that is a propagated entry, not an additional advisory.

## Applied remediation and verification

1. Changed the nested `brace-expansion` override from 1.1.16 to 1.1.18.
2. Changed the `qs` override from 6.15.3 to 6.16.0.
3. Refreshed compatible transitive dependencies, including `@humanfs/node`, `browserslist`, and all installed `brace-expansion` lines.
4. Verified a clean `npm ci`, zero findings from both audit scopes, lint, 234 unit tests, and a production build.

The validated target dependency set is:

- `@humanfs/node@0.16.8`
- `brace-expansion@1.1.18`, `2.1.4`, and `5.0.9`
- `browserslist@4.28.8`
- `qs@6.16.0`
- `typed-rest-client@2.3.1` retained

Avoid `npm audit fix --force`: npm currently proposes downgrading `eslint-config-next` to 15.5.25, which is unnecessary and would misalign it with Next.js 16.2.11. A targeted compatible update reaches zero reported vulnerabilities without that downgrade.
