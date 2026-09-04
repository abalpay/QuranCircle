# HadeethEnc Reader Implementation Plan

Execution note: the user requested a minimal local preview before further work or merging. `2026-09-04-hadith-preview.md` defines that bounded first slice; this full release plan remains the follow-up roadmap.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Resolve those skill names against the execution environment. This workspace lists `subagent-driven-development`; it does not currently list `superpowers:executing-plans`. Do not claim an unavailable skill was used. Implementation/delegation starts only after the user approves execution.

**Goal:** Build a public, source-attributed Arabic/English/Turkish reader with main-topic browsing, device-local saved entries and resume reading.

**Architecture:** Convert HadeethEnc's official versioned exports into validated JSON snapshots, enriching only topic membership from its public API. Read snapshots from server components and hydrate only reader controls and local preferences. No runtime external content API, database migration or authentication change.

**Tech Stack:** Existing Next.js 16/React 19/next-intl/Tailwind/Zod; Node 24 import orchestration; Python/openpyxl for development-time XLSX extraction; Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-hadeethenc-reader.md` (read completely before execution).

## Global Constraints

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

---

## Repository findings and execution boundaries

- Routes live under `app/[locale]`; locale helpers are `i18n/locale-config.ts` and `i18n/navigation.ts`. Use these rather than hand-building `/en` routes.
- `app/[locale]/layout.tsx` is force-dynamic for nonce CSP. Preserve this; do not promise statically rendered reader pages or enable Cache Components globally.
- Existing fonts and design tokens already support Arabic. `components/header.tsx` and `components/mobile-navigation.tsx` own navigation; `.mobile-bottom-nav-surface` currently uses four columns in `app/globals.css`.
- Vitest discovers `tests/unit/**/*.test.{ts,tsx}`. Existing locale catalog parity tests cover all three message files.
- The existing Playwright configuration has safe test-target checks; retain them. Do not execute destructive integration suites against production.
- Planning found pre-existing changes to `package.json`, `package-lock.json`, another untracked plan and a security report. Recheck status before execution and stage only this feature's changes. Any dependency edits must preserve concurrent maintenance work.
- This plan creates documents only. Source content import, commits, workflows and publication described below are future implementation steps.

## File map

| Files | Responsibility |
| --- | --- |
| `lib/hadith/types.ts`, `schema.ts`, `normalise.ts` | Domain contract, untrusted input validation and lossless row mapping |
| `scripts/hadith/extract.py`, `requirements.txt`, `refresh.mjs`, `check-versions.mjs` | Source extraction, bounded API collection, staged snapshot generation and version checks |
| `data/hadith/manifest.json`, `index.json`, `en/*.json`, `tr/*.json`, `ar/*.json` | Reviewed generated dataset; each document retains raw fields and provenance |
| `lib/hadith/repository.ts`, `paths.ts`, `feature.ts` | Server-only reads, deterministic topic navigation, canonical paths and rollout flag |
| `components/hadith/topic-browser.tsx`, `entry-list.tsx`, `reader.tsx`, `source-details.tsx` | Server-rendered browse, text and provenance |
| `components/hadith/reader-controls.tsx`, `reading-shortcuts.tsx`, `saved-list.tsx` | Small client islands for controls, resume and saved links |
| `lib/hadith/local-state.ts`, `hooks/use-hadith-state.ts` | Versioned, resilient device-local persistence |
| `app/[locale]/hadith/**` | Locale-aware page orchestration, loading, errors and metadata |
| `tests/unit/lib/hadith/*`, `tests/unit/components/hadith/*`, `tests/e2e/hadith-reader.spec.ts` | Import/content, state, UI and browser coverage |
| `tests/fixtures/hadith/*`, `playwright.hadith.config.ts` | Synthetic deterministic snapshots and focused browser configuration |
| `docs/hadith-source-policy.md`, `.github/workflows/hadith-source-check.yml` | Publication obligations, refresh runbook and read-only update detection |

## Shared interfaces

Implement this contract in Task 1. No function in subsequent tasks should rename its properties.

```ts
export type HadithLocale = 'en' | 'tr' | 'ar';
export type TopicId = string; // "all" or positive decimal ID from the source
export type TextBlock = {
  title: string; text: string; explanation: string;
  benefits: string; grade: string; attribution: string; wordMeanings: string;
};
export type Edition = {
  locale: HadithLocale; version: string; publisherUpdatedAt: string;
  notice: string; sourceUrl: string; downloadUrl: string;
  checkUrl: string; sha256: string; retrievedAt: string;
};
export type HadithDocument = {
  id: string; locale: HadithLocale; editionVersion: string;
  sourceUrl: string; text: TextBlock; arabic: TextBlock | null;
  raw: Record<string, string | null>;
};
export type HadithSummary = {
  id: string; title: string; locales: HadithLocale[];
};
export type Topic = { id: TopicId; title: string; ids: string[] };
export type LocaleIndex = {
  entries: Record<string, HadithSummary>; topics: Topic[]; allIds: string[];
};
export type HadithIndex = Record<HadithLocale, LocaleIndex>;
export type Manifest = {
  schemaVersion: 1; editions: Record<HadithLocale, Edition>;
  taxonomyRetrievedAt: string; importedCounts: Record<HadithLocale, number>;
};
export type TopicPage = {
  topic: Topic; items: HadithSummary[]; page: number;
  totalPages: number; totalItems: number;
};
export type ReaderResult =
  | { kind: 'found'; document: HadithDocument; edition: Edition;
      locales: HadithLocale[]; previousId: string | null; nextId: string | null;
      topicId: TopicId; returnPage: number }
  | { kind: 'unavailable'; locales: HadithLocale[] }
  | { kind: 'missing' };
export type SavedEntry = {
  id: string; title: string; locale: HadithLocale;
  editionVersion: string; savedAt: string;
};
export type ReadingState = {
  schemaVersion: 1; size: 'standard' | 'large' | 'larger';
  view: 'both' | 'arabic' | 'translation';
  bookmarks: SavedEntry[]; lastOpened: SavedEntry | null;
};
```

`arabic` is null for Arabic documents, avoiding duplicate text. All optional source text maps to an empty string, not invented prose. Raw fields and original notices survive every conversion.

### Shared synthetic test fixtures

Put these in `tests/fixtures/hadith/source-rows.ts`; export the matching types from `lib/hadith/types.ts`. These strings are test labels, not hadith quotations. For a reader test requiring script-like content, clone `doc4560` and replace its text with the literal `<script>alert(1)</script>`.

```ts
export const editionFixture: Edition = {
  locale: 'en', version: 'v1.0.0', publisherUpdatedAt: '2026-01-01 00:00:00',
  notice: '# Synthetic test fixture only\n# Language: English\n# Source: https://hadeethenc.com/en\n# Last update: 2026-01-01 00:00:00 (v1.0.0)\n# Check for updates: https://hadeethenc.com/en/check/en/v1.0.0',
  sourceUrl: 'https://hadeethenc.com/en',
  downloadUrl: 'https://hadeethenc.com/downloads/excel/HadeethEnc.com_en-v1.0.0.xlsx',
  checkUrl: 'https://hadeethenc.com/en/check/en/v1.0.0',
  sha256: '0'.repeat(64), retrievedAt: '2026-01-01T00:00:00.000Z',
};
export const doc4560: HadithDocument = {
  id: '4560', locale: 'en', editionVersion: 'v1.0.0',
  sourceUrl: 'https://hadeethenc.com/en/browse/hadith/4560',
  text: {title:'Test entry',text:'Test [annotation]\nline',explanation:'Test explanation',
    benefits:'',grade:'Test grade',attribution:'Test attribution',wordMeanings:''},
  arabic: {title:'اختبار',text:'نَصٌّ [اختبار]',explanation:'',benefits:'',
    grade:'',attribution:'',wordMeanings:''},
  raw: {id:'4560',title:'Test entry',hadith_text:'Test [annotation]\nline'},
};
export const doc2962: HadithDocument = {
  ...doc4560, id:'2962',sourceUrl:'https://hadeethenc.com/en/browse/hadith/2962',
  text:{...doc4560.text,title:'Second test entry'},
  raw:{id:'2962',title:'Second test entry',hadith_text:doc4560.text.text},
};
export const topicFixtures: Topic[] = [
  {id:'1',title:'Topic one',ids:['4560']},
  {id:'5',title:'Topic five',ids:['4560','2962']},
];
export const readerFixture: Extract<ReaderResult,{kind:'found'}> = {
  kind:'found',document:doc4560,edition:editionFixture,locales:['en','ar'],
  previousId:null,nextId:'2962',topicId:'5',returnPage:1,
};
export const stateFixture: ReadingState = {
  schemaVersion:1,size:'standard',view:'both',bookmarks:[],lastOpened:null,
};
```

### Task 1: Lossless source model and publication contract

**Files:** Create the three model files, `docs/hadith-source-policy.md`, `tests/fixtures/hadith/source-rows.ts`, `tests/unit/lib/hadith/normalise.test.ts`.

**Interfaces:** `normaliseRow(locale: HadithLocale, row: Record<string, string | null>, edition: Edition): HadithDocument`; `parseEditionNotice(notice: string, downloadUrl: string, sha256: string, retrievedAt: string): Edition`. Zod validates every domain type above and rejects unknown schema versions.

- [ ] Write a failing text-preservation test using explicitly synthetic fixture strings, not fabricated religious quotations:

```ts
it('preserves brackets, newlines, Arabic marks and attribution exactly', () => {
  const row = { id: '4560', title: 'Test entry', hadith_text: 'Test [annotation]\nline',
    hadith_text_ar: 'نَصٌّ [اختبار]', title_ar: 'اختبار', explanation: '',
    benefits: null, grade: '[Test grade]', takhrij: '[Test attribution]',
    lang: 'en', link: 'https://hadeethenc.com/en/browse/hadith/4560' };
  const doc = normaliseRow('en', row, editionFixture);
  expect(doc.text.text).toBe(row.hadith_text);
  expect(doc.arabic?.text).toBe(row.hadith_text_ar);
  expect(doc.raw).toEqual(row);
  expect(doc.text.attribution).toBe(row.takhrij);
});
```

`editionFixture` in `source-rows.ts` implements every Edition field with locale `en`, version `v1.0.0`, an explicitly synthetic notice, the official URL shape, a 64-character test hash and a fixed ISO retrieval timestamp. Add cases for missing text, invalid ID, wrong locale, unexpected link host, missing/version-mismatched notice and Arabic null pairing.

- [ ] Run `npm run test:unit -- tests/unit/lib/hadith/normalise.test.ts`; expect missing-module failures before implementation.
- [ ] Implement exact mapping, with no trim/regex cleaning of content. Parse IDs separately with `/^[1-9][0-9]*$/`; reject content over 250,000 characters per field rather than truncating it. Preserve unexpected string columns in `raw`, report their names, and require review before publication.

```ts
const value = (row: Record<string, string | null>, key: string) => row[key] ?? '';
const block = (row: Record<string, string | null>, suffix = ''): TextBlock => ({
  title: value(row, `title${suffix}`), text: value(row, `hadith_text${suffix}`),
  explanation: value(row, `explanation${suffix}`), benefits: value(row, `benefits${suffix}`),
  grade: value(row, `grade${suffix}`), attribution: value(row, `takhrij${suffix}`),
  wordMeanings: value(row, `word_meanings${suffix}`),
});
```

- [ ] Document the seven publisher conditions from the spec, link the original terms, and explicitly state that this content is excluded from the repository's MIT grant. Record publication review as required, not already obtained. Run tests to PASS; commit only Task 1 files with `feat(hadith): define lossless source model`.

### Task 2: Reproducible, versioned import and topic mapping

**Files:** Create `scripts/hadith/extract.py`, `requirements.txt`, `refresh.mjs`, `data/hadith/README.md`, generated snapshot files, `tests/unit/lib/hadith/import.test.ts`; modify `.gitignore`, `package.json` only for scoped scripts.

**Interfaces:** Extractor receives an XLSX path and emits `{notice, headers, rows}` as UTF-8 JSON to stdout. Refresher takes `--output <staging-directory>` and writes manifest/index/documents plus an import report. Expose pure `buildTopicIndex(locale: HadithLocale, rows: HadithDocument[], rootLists: Topic[]): LocaleIndex` and `validateSnapshot(snapshot): void` from `lib/hadith/normalise.ts` for shared tests. Snapshot is `{manifest:Manifest,index:HadithIndex,documents:HadithDocument[]}`. Fill each summary's locale availability after all locale indices are built, using actual document membership.

- [ ] Add failing tests for duplicate IDs, missing optional translations, empty roots, pagination consistency, topic overlap and API/export divergence:

```ts
it('uses unique exported IDs and never publishes API-only entries', () => {
  const topics = buildTopicIndex('en', [doc4560, doc2962], [
    { id: '1', title: 'Topic one', ids: ['4560', '4560', '9999'] },
    { id: '5', title: 'Topic five', ids: ['4560', '2962'] },
  ]);
  expect(topics.topics[0].ids).toEqual(['4560']);
  expect(topics.allIds).toEqual(['4560', '2962']);
});
```

Define `doc4560` and `doc2962` as full synthetic HadithDocument fixtures in `source-rows.ts`. Run `npm run test:unit -- tests/unit/lib/hadith/import.test.ts` and observe FAIL.

- [ ] Implement read-only extraction with `openpyxl.load_workbook(path, read_only=True, data_only=False)`. Reject formula cells; map by exact header names, skip only wholly empty rows, reject duplicate headers, preserve row 1 verbatim, and assert required headers for the locale. Pin `openpyxl==3.1.5` (verified during planning) in `requirements.txt`; use a local virtual environment in CI, never the user's global Python.

```py
headers = [cell.value for cell in sheet[2]]
if len(headers) != len(set(headers)):
    raise ValueError('Duplicate export headers')
for cells in sheet.iter_rows(min_row=3):
    if all(cell.value is None for cell in cells):
        continue
    if any(cell.data_type == 'f' for cell in cells):
        raise ValueError('Formula in source export')
    row = dict(zip(headers, [None if c.value is None else str(c.value) for c in cells]))
```

- [ ] Implement Node download orchestration, SHA-256 and notice/version matching. Discover the current export from the official download URL and only follow HTTPS redirects on `hadeethenc.com`, capped at five redirects and 25MB per XLSX. Set a 20-second timeout, two concurrent requests maximum, and three attempts for network/429/5xx with bounded backoff respecting Retry-After. Never scrape website reader pages. The Node process handles downloading, since Python urllib returned HTTP 403 in planning while Node fetch succeeded.

```js
const locales = ['en', 'tr', 'ar'];
const downloadUrl = locale => `https://hadeethenc.com/en/browse/download/${locale}`;
const listUrl = (locale, id, page) => {
  const url = new URL('https://hadeethenc.com/api/v1/hadeeths/list/');
  url.search = new URLSearchParams({language: locale, category_id: id,
    page: String(page), per_page: '100'}).toString();
  return url;
};
```

Fetch roots then all pages per root/locale. Assert current page, last page, distinct received IDs and total_items agree; abort on mid-run count changes rather than guessing completion. Limit JSON responses to 5MB and source pagination to 1,000 pages per root. Import text solely from the downloaded workbook. Include unmapped exported entries in All available; report unmatched IDs in both directions and actual retained topic counts.

- [ ] Generate into an ignored `tmp-hadith-import-*` directory and validate all locales before touching `data/hadith`. Produce counts, changed/deleted IDs and per-field hashes against the previous approved snapshot. Never silently overwrite the approved corpus during download or partial failure. Add scripts:

```json
{
  "hadith:refresh": "node scripts/hadith/refresh.mjs",
  "hadith:validate": "node --experimental-strip-types scripts/hadith/validate.ts"
}
```

Create `scripts/hadith/validate.ts` as a CLI with two modes: `--assemble <input-directory> --output <staging-directory>` calls `parseEditionNotice`, `normaliseRow`, `buildTopicIndex` and `validateSnapshot`; without `--assemble` it reads and validates the approved `data/hadith` directory (or an explicit `--input` directory). Input directory contains `{en,tr,ar}.extract.json`, per-locale download metadata and `topics.json`. Use explicit relative `.ts` imports compatible with Node type stripping, not the Next `@/` alias. Importer invokes assembly rather than duplicating domain rules in Python. Respect current TS compiler settings; use no enum/namespace syntax requiring transpilation in these pure modules.

- [ ] Run import unit tests to PASS, then a real staged import and compare at least ten entries per locale with their own source workbook, including 4560, long text, empty benefits and punctuation. Retain hashes/notices and verify duplicate/missing-text counts are zero. Human review precedes promotion of the exact staging directory. Commit generated JSON and source policy updates with `feat(hadith): add reviewed versioned snapshots`.

### Task 3: Server repository and deterministic navigation

**Files:** Create `lib/hadith/repository.ts`, `paths.ts`, `feature.ts`, `tests/unit/lib/hadith/repository.test.ts`; modify `next.config.ts`, `.env.example`, and add `server-only` to dependencies if not already available.

**Interfaces:** `getTopics(locale): Promise<Topic[]>`; `getTopicPage(locale, topicId, page): Promise<TopicPage | null>`; `getReader(locale,id,topicId?): Promise<ReaderResult>`; `getManifest(): Promise<Manifest>`; `getIndex(): Promise<HadithIndex>`. `hadithPath(id: string): string` returns `/hadith/${id}` after ID validation. `isHadithEnabled(): boolean` reads server env `HADITH_READER_ENABLED === 'true'`.

- [ ] Write failing tests for topic overlap, first/last boundaries, page 0/non-integer/out-of-range, missing locale versus missing global ID, invalid path traversal IDs, and corrupt files throwing operational errors. Use injectable `createHadithRepository({readJson})` in `repository.ts` for unit tests; `readJson(relativePath: string): Promise<unknown>` is the only injected dependency.

```ts
const reader = await repo.getReader('tr', '4560', '5');
expect(reader.kind).toBe('unavailable'); // fixture has EN/AR, not TR
expect(await repo.getReader('en', '9999')).toEqual({kind: 'missing'});
await expect(repo.getReader('en', '../manifest')).rejects.toThrow();
```

- [ ] Implement validated reads from `data/hadith` (or a server-only `HADITH_DATA_DIR` for tests). Keep the compact index/manifest in module-scoped promises; delete rejected promises to allow retry. Read only the requested document, not all text. Wrap request-level document access in React `cache` to deduplicate metadata/page reads. Do not use user cookies in repository keys.

```ts
const PAGE_SIZE = 20;
const start = (page - 1) * PAGE_SIZE;
const items = ids.slice(start, start + PAGE_SIZE).map(id => index.entries[id]);
const position = ids.indexOf(id);
const previousId = position > 0 ? ids[position - 1] : null;
const nextId = position >= 0 && position + 1 < ids.length ? ids[position + 1] : null;
```

An invalid/missing browsing topic falls back to `all`; getReader derives the return page from the actual index position. Locale validation and decimal ID validation happen before constructing filesystem paths. A document named in the index but absent on disk throws; it is not a 404.

- [ ] Include `data/hadith/**/*.json` in output tracing for hadith routes only, using escaped `[locale]` route patterns per Next's output-tracing documentation. Add an artifact test to inspect the built `.nft.json` files and verify English/Turkish/Arabic detail JSON and manifest are present. No global `output: 'standalone'` migration is required. Set the feature flag off in `.env.example` with a publication-review comment.

```ts
outputFileTracingIncludes: {
  '/\\[locale\\]/hadith': ['./data/hadith/**/*.json'],
  '/\\[locale\\]/hadith/**': ['./data/hadith/**/*.json'],
},
```

- [ ] Run repository tests to PASS. Commit only scoped files with `feat(hadith): add server snapshot repository`. A production build with external content network blocked must later prove no implicit live calls.

### Task 4: Main-topic browser and locale copy

**Files:** Create `app/[locale]/hadith/layout.tsx`, `page.tsx`, `topics/[topicId]/page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`; create `components/hadith/topic-browser.tsx`, `entry-list.tsx`; modify `messages/en.json`, `tr.json`, `ar.json`; create `tests/unit/components/hadith/topic-browser.test.tsx`.

**Interfaces:** `TopicBrowser({topics,locale})`; `EntryList({page,locale})`; server routes await locale params/searchParams, call repository functions and use next-intl. Hadith layout gates with `isHadithEnabled()` and `notFound()` before rendering children.

- [ ] Add failing tests with `NextIntlClientProvider` in EN/TR/AR: root topic names stay source-provided, counts reflect unique snapshot IDs, links retain locale and page, zero results produce a clear message, and invalid pages never start a fetch or render page NaN.

```tsx
render(<IntlWrapper><TopicBrowser topics={topicFixtures} locale="en" /></IntlWrapper>);
expect(screen.getByRole('link', {name: /Topic five/})).toHaveAttribute('href', '/hadith/topics/5');
```

Define `topicFixtures` in `source-rows.ts` as two Topics with the fixture IDs. Run `npm run test:unit -- tests/unit/components/hadith/topic-browser.test.tsx` to see FAIL.

- [ ] Add `Hadith` message namespace with labels for topic browsing, All available, unavailable language, counts, previous/next, Arabic/translation, explanation/benefits, sources, bookmarks, resume, storage failure, clear data, sharing, retry, and metadata. Add `Header.hadith` and `MobileNav.hadith` in all locales. Initial navigation labels are `Hadith`, `Hadis`, `الحديث`. Source titles/text never go into translation catalogs.
- [ ] Implement pages with ordinary locale-aware links and server pagination. Do not fetch all text for a list or ship the full index to a client component. Render source titles in full rather than silently rewriting them.

```tsx
const { locale } = await params;
setRequestLocale(locale);
const t = await getTranslations({locale, namespace:'Hadith'});
const topics = await getTopics(locale);
return <main className="page-shell grow hadith-shell">
  <h1 className="font-heading">{t('title')}</h1>
  <TopicBrowser topics={topics} locale={locale} />
