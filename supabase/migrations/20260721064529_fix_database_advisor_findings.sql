-- Resolve Supabase advisor findings without changing policy semantics.

-- The helper references auth functions explicitly, so an empty search path is
-- safe and prevents callers from influencing name resolution.
ALTER FUNCTION public.current_auth_is_non_anonymous()
  SET search_path = '';

-- Wrap stable auth/helper calls in scalar subqueries so Postgres evaluates
-- them once per statement rather than once per row.
DROP POLICY IF EXISTS events_insert_creator_only ON public.events;
CREATE POLICY events_insert_creator_only
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT public.current_auth_is_non_anonymous())
  );

DROP POLICY IF EXISTS events_update_creator_only ON public.events;
CREATE POLICY events_update_creator_only
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.current_auth_is_non_anonymous())
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND (SELECT public.current_auth_is_non_anonymous())
  );

DROP POLICY IF EXISTS events_delete_creator_only ON public.events;
CREATE POLICY events_delete_creator_only
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND (SELECT public.current_auth_is_non_anonymous())
  );

DROP POLICY IF EXISTS event_members_select_self_or_creator ON public.event_members;
CREATE POLICY event_members_select_self_or_creator
  ON public.event_members
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR public.current_user_is_event_creator(event_members.event_id)
  );

DROP POLICY IF EXISTS event_members_delete_self_or_creator ON public.event_members;
CREATE POLICY event_members_delete_self_or_creator
  ON public.event_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.current_user_is_event_creator(event_members.event_id)
  );

DROP POLICY IF EXISTS bookmarks_select_own ON public.bookmarks;
CREATE POLICY bookmarks_select_own
  ON public.bookmarks
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS bookmarks_insert_own ON public.bookmarks;
CREATE POLICY bookmarks_insert_own
  ON public.bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS bookmarks_delete_own ON public.bookmarks;
CREATE POLICY bookmarks_delete_own
  ON public.bookmarks
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
