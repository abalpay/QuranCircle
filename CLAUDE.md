# CLAUDE.md — QuranCircle

## Project Overview

QuranCircle is a collaborative Quran reading platform where users create events, organize khatms (complete Quran readings), and claim juz sections. Built with Next.js 16 (App Router) and Supabase.

## Quick Reference

```bash
npm run dev          # Dev server on port 3001
npm run build        # Production build
npm run lint         # ESLint
npm run test:unit    # Vitest unit tests (71 tests, ~10s)
npm run test:e2e     # Playwright E2E tests (requires Supabase running)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui (new-york style)
- **Backend:** Supabase (Postgres DB + Auth + Realtime)
- **Forms:** React Hook Form + Zod validation
- **i18n:** next-intl (cookie-based locale, default: en, supported: en, tr)
- **Icons:** lucide-react
- **Toasts:** sonner
- **Testing:** Vitest + jsdom (unit), Playwright + Chromium + WebKit (E2E)

## Project Structure

```
app/                    # Routes and layouts (App Router)
components/             # React components
components/ui/          # shadcn/ui primitives
lib/actions/            # Server actions (events.ts, juz.ts)
lib/supabase/           # Supabase clients (client.ts, server.ts, middleware.ts)
lib/database.types.ts   # Generated Supabase types (do not edit manually)
lib/utils.ts            # cn(), generateShortCode()
hooks/                  # Custom hooks (use-auth.tsx, use-auth-modal.tsx)
i18n/                   # Internationalization config (request.ts)
messages/               # Translation files (en.json, tr.json)
supabase/migrations/    # SQL migrations
tests/unit/             # Vitest unit tests
tests/e2e/              # Playwright E2E tests
tests/helpers/          # Test utilities (intl-wrapper.tsx)
public/                 # Static assets + PWA manifest
middleware.ts           # Supabase auth session refresh
```

> **Note:** `next-app/` is a legacy duplicate — the active code lives at the project root.

## Key Conventions

- Use `"use client"` / `"use server"` directives explicitly
- File naming: kebab-case. Component naming: PascalCase
- Imports use `@/*` path alias (maps to project root)
- Server actions return `{ error?: string, data?: any }`
- Auth is optional — anonymous users are tracked via `device_token` cookies
- Supabase client: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server)
- UI components from shadcn/ui via `@/components/ui/*`
- Class merging with `cn()` from `@/lib/utils`

## i18n (Internationalization)

- **Library:** next-intl with cookie-based locale detection (no URL prefixes)
- **Default locale:** English (`en`)
- **Supported locales:** English (`en`), Turkish (`tr`)
- **Translation files:** `messages/en.json`, `messages/tr.json` — grouped by component
- **Client components:** Use `useTranslations("SectionName")` hook
- **Server components:** Use `getTranslations("SectionName")` from `next-intl/server`
- **Locale switching:** Cookie `NEXT_LOCALE`, persisted for 1 year
- **Provider:** `NextIntlClientProvider` wraps the app in `app/layout.tsx`

### i18n Rules (IMPORTANT)

1. **When adding `useTranslations()` to a component, update its unit tests.** Tests must wrap the component with `IntlWrapper` from `tests/helpers/intl-wrapper.tsx`:
   ```tsx
   import { IntlWrapper } from "../../helpers/intl-wrapper";
   render(<Component />, { wrapper: IntlWrapper });
   ```
2. **Add translation keys to BOTH `en.json` AND `tr.json`** — they must stay in sync.
3. **Server components use `getTranslations`**, not `useTranslations`. Don't add `"use client"` just for translations.
4. **Translate strings, don't delete code.** Zod schemas, conditional logic, helper text — keep the code, just replace the string literals with `t("key")` calls.
5. **Turkish terms:** Khatm=Hatim, Juz=Cüz, Circle=Halka, Quran=Kur'an, Claim=Sahiplen

## Testing

### Unit Tests (Vitest)
- **Config:** `vitest.config.ts`
- **Location:** `tests/unit/` (`.test.ts` and `.test.tsx`)
- **Environment:** jsdom
- **Run:** `npm run test:unit`
- **Pattern:** Components using hooks (useTranslations, useAuth, etc.) need appropriate wrappers/mocks in tests.

### E2E Tests (Playwright)
- **Config:** `playwright.config.ts`
- **Location:** `tests/e2e/`
- **Browsers:** Chromium (default) + WebKit (for iOS mobile tests)
- **Run:** `npm run test:e2e` (requires local Supabase)
- **CI installs:** Both chromium AND webkit (`npx playwright install --with-deps chromium webkit`)
- **Browse page size:** `BROWSE_PAGE_SIZE = 12` in `browse-events.tsx`

### Testing Rules (IMPORTANT)

1. **Always run `npm run test:unit` before committing.** Fix any failures.
2. **If you add hooks to a component, check if tests exist for it** (`grep -r "ComponentName" tests/`). If they do, update them.
3. **E2E tests use English text selectors.** Since default locale is English, this works. Don't change E2E selectors to translation keys.
4. **Mobile E2E tests use `devices["iPhone 13"]`** which runs on WebKit, not Chromium.
5. **Don't modify E2E test files** unless you understand the full test setup (Supabase seed data, etc.).

## Database

4 main tables with Row Level Security (RLS) policies:

- **events** — reading events with short codes for sharing
- **khatms** — complete Quran reading cycles within an event
- **juzs** — individual juz sections (1-30) claimed by users
- **bookmarks** — saved events per user/device

Types are generated in `lib/database.types.ts`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous key
```

## Git

- **Don't commit** `.clawdbot/`, agent infrastructure, or temp files
- **Commit messages:** Use conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