</main>;
```

- [ ] Add localized skeleton/error/404 views, with a retry button for operational errors. Run component tests and `npm run test:unit -- tests/unit/i18n/catalog-parity.test.ts`; both PASS. Commit as `feat(hadith): add localized main-topic browsing`.

### Task 5: Reader, provenance and source page

**Files:** Create `app/[locale]/hadith/[id]/page.tsx`, `sources/page.tsx`, `components/hadith/reader.tsx`, `source-details.tsx`, `tests/unit/components/hadith/reader.test.tsx`; modify `app/globals.css` with scoped styles only.

**Interfaces:** `HadithReader({result})` receives only the found ReaderResult branch; `SourceDetails({edition,sourceUrl,raw})` retains all publisher metadata and unexpected raw fields for inspection. Async page chooses found/unavailable/missing states without inventing content.

- [ ] Add failing tests for exact text preservation, no duplicated Arabic, missing optional benefits, attributed explanation, correct text direction, source notice/version, and script-like text rendered inert:

```tsx
const {container} = render(<IntlWrapper><HadithReader result={readerFixture} /></IntlWrapper>);
expect(container.querySelector('[data-hadith-arabic]')).toHaveAttribute('dir', 'rtl');
expect(container.querySelector('[data-hadith-arabic]')).toHaveAttribute('lang', 'ar');
expect(container.querySelector('script')).toBeNull();
expect(screen.getByText('v1.0.0')).toBeInTheDocument();
```

`readerFixture` is a full found ReaderResult built from synthetic documents/edition. Include one malicious-looking literal string in a separate fixture to test escaping; it must never execute.

- [ ] Render strings via React text nodes, not `dangerouslySetInnerHTML`. Use `white-space: pre-wrap`; style Arabic explicitly without assigning the entire page RTL in English/Turkish. Preserve Arabic source metadata from the paired workbook in accessible expandable sections.

```tsx
<section lang="ar" dir="rtl" data-hadith-arabic className="hadith-arabic">
  <p>{arabic.text}</p>
