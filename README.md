# QuranCircle

A collaborative Quran reading platform for community-driven Khatm events. Create circles, assign Juz to participants, and track progress together in real time.

**Live at [qurancircle.io](https://qurancircle.io)**

## Features

- **Create & share circles** — Public circles for anyone to discover, or private link-only circles for family and friends
- **Frictionless participation** — Claim a Juz instantly with silent anonymous auth, no signup required
- **Real-time progress** — See claims and completions update live across all participants
- **Mobile-first PWA** — Installable on any device with responsive design and safe area support
- **Multi-language** — Full English and Turkish localisation via next-intl
- **Secure by design** — Row Level Security on every table, HMAC-signed merge cookies, rate limiting

## Tech Stack

- **Framework** — Next.js 16, React 19, TypeScript
- **UI** — Tailwind CSS v4, shadcn/ui
- **Database & Auth** — Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Email** — Resend (via Supabase Auth Hook)
- **Hosting** — Vercel
- **Testing** — Vitest (unit), Playwright (E2E across Chromium + WebKit)

## Getting Started

1. Create a [Supabase project](https://supabase.com/dashboard)
2. Run the migrations in `supabase/migrations/` via the SQL Editor or Supabase CLI
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
4. Enable **Anonymous Sign-Ins** in Supabase Dashboard > Authentication > Providers
5. `npm install && npm run dev`

```bash
npm run dev          # Dev server (port 3001)
npm run build        # Production build
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

## Architecture

```
app/                    # Routes and layouts (App Router)
components/             # React components + shadcn/ui primitives
lib/actions/            # Server actions (events, juz)
lib/supabase/           # Supabase clients (client, server, admin)
messages/               # i18n translation files (en, tr)
supabase/migrations/    # SQL migrations
supabase/functions/     # Edge Functions (email hook)
tests/                  # Unit + E2E tests
```

## License

[MIT](LICENSE)
