-- Break RLS recursion between events <-> event_members for direct table reads.
-- Keep read semantics the same while routing cross-table checks through
-- SECURITY DEFINER helpers that can evaluate ownership/membership safely.

CREATE OR REPLACE FUNCTION public.current_user_is_event_creator(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = p_event_id
        AND e.created_by = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_event_member(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.event_members m
      WHERE m.event_id = p_event_id
        AND m.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_event_creator(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_event_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_event_creator(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_event_member(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS events_select_public_or_member ON public.events;
DROP POLICY IF EXISTS khatms_select_visible_event ON public.khatms;
DROP POLICY IF EXISTS juzs_select_visible_event ON public.juzs;
DROP POLICY IF EXISTS event_members_select_self_or_creator ON public.event_members;
DROP POLICY IF EXISTS event_members_delete_self_or_creator ON public.event_members;

CREATE POLICY events_select_public_or_member
  ON public.events
  FOR SELECT
  USING (
    is_public = true
    OR public.current_user_is_event_creator(events.id)
    OR public.current_user_is_event_member(events.id)
  );

CREATE POLICY khatms_select_visible_event
  ON public.khatms
  FOR SELECT
  USING (
    public.can_access_event(khatms.event_id)
  );

CREATE POLICY juzs_select_visible_event
  ON public.juzs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.khatms k
      WHERE k.id = juzs.khatm_id
        AND public.can_access_event(k.event_id)
    )
  );

CREATE POLICY event_members_select_self_or_creator
  ON public.event_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.current_user_is_event_creator(event_members.event_id)
  );

CREATE POLICY event_members_delete_self_or_creator
  ON public.event_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_is_event_creator(event_members.event_id)
  );
