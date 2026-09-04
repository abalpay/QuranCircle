# Minimal Hadith Preview Implementation Plan

> **For agentic workers:** use subagent-driven-development for implementation and task reviews. This is the authorised first slice of the full HadeethEnc plan, not a production release.

**Goal:** Let the user browse HadeethEnc topics and read source-attributed entries on a local dev server in an isolated worktree before deciding on further work or merge.

**Architecture:** Official versioned XLSX downloads converted losslessly to local JSON; source API used only during import for root topic membership. Server-rendered reading, client islands for local preferences/bookmarks. No runtime source network dependency.

**Tech Stack:** Existing Next.js, React, next-intl, TypeScript, Node 24, Python/openpyxl extraction, Vitest; no framework upgrades.

**Spec:** `docs/superpowers/specs/2026-09-04-hadeethenc-reader.md`. This minimal-preview scope defers release-only workflow/sitemap/privacy integration, sharing, resume, and translation-only view. It retains topic browsing, all entries, bilingual reading, source metadata, local saves and size controls.

## Global Constraints

- Work only in `/Users/ahmet/Documents/Alpaylabs/QuranCircle-worktrees/hadith-reader-preview` on `codex/hadith-reader-preview`. Never push, merge, deploy, create a scheduled workflow, or edit the main checkout.
- Support interface locales `en`, `tr`, `ar`; English remains unprefixed and Arabic remains RTL.
- Preserve all source text, punctuation, brackets, diacritics, notices and supplied metadata; no AI translation, rewriting, grading or inferred reference numbers.
- Keep each translated edition paired with the Arabic supplied in its own workbook.
- Display HadeethEnc attribution and the exact edition version on every reader page; provide the complete original publisher notice in accessible source details.
- No runtime requests to HadeethEnc from either browser or application server.
- No changes to authentication, circle claims, Khatm completion or existing database schemas.
- No framework upgrades, new UI libraries, new fonts or global redesign.
- All reader touch controls must be at least 44 by 44 CSS pixels; retain browser zoom and existing safe-area handling.
- User reading preferences and bookmarks stay on this device; no content body or personal reading history is sent to analytics.
- Snapshot refreshes must validate before promotion and require human review; never automatically publish changed religious text.
- A known upstream correction must not be hidden by rolling back to a superseded incorrect edition.
- Preserve force-dynamic nonce CSP. Default server flag `HADITH_READER_ENABLED` off; enable only for local preview. No production credentials needed.

## Task 1: Lossless local dataset and server repository

**Files:** `lib/hadith/{types,normalise,repository,paths,feature}.ts`, `scripts/hadith/{extract.py,refresh.mjs,validate.ts,requirements.txt}`, `data/hadith/**`, `tests/unit/lib/hadith/**`, `docs/hadith-source-policy.md`, scoped edits to `.gitignore`, `.env.example`, `next.config.ts`, `package.json` for scripts only.

**Interface:** Define `HadithLocale = 'en'|'tr'|'ar'`; `TextBlock = {title,text,explanation,benefits,grade,attribution,wordMeanings}` (strings); `HadithDocument = {id,locale,editionVersion,sourceUrl,text:TextBlock,arabic:TextBlock|null,raw:Record<string,string|null>}`; `Edition = {locale,version,publisherUpdatedAt,notice,sourceUrl,downloadUrl,checkUrl,sha256,retrievedAt}`; `Topic = {id,title,ids:string[]}`; `HadithSummary = {id,title,locales:HadithLocale[]}`. `Manifest = {schemaVersion:1,editions:Record<HadithLocale,Edition>,taxonomyRetrievedAt,importedCounts:Record<HadithLocale,number>}`. `LocaleIndex = {entries:Record<string,HadithSummary>,topics:Topic[],allIds:string[]}`; `HadithIndex = Record<HadithLocale,LocaleIndex>`.

`getManifest():Promise<Manifest>`, `getIndex():Promise<HadithIndex>`, `getTopics(locale):Promise<Topic[]>`, `getTopicPage(locale,topicId,page):Promise<{topic,items:HadithSummary[],page,totalPages,totalItems}|null>`, `getReader(locale,id,topicId?):Promise<ReaderResult>`.
`ReaderResult` is `{kind:'missing'}` or `{kind:'unavailable',locales:HadithLocale[]}` or `{kind:'found',document:HadithDocument,edition:Edition,locales:HadithLocale[],previousId:string|null,nextId:string|null,topicId:string,returnPage:number}`.

