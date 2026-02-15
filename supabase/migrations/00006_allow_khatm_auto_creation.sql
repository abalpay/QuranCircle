-- Allow anyone to insert khatms when the event is not locked.
-- The existing "Event creator can manage khatms" (FOR ALL) policy
-- requires auth or creator_token ownership, blocking auto-creation
-- from anonymous server actions. This permissive INSERT policy
-- mirrors the juz insert pattern.
CREATE POLICY "Anyone can insert khatm when event not locked"
  ON public.khatms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = khatms.event_id
      AND e.is_locked = false
    )
  );

-- Prevent duplicate khatm_number per event from concurrent last-juz claims.
CREATE UNIQUE INDEX IF NOT EXISTS uq_khatms_event_number_active
  ON public.khatms (event_id, khatm_number)
  WHERE is_deleted = false;

-- Enable realtime for khatms so other clients detect new khatms without polling.
ALTER PUBLICATION supabase_realtime ADD TABLE khatms;
