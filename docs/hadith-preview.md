# Local Hadith reader preview

This branch is an isolated, unmerged preview of a HadeethEnc reader. Its base includes the Next.js 16.3.4/security maintenance merge on `main` at `5b951d9` (the same source tree as the tested maintenance commit `a613976`). No changes have been deployed.

## Run locally

Use Node 24 and an isolated dependency install (`npm ci`). Create an ignored `.env.local` with preview settings:

```dotenv
HADITH_READER_ENABLED=true
NEXT_PUBLIC_SITE_URL=http://localhost:3002
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-preview-placeholder-key-not-a-real-credential
NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH=false
NEXT_PUBLIC_ENABLE_INSTALL_PROMPT=false
```

These placeholder settings support the signed-out Hadith preview; authentication and circle/database features require a separately configured local backend. Do not copy production service-role credentials for this preview.

```sh
npx next dev --hostname localhost -p 3002
```

Open `http://localhost:3002/hadith`. Turkish is `/tr/hadith`; Arabic is `/ar/hadith`.

Keep the explicit `localhost` hostname aligned with the preview URL. Binding the server to `127.0.0.1` caused a default-locale redirect loop in this setup; both Turbopack and Webpack worked when bound to `localhost`. The preview uses the default Turbopack mode. This command does not alter the shared dev script, authentication or CSP.

## Review scope

- Browse the seven source topics and all exported entries, including pagination.
- Read Arabic with English or Turkish, plus source explanations and references.
- Inspect publisher versions and original notices.
- Adjust text size and save entries on this device.
- Check desktop and mobile layouts, including Arabic RTL.

The feature is disabled unless the server flag is explicitly enabled. New routes are noindex during this preview. Source material remains subject to HadeethEnc's conditions and requires publication/content review; automated validation is not a scholarly accuracy audit.

Invalid reader/topic links show the localized not-found page. The app's existing locale-level loading boundary can stream HTTP 200 before the route discovers that it is missing; Next then emits the not-found view and noindex. Literal HTTP 404 handling is a release follow-up, not a claim of this preview. Existing homepage/loading routes have not been rearranged.

## Deferred until after preview feedback

Publication, merge, scheduled update checks/ownership, sitemap and privacy-policy integration, resume reading, sharing and display-mode controls. Search, audio, nested topics and synced bookmarks are outside the initial reader scope.

See `hadith-source-policy.md` for source/import obligations and the full design/implementation plans in `superpowers/` for the longer-term release checklist.

## Verification

The final implementation passed 302 unit tests, a production build, source-data validation and production feature-flag checks for both HTML and React server responses. Chromium checks cover multilingual browsing, reading, local saves, pagination, unavailable editions and responsive layouts. WebKit checks cover English, Turkish and Arabic readers at phone and landscape sizes, plus all publisher notices. Keyboard save and size controls were verified in Chromium. These are desktop browser-engine tests, not physical-device testing or publication approval.

See [the verification record](hadith-preview-verification.md) for build, trace and transport details. The development server is for local review only; nothing has been pushed, deployed or merged into main.
