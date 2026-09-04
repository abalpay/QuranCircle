# HadeethEnc reader design

Date: 2026-09-04. Status: topic browsing confirmed; user authorised a minimal isolated-worktree implementation and local preview. Deployment and merge remain unapproved.

## Product decision

Add a public Hadith section alongside QuranCircle's existing Khatm coordination experience. The first release browses HadeethEnc's seven main topics rather than claiming to contain complete Bukhari/Muslim collections or a verified Nawawi Forty sequence. Include an All available hadith view so exported entries missing current topic mappings remain discoverable. Nested subtopics and full-text search are subsequent work.

The user explicitly selected **Browse available topics** over a curated selection. The remaining decisions below are recommended defaults for approval with the plan.

## Verified source observations

Read-only checks on 2026-09-04 against the official API, Postman collection and downloads:

- API base: `https://hadeethenc.com/api/v1/`; sampled public GET requests succeeded without credentials.
- `languages` includes `ar`, `en`, `tr`.
- `categories/roots/?language=en` returns seven roots; `categories/list/?language=ar` returned 493 categories. IDs, counts and parent IDs are generally strings, with null root parents.
- `hadeeths/list/?language=en&category_id=1&page=1&per_page=100` returned 81 entries and pagination metadata. Category and language are required in the official documentation. Pagination metadata mixes strings and numbers.
- `hadeeths/one/?language={locale}&id=4560` returns text, attribution, grade, explanation, hints and translations. Arabic responses also contain references/word meanings. Current translated responses include additional Arabic fields absent from older documentation examples.
- `hadeeths/multiple/` and `hadeeths/search/` are documented. Search returns an array with `hadith_text_highlights`; do not render that HTML or assume a bounded/paginated response.
- Sampled API detail responses expose no publication version. An API fetch timestamp is not a publication version.
- Official downloads provide a versioned filename, an embedded publisher notice and a last-update value. These are identifiable published editions, not necessarily identical to the live API.

| Locale | Published download version observed | Non-empty records | Publisher last-update value |
| --- | --- | ---: | --- |
| English | v1.25.0 | 2,328 | 2026-05-10 17:43:35 |
| Turkish | v1.68.0 | 2,150 | 2026-09-03 13:02:43 |
| Arabic | v1.7.0 | 3,582 | 2025-11-12 00:00:55 |

These are point-in-time observations, not constants to enforce on future editions. Preserve the publisher's date text without inventing a timezone. All three inspected exports had unique IDs, non-empty hadith text and no detected HTML-like fields; this is structural checking, not a scholarly accuracy audit.

English/Turkish columns: `id`, `title_ar`, `title`, `hadith_text_ar`, `hadith_text`, `explanation_ar`, `explanation`, `benefits_ar`, `benefits`, `grade_ar`, `takhrij_ar`, `grade`, `takhrij`, `lang`, `link`.

Arabic columns: `id`, `title`, `hadith_text`, `explanation`, `word_meanings`, `benefits`, `grade`, `takhrij`, `link`.

Worksheet row 1 contains the notice; row 2 contains headers; data begins at row 3. Empty optional fields exist. Export text already includes narrator/introduction: do not prepend API intro fields.

## Content architecture

Use official versioned XLSX exports as the reader's text source. A development-time importer converts them losslessly to validated, server-only JSON. Capture root topic membership from the API during the same import; never replace exported text with API text. Serve all reading and browsing from the approved snapshot, without runtime HadeethEnc calls.

Keep a manifest with source URLs, version, original notice, publisher update value, download SHA-256, retrieval time and separate taxonomy retrieval time per locale. Keep original downloaded workbooks in an ignored import workspace. Commit generated JSON and the manifest after review so normal builds and tests require no HadeethEnc availability or Python.

For translated editions, display the Arabic paired in that same workbook. Do not silently substitute Arabic from another edition. Arabic-only pages use the Arabic workbook. Language availability is computed from actual imported documents, not the live API's translation list.

Map root topic lists to exported IDs, discard API-only IDs from published topic pages, report all mismatches, and recompute counts from the retained unique IDs. Preserve root order and API list order; the ordering is browsing order, not an authoritative hadith sequence. Never sum topic counts as a unique corpus total. All available hadith uses unique exported IDs in workbook order.

## Global constraints

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

## Routes and reading experience