</section>
<details>
  <summary>{t('sourceDetails')}</summary>
  <pre className="whitespace-pre-wrap break-words">{edition.notice}</pre>
  <a href={sourceUrl} rel="noopener noreferrer">HadeethEnc.com</a>
</details>
```

- [ ] Add classes scoped to `.hadith-shell`/`.hadith-reader`. Use Noto Naskh/Amiri and the existing brand palette. Set 48rem max reading width, 1.75rem Arabic / 1.125rem translation, line heights 2 / 1.85, and bottom space exceeding the global nav plus safe area. Reader navigation remains in normal flow; no nested scrolling or required swipe gesture.
- [ ] Render `/hadith/sources` from all manifest editions, with full notices and separate publisher/fetch/taxonomy dates. Link corrections to the relevant source entry rather than claiming to forward them. Run reader tests to PASS, inspect both translated and Arabic-only rendering, commit as `feat(hadith): add source-attributed reader`.

### Task 6: Local bookmarks, resume, preferences and link sharing

**Files:** Create `lib/hadith/local-state.ts`, `hooks/use-hadith-state.ts`, the three client islands in the file map, `app/[locale]/hadith/saved/page.tsx`, `tests/unit/lib/hadith/local-state.test.ts`, `tests/unit/components/hadith/reader-controls.test.tsx`; modify reader/home routes to compose these islands.

**Interfaces:** `readReadingState(storage: Pick<Storage,'getItem'>): ReadingState`; `writeReadingState(storage: Pick<Storage,'setItem'>, state: ReadingState): boolean`; `useHadithState()` returns `{state,ready,persistent,save,toggleBookmark,clear}` where save accepts ReadingState, toggleBookmark accepts SavedEntry and clear takes no arguments. Storage key `qurancircle:hadith:v1`.

- [ ] Write failing tests: malformed JSON, wrong schema version, unavailable storage, save/remove idempotence, reload, cross-tab events, invalid external URLs not persisted, and language switching. Cap bookmarks at 100 and show a translated limit message rather than silently evicting entries. Mark lastOpened after hydration without implying completion.

```ts
expect(readReadingState({getItem: () => '{bad json'}).bookmarks).toEqual([]);
expect(writeReadingState({setItem: () => {throw new Error('quota');}}, stateFixture)).toBe(false);
```

Define `stateFixture` as the complete ReadingState with standard/both, empty bookmarks and null lastOpened. Run local-state/component tests to observe FAIL.

- [ ] Read localStorage only after mount, never during SSR. Validate stored IDs/locales/titles (max 4,000 chars for a saved label); store no URLs or hadith bodies. Derive links from validated IDs/locales using existing routing. Keep working memory when storage writes fail; don't overwrite existing state with defaults before hydration. Listen for the storage event for the one feature key; Clear deletes only that key.
- [ ] Compose a small client wrapper around server-rendered reader sections: size/view values become data attributes on the wrapper, while the server renders all content. The controls receive only the SavedEntry metadata, not the entire corpus/raw document. For Arabic locale, ignore persisted translation-only view and render Arabic. Use aria-pressed and status announcements.

```css
.hadith-reader[data-size="large"] { --hadith-scale: 1.15; }
.hadith-reader[data-size="larger"] { --hadith-scale: 1.3; }
.hadith-reader[data-view="arabic"] [data-hadith-translation] { display: none; }
.hadith-reader[data-view="translation"] [data-hadith-arabic] { display: none; }
```

- [ ] Share a canonical locale-specific URL with `navigator.share` when available, otherwise clipboard; distinguish AbortError from failure and offer a selectable URL if both fail. Do not copy excerpts. Saved links use cached titles and original saved locale; note device-only storage, provide removal/clear, and handle a removed upstream entry on reopening. Run tests to PASS, commit as `feat(hadith): add device-local reading controls`.

### Task 7: Discoverability, metadata and privacy

**Files:** Modify `components/header.tsx`, `mobile-navigation.tsx`, `app/[locale]/layout.tsx`, `app/globals.css`, `app/sitemap.ts`, `app/[locale]/privacy/page.tsx`, message catalogs and new route metadata; create `tests/unit/components/hadith/navigation.test.tsx`, `tests/unit/lib/hadith/metadata.test.ts`.

**Interfaces:** Both global navigation components accept optional `hadithEnabled: boolean = false`, supplied by the server layout. This prevents a client-visible env flag from becoming a second inconsistent gate. `buildHadithMetadata(locale,id,result): Metadata` in `lib/hadith/paths.ts` uses actual imported locale availability.

- [ ] Add failing tests for flag off (no links), flag on (desktop/mobile link), nested active state, locale-specific canonical links, no context queries in canonical/share URLs, and unavailable language variants excluded from hreflang.

```tsx
expect(screen.getByRole('link', {name: 'Hadith'})).toHaveAttribute('aria-current', 'page');
expect(metadata.alternates?.canonical).toBe('/tr/hadith/4560');
```

Mock pathname `/hadith/4560` for the navigation test and use a Turkish-found ReaderResult for metadata. Run the two test files and observe FAIL.

- [ ] Add the desktop Hadith entry and fifth mobile cell only when enabled. Use a data attribute for the five-column style; preserve four columns when disabled. Pass the flag from the existing server layout without changing its dynamic/CSP/auth setup.

```css
.mobile-bottom-nav-surface[data-hadith-enabled="true"] {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
```

- [ ] Add indexable overview/source pages to sitemap only when enabled. Do not enumerate thousands of details in v1; they remain reachable by links with valid canonical metadata. Saved pages, unavailable translations and topic query-page variants receive noindex,follow. Keep valid detail canonical independent of browsing context; only include hreflang for actual editions containing the ID.
- [ ] Add a privacy section describing device-local bookmarks/preferences and clearing them. Do not emit custom per-entry reading analytics; verify existing telemetry doesn't receive localStorage, saved titles or reading-state query parameters. Existing ordinary page analytics remain governed by the app's privacy policy. Run tests/catalog parity to PASS, commit as `feat(hadith): connect navigation and metadata`.

### Task 8: Refresh checks and release verification

**Files:** Create `scripts/hadith/check-versions.mjs`, `.github/workflows/hadith-source-check.yml`, `playwright.hadith.config.ts`, `tests/e2e/hadith-reader.spec.ts`, synthetic snapshot fixture files, `tests/unit/lib/hadith/source-check.test.ts`; update `docs/hadith-source-policy.md`, `package.json`, `vitest.config.ts` scoped coverage includes.

**Interfaces:** Checker takes `--manifest <file>`; compares official versioned redirect filenames to Edition.version; exits 0 unchanged, 2 changed, 1 network/format failure. It never writes corpus or calls deployment APIs. Export pure `compareVersions(manifestVersions, observedVersions)` returning changed locale keys for tests.

- [ ] Add failing checker tests and import them without running its CLI (guard direct invocation). Cases: unchanged, one locale changed, downgrade-like version difference, unknown redirect host, malformed version and network failure. A hash/fetch timestamp is never substituted for a version.

```ts
expect(compareVersions({en:'v1.25.0',tr:'v1.68.0',ar:'v1.7.0'},
  {en:'v1.25.0',tr:'v1.69.0',ar:'v1.7.0'})).toEqual(['tr']);
```

- [ ] Implement a bounded HEAD/redirect-based version check with the same host protections as the importer; fall back to GET headers then cancel the body if HEAD is unsupported. Add `hadith:check` npm script. The proposed daily workflow uses Node 24, contents:read, schedule/manual dispatch, skips when no approved manifest exists, and fails visibly on changed/unreadable sources. No automatic commits or publisher messages. Confirm maintainer notification ownership before enabling it in the default branch.
- [ ] Create synthetic EN/TR/AR snapshots for deterministic browser tests, clearly marked as test material and kept outside production data. Extend the existing safe Playwright config into `playwright.hadith.config.ts` with Chromium/WebKit, HADITH_READER_ENABLED=true, HADITH_DATA_DIR pointing to fixtures, and anonymous auth disabled. Never remove the shared safe-target guard. Test enabled and disabled builds separately.

```ts
test('reads a topic, preserves source notices and resumes locally', async ({page}) => {
  await page.goto('/hadith/topics/5');
  await page.getByRole('link', {name: 'Test entry'}).click();
  await expect(page.locator('[data-hadith-arabic]')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', {name: 'Save hadith', exact: true}).click();
  await page.reload();
  await expect(page.getByRole('button', {name: 'Remove saved hadith', exact: true})).toBeVisible();
  await page.getByText('Source details', {exact: true}).click();
  await expect(page.getByText('v1.0.0', {exact: true})).toBeVisible();
});
```

Also test TR/AR language switch on one ID, unavailable translation, unknown ID, page boundaries, tampered topic query, source-link origin, no XSS, storage failure, keyboard focus, 320/390px widths, desktop, 200% zoom and final controls unobscured by the bottom nav. Verify the source domain receives zero browser/runtime requests. Simulate network-disabled runtime with only fonts/framework needs allowed; no source lookup should occur.

- [ ] Execute the release checks with test-safe environment values:

```bash
npm run hadith:validate
npm run test:unit -- tests/unit/lib/hadith tests/unit/components/hadith tests/unit/i18n
npm run lint
npx tsc --noEmit
npm run build
npx playwright test --config playwright.hadith.config.ts
npm run test:unit
```

Inspect built output tracing for the real snapshots, not only dev-server fixtures, and run a production-server reader smoke test before release. Add `lib/hadith/{normalise,local-state,paths}.ts` to coverage with the existing thresholds preserved. Record unrelated baseline failures rather than changing other subsystems.

- [ ] Perform publisher-policy/edition-notice review, compare ten real entries per locale against their downloaded originals, verify all raw fields survive and review mismatch/deletion reports. Have competent human readers check representative Arabic/English/Turkish content display; automated structural checks do not establish religious accuracy. Source dates/counts in the spec are not future hard-coded assertions.
- [ ] Update runbook with the exact refresh/promote/redeploy process and correction-disable procedure. Keep flag off until review passes. Commit as `test(hadith): verify reader and source refresh checks`. Deployment and turning the flag on require the user's execution/release direction; do not deploy merely because tests pass.

## Self-review and approval points

- Coverage: lossless import/provenance (1–2), snapshot reads (3), browse/locales (4), reader/source context (5), personal controls (6), navigation/privacy/metadata (7), operations/verification (8).
- Contract names and state variants above are shared across tasks; no unsupported live API version claim is required.
- Confirm the recommended snapshot architecture, seven main topics (not nested subtopics), and fifth mobile navigation item before implementation.
- No app source, database, environment flag, scheduled workflow or deployed content was changed during planning.

Reference for route-specific data packaging: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
