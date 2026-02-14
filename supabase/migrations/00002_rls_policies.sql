-- Row Level Security policies for QuranCircle

-- Events: anyone can read (public and link-only both accessible via short_code)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    (auth.uid() = created_by)
    OR (created_by IS NULL AND creator_token IS NOT NULL)
  );

CREATE POLICY "Creator can update own event"
  ON public.events FOR UPDATE
  USING (
    auth.uid() = created_by
    OR (created_by IS NULL AND creator_token IS NOT NULL)
  );

CREATE POLICY "Creator can delete own event"
  ON public.events FOR DELETE
  USING (
    auth.uid() = created_by
    OR (created_by IS NULL AND creator_token IS NOT NULL)
  );

-- Khatms: anyone can read
ALTER TABLE public.khatms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view khatms"
  ON public.khatms FOR SELECT
  USING (true);

CREATE POLICY "Event creator can manage khatms"
  ON public.khatms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = khatms.event_id
      AND (e.created_by = auth.uid() OR (e.created_by IS NULL AND e.creator_token IS NOT NULL))
    )
  );

-- Juzs: anyone can read; claim/unclaim with restrictions
ALTER TABLE public.juzs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view juzs"
  ON public.juzs FOR SELECT
  USING (true);

-- Allow insert (claim) when event is not locked - handled in app logic for device_token limits
CREATE POLICY "Anyone can claim juz when event not locked"
  ON public.juzs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.khatms k
      JOIN public.events e ON e.id = k.event_id
      WHERE k.id = juzs.khatm_id AND e.is_locked = false
    )
  );

CREATE POLICY "Anyone can update juz (claim, mark read)"
  ON public.juzs FOR UPDATE
  USING (true);

CREATE POLICY "Claimer or event creator can unclaim"
  ON public.juzs FOR DELETE
  USING (
    claimed_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.khatms k
      JOIN public.events e ON e.id = k.event_id
      WHERE k.id = juzs.khatm_id
      AND (e.created_by = auth.uid() OR (e.created_by IS NULL AND e.creator_token IS NOT NULL))
    )
  );

-- Bookmarks: users manage their own
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);
