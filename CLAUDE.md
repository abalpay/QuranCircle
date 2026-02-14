# CLAUDE.md — QuranCircle

## Project Overview

QuranCircle is a collaborative Quran reading platform where users create events, organize khatms (complete Quran readings), and claim juz sections. Built with Next.js 16 (App Router) and Supabase.

## Quick Reference

```bash
npm run dev       # Dev server on port 3001
npm run build     # Production build
npm run lint      # ESLint
```

No tests configured yet.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui (new-york style)
- **Backend:** Supabase (Postgres DB + Auth + Realtime)
- **Forms:** React Hook Form + Zod validation
- **Icons:** lucide-react
- **Toasts:** sonner

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
supabase/migrations/    # SQL migrations
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
