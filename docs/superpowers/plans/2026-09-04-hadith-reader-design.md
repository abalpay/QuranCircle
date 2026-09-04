# Hadith Reader Design Implementation Plan

> **For agentic workers:** Use inline execution for this tightly coupled presentation pass. The executing-plans skill is not installed; follow the explicit steps here in this session. Preserve the existing isolated worktree.

**Goal:** Replace the minimal source-dump presentation with an intentional library and first-class multilingual reader.

**Architecture:** Keep guarded server pages and the local repository unchanged. Server components own source rendering and formatting. Small client controls own active section navigation, reading mode, size, and device saves. All styling is scoped to the Hadith surface.

**Tech Stack:** Existing Next16, React, next-intl, CSS, Vitest and Playwright. No dependencies or font downloads.

**Spec:** The user's request to rethink all created pages and the reader at `/hadith/66536?topic=4&page=1`; source invariants remain those of `docs/hadith-source-policy.md`.

## Review findings / design specification

- `app/[locale]/hadith/layout.tsx:15`: undifferentiated link row, no current-section indication. Replace with library masthead and active section navigation.
- `app/[locale]/hadith/[id]/page.tsx:29`: controls and body lack hierarchy; long pages lack in-page orientation. Add bounded article header, visible provenance/entry ID, language control, reading toolbar and section anchor rail.
- `components/hadith/source-text.tsx:6`: every field is a single paragraph and metadata competes with narration. Format source newline boundaries without trimming or rewriting; benefits become semantic unnumbered lists; grade/reference become compact definition metadata.
- `components/hadith/reader-controls.tsx:58`: empty saves lack next action; destructive clear has no confirmation. Add a deliberate empty state and inline confirm/cancel clear.
- `app/globals.css:6`: one width/type scale serves library and reading. Use wide library with numbered topic grid; reader has 42rem body plus secondary rail; narration serif, commentary restrained sans-serif, Arabic existing Arabic font with generous line height. No content animation.

## Global Constraints

- Work only in `/Users/ahmet/Documents/Alpaylabs/QuranCircle-worktrees/hadith-reader-preview`; do not edit main, push, merge or deploy.
- Preserve all source text, punctuation, brackets, diacritics, notices and supplied metadata; no AI translation, rewriting, grading or inferred reference numbers.
- Keep each translated edition paired with the Arabic supplied in its own workbook.
- Support en/tr/ar and RTL. New translated copy is interface copy only.
- Keep default-off guards, noindex, server-only source reads, corpus, auth, CSP and repository unchanged.
- Keep original notice, edition and attribution accessible. No runtime source fetches.
- All controls >=44px, visible keyboard focus, responsive320px and200% zoom; no motion required.

## Task 1: Source-preserving text hierarchy

**Files:** `components/hadith/source-text.tsx`, `components/hadith/source-passage.tsx`, `tests/unit/components/hadith-reader.test.tsx`.

- [x] Add a regression: `expect(container.querySelector('[data-source-passage]')?.textContent).toBe(source)` for multiline, blank-line, Arabic and hostile markup input. Assert benefits use `ul/li` and no script is rendered.
- [x] Run `npm run test:unit -- tests/unit/components/hadith-reader.test.tsx` (RED).
- [x] Implement pure `SourcePassage({text,locale,kind})`; split with captured `/(\r\n|\n|\r)/`, retain each delimiter inside its preceding block and never trim. Use block spans inside a text container, semantic list items for benefit lines, no sentence guessing. No HTML injection.
- [x] Rebuild SourceText into labelled narration, compact grade/reference, and discrete explanation/benefits/word-meaning sections. Optional stable anchors only on the main edition, not paired details. Original textual payload must remain exact.
- [x] Re-run source tests (GREEN).

## Task 2: Library and reader UI

**Files:** `app/[locale]/hadith/**`, `components/hadith/{reader-controls,section-nav}.tsx`, `app/hadith.css`, `app/globals.css`, `messages/{en,tr,ar}.json`, existing controls tests.

- [x] Create active nav using existing `usePathname`, matching Topics for `/hadith` or topic except all, All for `/hadith/topics/all`, Saved/Sources exactly. Render `aria-current="page"` on active anchor.
- [x] Replace old Hadith CSS block with scoped import; retain fifth mobile-nav rule. Build wider library, two-column numbered topics and full-title numbered entry rows. No title truncation.
- [x] Reader uses a restrained title, source ID (explicitly HadeethEnc, not a book number), persistent compact reading toolbar, and a desktop section rail that becomes a wrapped jump list on mobile. Language switches preserve topic/page context where valid.
- [x] Add a local reading-mode toggle between Arabic+translation and current-language-only for translated editions; preserve both source nodes server-rendered, change only visibility. AR-only pages have no duplicate/toggle. Size and bookmark storage schema remain unchanged.
- [x] Add meaningful Saved empty state and clear confirmation; update tests to confirm cancel preserves data and confirm only removes feature data.
- [x] Add localized interface labels in all three catalogues. Sources becomes three edition panels with exact notices; loading/error/not-found share new spacing.

## Task 3: Verify and hand off

- [x] Run full `npm test`, `npm run lint`, `npx tsc --noEmit` and source validator. Fix regressions within presentation scope.
- [x] Inspect screenshots of home, topic4, sources, saved, reader66536 and long-title4560 at1440/390/320; include AR/TR and WebKit.
- [x] Browser verify source textContent equality, semantic lists, modes, keyboard, current nav, save/clear confirmation, source notices, pagination, no horizontal overflow and no page errors. Use native Python Playwright scripts.
- [x] Leave port3002 running and open redesigned reader. Record findings/results here. No production claim, merge or deployment.

## Results

313 unit tests pass, lint/typecheck/build pass, all8,060 source documents validate unchanged. Chromium/WebKit multilingual responsive and source-fidelity checks pass; production HTML/RSC flag-on/off and all5 corpus trace checks pass. See `docs/hadith-preview-verification.md` for scope and limitations. Inline implementation completed; no subagents, merge, push or deployment. The existing preview remains on localhost3002.
