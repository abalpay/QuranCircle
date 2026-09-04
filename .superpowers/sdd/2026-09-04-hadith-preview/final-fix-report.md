# Final bounded fix report

Base: `37b9497`. Scope: isolated preview worktree only. No corpus, auth, CSP, proxy, homepage, dependencies, deployment, merge, or push changes. Existing controller-owned `CLAUDE.md` change preserved and excluded from commit.

## Changes and self-review

- Added a shared server-only `requireHadithEnabled` guard at the start of every index/topic/reader/sources/saved page, before parameters, translations, repository reads, or client children. Existing parent and navigation guards remain. This addresses independent child rendering rather than relying on visible layout gating. React server-serialization guidance informed the boundary placement; no visual redesign was made.
- Split injectable repository logic into `repository-core.ts`. Production repository uses a dedicated adapter accepting only manifest/index or decimal-ID JSON in en/tr/ar. Literal per-locale corpus prefixes remain directly at filesystem reads. Injected fixture roots remain supported, but there is no arbitrary production-root option. Fulfilled promise caches, failure eviction/retry, and normalized-document validation are preserved.
- Added direct-child regression tests and production path-validation tests. Added maintained trace and full-response transport checkers under `scripts/hadith/`.
- Trace checker checks every corpus JSON file, not only record4560, and rejects accidental root configuration JSON plus scratch/env. Runtime package.json remains allowed. Explicit corpus tracing configuration is unchanged.

## RED / GREEN

1. Before implementation, focused command below failed: all five new direct-child tests failed (children either read mocks or rendered saved UI despite flagfalse), and adapter suite failed to resolve the absent module. Existing12 route tests passed.
2. Implemented guard and adapter. Initial fs mock needed both named/default exports because the transformed reader resolves the default namespace; corrected the test mock. Final focused run: **68 tests across8 files passed**, including failure→success cache retry and normalized-document corruption cases.
3. First build iteration still warned: core `path.join` independently triggered root tracing; generic production corpus read matched32256 pattern paths. New trace checker failed on components.json. Replaced core filesystem-path operations with injectable relative-name construction and split IO into literal locale prefixes.
4. Final build exited0 with **no broad-pattern or other warning matches**. Maintained trace checker passes.

## Commands and results

All npm/node/npx commands below used `PATH=/Users/ahmet/.local/share/fnm/node-versions/v24.18.0/installation/bin:$PATH` (Node24.18.0).

```sh
npm run test:unit -- tests/unit/app/hadith-routes.test.tsx tests/unit/lib/hadith/production-read.test.ts
# RED:5 failing direct-child tests + missing adapter suite;12 existing tests pass
npm run test:unit -- tests/unit/app/hadith-routes.test.tsx tests/unit/lib/hadith tests/unit/components/hadith
# GREEN:68 tests/8 files, final run after adapter changes
npx tsc --noEmit
# PASS, exit0
npx eslint 'app/[locale]/hadith' lib/hadith tests/unit/app/hadith-routes.test.tsx tests/unit/lib/hadith/production-read.test.ts scripts/hadith/check-traces.mjs scripts/hadith/check-transport.mjs
# PASS, exit0
npm run build > /tmp/hadith-final-build.log 2>&1
# PASS, exit0; placeholder .env.local retained, no real credentials copied
node scripts/hadith/check-traces.mjs
# PASS, all5 routes, all8064 corpus files each, prohibited files absent
git diff --check
# PASS
```

Final trace totals (sum of traced file sizes, not compressed deployment artifact size):

| Route | Files | Corpus files | MiB |
| --- | ---: | ---: | ---: |
| Reader | 8313 | 8064 | 89.38 |
| Index | 8312 | 8064 | 89.37 |
| Saved | 8313 | 8064 | 89.37 |
| Sources | 8312 | 8064 | 89.37 |
| Topic | 8312 | 8064 | 89.37 |

## Actual production transport verification

Ran sequential owned servers, stopped each with Ctrl-C before starting the next, and stopped final server after tests:

```sh
HADITH_READER_ENABLED=false npm run start -- --hostname localhost -p 3003
node scripts/hadith/check-transport.mjs false http://localhost:3003
# PASS12 full responses; flagfalse explicitly overrides .env.local true
HADITH_READER_ENABLED=true npm run start -- --hostname localhost -p 3003
node scripts/hadith/check-transport.mjs true http://localhost:3003
# PASS12 full responses, each HTTP200
```

Each run covers `/hadith/4560`, `/tr/hadith/4560`, `/ar/hadith/4560` and sources in all three locales, each via HTML and `RSC:1`. The script consumes response.text completely, checks response content-type, and checks exact imported title/body/explanation/notice with raw, HTML-escaped, JSON-escaped, and nested JSON-escaped representations. Sources routes check all three edition notices. **42 source assertions per flag state;84 total**. All source sentinels absent with flagfalse and present with flagtrue. This is a transport-content check, not just DOM hiding.

Disabled responses returned streamed HTTP200, accepted under documented preview scope; no literal404 assertion was made. Disabled HTML sizes119294–144679 bytes, RSC86665–111391; enabled HTML126114–158074, RSC93139–120906. General translated metadata remains, as allowed.

## Concerns / handoff

- Literal HTTP404 remains deliberately deferred; this wave fixes disabled source delivery, not the inherited streaming boundary behavior.
- An initial server bound to127.0.0.1 produced an English locale rewrite redirect loop. Binding exactly `localhost`, as the brief requests, resolved it. No routing/proxy changes made.
- This verifies local production build and transport only; not deployment approval. Controller owns final browser/WebKit smoke and persistent dev restart.
- Controller reported baseline full suite283 tests/50 files passing. This worker ran the scoped68-test suite, typecheck, lint, build, trace checks and production transport; no claim of a new full-suite run.
- No temporary production server left running; no changes to controller scratch or CLAUDE.md.