- [ ] Write failing focused tests for lossless mapping, source origin/ID validation, duplicate IDs, Arabic pairing, topic API-only filtering/dedup, page boundaries, unavailable versus missing, and corrupt indexed document errors.
- [ ] Implement mapping using raw fields without trim/cleaning. Exact source keys are title, hadith_text, explanation, benefits, grade, takhrij, word_meanings, with `_ar` suffix for paired Arabic. AR document `arabic` is null. Validate decimal IDs and supported locale before path construction; official HTTPS source URLs only; optional fields empty string, raw untouched.
- [ ] Read exports via bundled Python openpyxl read_only=True, data_only=False; row1 notice, row2 headers, row3 onward records. Reject formula cells, duplicate headers, IDs, missing text; preserve all fields. Extractor creates JSON, never modifies XLSX. Pin openpyxl 3.1.5 for reproducibility.
- [ ] Import all three official downloads from `https://hadeethenc.com/en/browse/download/{locale}`. Use Node fetch with allowlisted HTTPS redirects (5), timeouts/retries (3), 25MB XLSX / 5MB API bounds, max 2 concurrent requests. Capture versioned URL, notice/version match, SHA256, publisher date and retrieval date. API root topics and paginated lists only enrich membership, never text. Reject inconsistent pagination; report API-only IDs and unmapped export IDs. Use unique IDs in retained source order, 20 entries/page.
- [ ] Generate to an ignored staging directory; validate before an explicit local-preview promotion. Keep real sources local in ignored import scratch. No automatic approved corpus overwrite; versioned JSON in data/hadith is labelled unreviewed local-preview material in README/policy. This task may promote the initial validated snapshot for local preview, not mark scholarly/publication review complete.
- [ ] Cache compact manifest/index on server only; read only requested document. Export injectable repository factory for tests; missing/corrupt files are operational errors. Invalid topic context falls back to all. `hadithPath(id)` validates IDs. `isHadithEnabled()` checks server env exact true.
- [ ] Add output tracing for hadith routes only; use Next's built-in server-only marker or existing package without upgrading unrelated dependencies. Add npm import/validation commands and runbook including original terms, content excluded from code licence, source-review requirement and disable flag.
- [ ] Run focused tests, dataset validation, typecheck; record counts/versions/mismatches/source comparisons. Commit scoped work and write report. Do not run another install concurrently with controller.

## Task 2: Minimal reader interface and integration

**Files:** `app/[locale]/hadith/{layout,page,loading,error,not-found}.tsx`, `topics/[topicId]/page.tsx`, `[id]/page.tsx`, `sources/page.tsx`, `saved/page.tsx`; `components/hadith/**`, `lib/hadith/local-state.ts`; scoped `messages/{en,tr,ar}.json`, `components/{header,mobile-navigation}.tsx`, `app/[locale]/layout.tsx`, `app/globals.css`; focused unit tests.

**Interface:** Use Task 1 repository; do not change corpus/importer API. A small `ReaderControls` wrapper receives only saved-entry metadata and server-rendered children. Local state key `qurancircle:hadith:v1` with validated id/title/locale/version and size; no body/URLs. Expose canonical locale paths using existing navigation helpers.

- [ ] Write failing tests for source preservation/escaping, Arabic-only no duplicate, source notices, local state corruption/quota failure and bookmark persistence, flag-gated navigation and catalogue parity.
- [ ] Build quiet editorial interface using existing parchment/deep-green/gold tokens, Cormorant/Manrope and Arabic fonts. Home shows introduction, 7 source-named root topics with counts, All entries and saved/source links. Clear preview label and noindex metadata across new routes until review. Topics paginate via ordinary links, full source titles, invalid topics/pages 404. Reader has breadcrumb/back, source title, Arabic + current translation, source grade/reference, explanation, benefits, word meanings when present, paired Arabic metadata in details, complete notice + version + publisher links. Previous/next preserves valid topic and page. No invented content.
- [ ] Valid ID absent in selected locale shows explicit available-language links without silent fallback; globally unknown ID 404. Include direct language links on reader for EN/TR/AR (available editions); labels via locale config. Loading/errors localized; retry operational failures.
- [ ] Reader text width max48rem, Arabic initial1.75rem/2, translation1.125rem/1.85, whitespace-pre-wrap and safe breaking. Size controls standard/large/larger, aria-pressed, 44px targets. No content animation or nested scroll. Preserve bottom navigation clearance and RTL.
- [ ] Save/remove local entries (cap100 with visible limit message), saved page lists source titles in saved locale, per-entry remove and clear feature data only. Hydrate storage after mount, handle malformed data/quota/blocked reads with status, reading stays functional. No resume/sharing/view-mode for this minimal slice.
- [ ] Add gated desktop Hadith and fifth mobile tab; `hadithEnabled=false` default prop passed from server layout; preserve four-column state off, five on. Do not alter existing auth/CSP behavior. Keep other pages/labels unchanged. No sitemap/workflow changes for unapproved preview.
- [ ] Run focused tests, catalogue parity, typecheck and lint. Commit scope, report exact commands/results/concerns. Controller then runs dev-server browser checks, full suite/build and review.

## Controller verification and handoff

- [ ] Keep main's unrelated files intact; migrate only original Hadith planning docs to this worktree.
- [ ] Start from current main; check maintenance merge again before handoff. If main advances, incorporate that base only within this branch, never merge feature into main. Record precise base and any pending update honestly.
- [ ] Use isolated node_modules and preview-only fake auth environment; no production secrets copied. Start local dev server on an unused localhost port, preferably 3002.
- [ ] Test real data EN/TR/AR browsing, paging, reading, saves, source details, missing paths, mobile320/390 and desktop, keyboard controls, horizontal overflow and server logs. Confirm no runtime HadeethEnc requests. Inspect screenshots. Run full unit suite/build and document baseline issues separately.
- [ ] Separate task reviews and a final branch review. Leave dev server running, open preview in Codex, provide URL + worktree/branch + remaining release limitations. No push/deploy/merge.
