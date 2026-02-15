# QuranCircle (Next.js)

A collaborative Quran reading platform for community-driven Khatm events. Create circles, assign Juz to participants, and track progress together.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database + Auth + Realtime**: Supabase
- **UI**: shadcn/ui + Tailwind CSS
- **Hosting**: Vercel

## Features

- **Public vs Link-Only Khatims**: Create link-only circles (share with friends) or public ones (discoverable on Browse)
- **No login to claim**: Participants claim Juz by name—no account required
- **Anti-abuse**: Device token limits (5 Juz per khatim per device), creator lock, per-juz unclaim
- **Real-time updates**: Supabase Realtime for live progress
- **Mobile-first**: Responsive design, PWA manifest, safe area insets

## Setup

1. Create a [Supabase project](https://supabase.com/dashboard)
2. Run the migrations in `supabase/migrations/` via the SQL Editor or Supabase CLI
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (`http://localhost:3001` for local)
4. In Supabase Dashboard > Authentication > URL Configuration:
   - Set `Site URL` to `http://localhost:3001` (local) or your production URL
   - Add redirect URLs:
     - `http://localhost:3001/auth/callback`
     - `https://your-app.vercel.app/auth/callback` (production)
5. In Google Cloud Console:
   - Configure OAuth consent screen (External/Internal based on your needs)
   - Create OAuth client credentials of type `Web application`
   - Add Authorized redirect URI:
     - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
     - (Optional local Supabase CLI) `http://127.0.0.1:54321/auth/v1/callback`
6. In Supabase Dashboard > Authentication > Providers > Google:
   - Enable Google provider
   - Paste your Google OAuth `Client ID` and `Client Secret`
7. `npm install && npm run dev`

## Migrations

Apply the SQL in `supabase/migrations/00001_initial_schema.sql` and `00002_rls_policies.sql` to your Supabase project.

## Deploy to Vercel

1. Push to GitHub and connect the repo to [Vercel](https://vercel.com)
2. Add environment variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://qurancircle.io` (or your production domain)
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

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
