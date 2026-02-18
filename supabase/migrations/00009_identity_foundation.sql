-- Identity foundation: ownership moves to auth.uid() and explicit memberships.

-- Event membership table for creator/participant authorization checks.
CREATE TABLE IF NOT EXISTS public.event_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('creator', 'participant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_members_event_id_idx
  ON public.event_members (event_id);

CREATE INDEX IF NOT EXISTS event_members_user_id_idx
  ON public.event_members (user_id);

-- Legacy device-token ownership is no longer used.
UPDATE public.juzs
SET device_token = NULL
WHERE device_token IS NOT NULL;

-- Ensure historical rows are compatible before stricter ownership constraints.
UPDATE public.juzs
SET
  claimed_by_name = NULL,
  claimed_by_user_id = NULL,
  status = 'unclaimed',
  claimed_at = NULL,
  read_at = NULL
WHERE status <> 'unclaimed'
  AND claimed_by_user_id IS NULL;

-- Enforce valid state transitions and ownership consistency.
ALTER TABLE public.juzs
  DROP CONSTRAINT IF EXISTS juzs_state_consistency_check;

ALTER TABLE public.juzs
  ADD CONSTRAINT juzs_state_consistency_check
  CHECK (
    (
      status = 'unclaimed'
      AND claimed_by_name IS NULL
      AND claimed_by_user_id IS NULL
      AND claimed_at IS NULL
      AND read_at IS NULL
    )
    OR (
      status = 'claimed'
      AND claimed_by_name IS NOT NULL
      AND claimed_by_user_id IS NOT NULL
      AND claimed_at IS NOT NULL
      AND read_at IS NULL
    )
    OR (
      status = 'read'
      AND claimed_by_name IS NOT NULL
      AND claimed_by_user_id IS NOT NULL
      AND claimed_at IS NOT NULL
      AND read_at IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS juzs_claimed_by_user_id_idx
  ON public.juzs (claimed_by_user_id)
  WHERE claimed_by_user_id IS NOT NULL;