| Route before locale prefix | Purpose |
| --- | --- |
| `/hadith` | Compact introduction, seven main topics, All available hadith, resume and saved links |
| `/hadith/topics/[topicId]?page=1` | Topic title, snapshot-specific count and 20 entries per page; `all` is the aggregate view |
| `/hadith/[id]?topic=5&page=2` | Stable source entry ID; query parameters only preserve browsing context |
| `/hadith/saved` | Device-local saved titles and links; noindex |
| `/hadith/sources` | Publisher attribution, versions, notices, update policy and correction links |

The reader contains Arabic, the selected translation when available, the source's grade and attribution, explanation, benefits and available word meanings. Use explicit section labels; source commentary is attributed to HadeethEnc, not presented as QuranCircle's own religious interpretation. Optional empty sections are omitted, not filled from another language without a label. Preserve embedded Arabic explanation/benefits in expandable Arabic-source sections.

English/Turkish pages default to both Arabic and translation. Arabic pages display one Arabic rendition, never duplicated. Text-size controls offer standard/large/larger without imposing a maximum browser zoom. Previous/next uses the selected snapshot topic sequence; direct links use the All available sequence. Back links preserve topic/page where valid. Sharing sends a canonical link, without personal state or copied excerpts.

If an ID exists only in another locale, show a translated availability notice and explicit links to supported editions; no silent English fallback and no misleading hreflang. If the ID exists in no snapshot, return 404. Missing/corrupt snapshot files are operational errors, not empty topics or content 404s.

Bookmarks store ID, saved display title, locale and edition version, plus saved time; no hadith body. Titles in Saved are locally retained labels and refresh when the entry is reopened. Store a single last-opened entry as resume state; do not imply reading completion. Storage failures leave reading functional and announce that settings cannot be saved. Offer Clear saved reading data.

## Visual direction

Quiet editorial reading surface using the existing parchment, deep-green and gold tokens. Keep Manrope/Cormorant headings and the existing Noto Naskh Arabic/Amiri families. Use a single reading column capped at 48rem, Arabic at 1.75rem/2 line-height and translated text at 1.125rem/1.85 initially. Normal page scrolling, no nested reader scroll container, carousels or entrance animation on scripture.

Add Hadith to desktop primary navigation and as a fifth mobile item, preserving Home, My Circles, Browse and Account/Sign in. Test 320px and 390px widths in all locales; shorten only UI labels when necessary, never source text. Reader controls stay in document flow, with sufficient bottom padding for the floating global navigation. Scope reader styles to its subtree.

## Deliberately excluded

Full classical collections, nested subtopic navigation, full-text/fuzzy/semantic search, AI explanations, audio, study circles, streaks, synced bookmarks, offline downloads, a new dark theme and automatic content publication. The existing installable shell does not imply offline hadith availability.

## Refresh and publication policy

Provide a read-only version checker and an explicit snapshot-refresh command. Before launch, confirm the exports remain the publisher's intended republication source and accept their published conditions. The conditions permit republication but prohibit changing content; this is not an MIT/CC0 dataset.

Propose a daily CI version check plus manual dispatch, with read-only repository permissions. A changed version produces a failing/actionable check, not an automatic content commit or deployment. The maintainer reviews refreshed exports, count/text diffs and source notices, then redeploys. Configure a named maintainer and CI notifications before launch; a scheduled job without someone responding is insufficient. Respond to detected updates within one working day as an operational target, not a publisher-granted grace period.

Retain the latest known-good snapshot through transient upstream failure. If the publisher reports a serious correction and the new edition cannot be imported promptly, hide the affected entry or disable the reader until repaired. Add a server-side reader feature flag defaulting off until publication review; do not create scheduled jobs or deploy during the planning turn.

## Acceptance

Readers can enter Hadith without signing in, select a main topic, paginate, read Arabic with English/Turkish, inspect source explanations and edition notices, share the canonical link, save an entry and resume after reload. All controls work with keyboard and at 200% zoom. Arabic/Turkish switching remains on the same entry where available, with clear handling otherwise. No live source outage affects the deployed snapshot. Circle regression tests continue to pass.

## Sources

- Publisher downloads and republication conditions: https://hadeethenc.com/en/home
- Official API documentation: https://documenter.getpostman.com/view/5211979/TVev3j7q
- Official download discovery: https://hadeethenc.com/en/browse/download/en and equivalent `/tr`, `/ar` suffixes
- Example reader source: https://hadeethenc.com/en/browse/hadith/4560
- API calls and workbook structural checks described above were made directly during planning; full source content was not committed.
