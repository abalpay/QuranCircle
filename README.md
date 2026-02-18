# QuranCircle (Next.js)

A collaborative Quran reading platform for community-driven Khatm events. Create circles, assign Juz to participants, and track progress together.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database + Auth + Realtime**: Supabase
- **UI**: shadcn/ui + Tailwind CSS
- **Hosting**: Vercel

## Features

- **Public vs Link-Only Khatims**: Create link-only circles (share with friends) or public ones (discoverable on Browse)
- **No account friction to claim**: Participants can claim immediately via silent anonymous auth sessions
- **Circle-page eager auth**: Anonymous sessions are created on circle pages (`/s/...`) to keep private realtime ready without globally forcing sessions
- **UID-based ownership + anti-abuse**: Claim ownership is tied to `auth.uid()` with DB-enforced mutation guards and creator controls
- **8-character secure short links**: Shareable codes are generated with cryptographically secure randomness
- **Short-code contract**: DB-enforced alphanumeric short codes (`1-24` chars), app-generated as 8 chars
- **Realtime invalidation**: Private event-scoped broadcasts trigger secure snapshot refreshes
- **Mobile-first**: Responsive design, PWA manifest, safe area insets

## Setup

1. Create a [Supabase project](https://supabase.com/dashboard)
2. Run the migrations in `supabase/migrations/` via the SQL Editor or Supabase CLI
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (`http://localhost:3001` for local)
   - `NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH=true`
   - `AUTH_MERGE_COOKIE_SECRET` (server-only secret for signed merge cookies)
4. In Supabase Dashboard > Authentication > URL Configuration:
   - Set `Site URL` to `http://localhost:3001` (local) or your production URL
   - Add redirect URLs:
     - `http://localhost:3001/auth/callback`
     - `https://your-app.vercel.app/auth/callback` (production)
5. In Supabase Dashboard > Authentication > Providers:
   - Enable **Anonymous Sign-Ins**
   - Keep CAPTCHA disabled for this rollout
6. In Google Cloud Console:
   - Configure OAuth consent screen (External/Internal based on your needs)
   - Create OAuth client credentials of type `Web application`
   - Add Authorized redirect URI:
     - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
     - (Optional local Supabase CLI) `http://127.0.0.1:54321/auth/v1/callback`
7. In Supabase Dashboard > Authentication > Providers > Google:
   - Enable Google provider
   - Paste your Google OAuth `Client ID` and `Client Secret`
8. `npm install && npm run dev`

## Migrations

Apply all SQL files in `supabase/migrations/` in order (`00001` → latest).

## Deploy to Vercel

1. Push to GitHub and connect the repo to [Vercel](https://vercel.com)
2. Add environment variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://qurancircle.io` (or your production domain)
   - `NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH=true`
   - `AUTH_MERGE_COOKIE_SECRET` (long random server-only secret)
3. In Supabase Dashboard > Authentication > URL Configuration:
   - Set **Site URL** to `https://qurancircle.io` (or your production domain)
   - Add **Redirect URLs**:
     - `https://qurancircle.io/auth/callback`
     - `http://localhost:3001/auth/callback` (keep for local dev)
4. In Google Cloud Console (OAuth 2.0 Client):
   - **Authorized redirect URIs**: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback` (Google redirects to Supabase, not directly to your app)
   - **Authorized JavaScript origins**: `https://qurancircle.io`
5. Redeploy on Vercel after env changes.

**Google OAuth flow**: User → your app → Supabase → Google consent → Supabase callback → your app `/auth/callback` → original page.

## Operations Baseline

- Keep Supabase Auth rate limits enabled (especially `anonymous_users` and `sign_in_sign_ups`).
- Keep DB/RLS/RPC mutation guards as the main anti-abuse controls.
- Configure anonymous-user cleanup in Supabase for users inactive for 30 days.
- Keep local secrets in `.env.*.local` files (gitignored). Only commit `.env.example`.
- Suggested alerts:
  - anonymous sign-ins > 30/hour/IP (rate-limit ceiling)
  - claim RPC failures > 5% over 5 minutes
  - merge finalize failures > 2% over 15 minutes

## Testing

See [docs/TESTING.md](docs/TESTING.md) for testing the Resend email flow (signup, password reset). Includes options for full reset, test email accounts (Gmail+), and local Supabase.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
