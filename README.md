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
3. Enable Auth providers (Email/Password, Google) in Supabase Dashboard > Authentication
4. Copy `.env.example` to `.env.local` and add your Supabase URL and anon key
5. `npm install && npm run dev`

## Migrations

Apply the SQL in `supabase/migrations/00001_initial_schema.sql` and `00002_rls_policies.sql` to your Supabase project.

## Deploy to Vercel

1. Push to GitHub and connect the repo to [Vercel](https://vercel.com)
2. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In Supabase Dashboard > Authentication > URL Configuration, add your Vercel URL to Redirect URLs (e.g. `https://your-app.vercel.app/auth/callback`)
4. For Google OAuth, add the callback URL to your Google Cloud Console credentials

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
