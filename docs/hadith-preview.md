# Local Hadith reader preview

This branch is an isolated, unmerged preview of a HadeethEnc reader. Its base includes the Next.js 16.3.4/security maintenance changes on `main` at `a613976`. No changes have been deployed.

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
npx next dev --webpack --hostname localhost -p 3002
```

Open `http://localhost:3002/hadith`. Turkish is `/tr/hadith`; Arabic is `/ar/hadith`.

Webpack is used for this local preview: the updated app showed a default-locale redirect loop under Turbopack before Hadith routes were added, while Webpack served the same app correctly. This command does not alter the shared dev script, authentication or CSP.

## Review scope

- Browse the seven source topics and all exported entries, including pagination.
- Read Arabic with English or Turkish, plus source explanations and references.
- Inspect publisher versions and original notices.
- Adjust text size and save entries on this device.
- Check desktop and mobile layouts, including Arabic RTL.

The feature is disabled unless the server flag is explicitly enabled. New routes are noindex during this preview. Source material remains subject to HadeethEnc's conditions and requires publication/content review; automated validation is not a scholarly accuracy audit.

## Deferred until after preview feedback

Publication, merge, scheduled update checks/ownership, sitemap and privacy-policy integration, resume reading, sharing and display-mode controls. Search, audio, nested topics and synced bookmarks are outside the initial reader scope.

See `hadith-source-policy.md` for source/import obligations and the full design/implementation plans in `superpowers/` for the longer-term release checklist.
