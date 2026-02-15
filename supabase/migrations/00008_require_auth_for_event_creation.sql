-- Require authenticated users for new event creation.
-- This closes the anonymous creator_token path for inserts.
DROP POLICY IF EXISTS "Users can create events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND created_by IS NOT NULL
    AND creator_token IS NULL
  );
