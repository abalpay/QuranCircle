-- QuranCircle initial schema for Supabase
-- Uses UUID for events to prevent ID enumeration (link-only privacy)
-- short_code is the only public-facing identifier

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events (Khatim circles)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_token TEXT,
  short_code TEXT NOT NULL UNIQUE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_short_code_idx ON public.events(short_code);
CREATE INDEX events_is_public_archived_idx ON public.events(is_public, is_archived) WHERE is_archived = false;
CREATE INDEX events_created_by_idx ON public.events(created_by);

-- Khatms
CREATE TABLE public.khatms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  khatm_number INTEGER NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX khatms_event_id_idx ON public.khatms(event_id);
CREATE INDEX khatms_event_khatm_number_idx ON public.khatms(event_id, khatm_number);

-- Juzs
CREATE TABLE public.juzs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  khatm_id UUID NOT NULL REFERENCES public.khatms(id) ON DELETE CASCADE,
  juz_number INTEGER NOT NULL,
  claimed_by_name TEXT,
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_token TEXT,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed', 'read')),
  claimed_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE INDEX juzs_khatm_id_idx ON public.juzs(khatm_id);
CREATE INDEX juzs_khatm_juz_number_idx ON public.juzs(khatm_id, juz_number);
CREATE INDEX juzs_device_token_khatm_idx ON public.juzs(device_token, khatm_id) WHERE device_token IS NOT NULL;

-- Bookmarks (for logged-in users)
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX bookmarks_user_id_idx ON public.bookmarks(user_id);
CREATE INDEX bookmarks_event_id_idx ON public.bookmarks(event_id);
