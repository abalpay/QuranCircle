-- Replace permissive RLS with UID + membership-based rules.

-- Clean up legacy policies.
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Users can create events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Creator can update own event" ON public.events;
DROP POLICY IF EXISTS "Creator can delete own event" ON public.events;

DROP POLICY IF EXISTS "Anyone can view khatms" ON public.khatms;
DROP POLICY IF EXISTS "Event creator can manage khatms" ON public.khatms;
DROP POLICY IF EXISTS "Anyone can insert khatm when event not locked" ON public.khatms;

DROP POLICY IF EXISTS "Anyone can view juzs" ON public.juzs;
DROP POLICY IF EXISTS "Anyone can claim juz when event not locked" ON public.juzs;
DROP POLICY IF EXISTS "Anyone can update juz (claim, mark read)" ON public.juzs;
DROP POLICY IF EXISTS "Claimer or event creator can unclaim" ON public.juzs;

DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khatms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juzs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Events are visible if public, or if requester is creator/member.
CREATE POLICY events_select_public_or_member
  ON public.events
  FOR SELECT
  USING (
    is_public = true
    OR (
      auth.uid() IS NOT NULL
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.event_members m
          WHERE m.event_id = events.id
            AND m.user_id = auth.uid()
        )
      )
    )
  );

-- Event mutation is creator-only and requires non-anonymous auth users.
CREATE POLICY events_insert_creator_only
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.current_auth_is_non_anonymous()
  );

CREATE POLICY events_update_creator_only
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND public.current_auth_is_non_anonymous()
  )
  WITH CHECK (
    created_by = auth.uid()
    AND public.current_auth_is_non_anonymous()
  );

CREATE POLICY events_delete_creator_only
  ON public.events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND public.current_auth_is_non_anonymous()
  );

-- Khatms and juzs are read-only via table access. Mutations go through RPCs.
CREATE POLICY khatms_select_visible_event
  ON public.khatms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = khatms.event_id
        AND (
          e.is_public = true
          OR (
            auth.uid() IS NOT NULL
            AND (
              e.created_by = auth.uid()
              OR EXISTS (
                SELECT 1
                FROM public.event_members m
                WHERE m.event_id = e.id
                  AND m.user_id = auth.uid()
              )
            )
          )
        )
    )
  );

CREATE POLICY juzs_select_visible_event
  ON public.juzs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.khatms k
      JOIN public.events e ON e.id = k.event_id
      WHERE k.id = juzs.khatm_id
        AND (
          e.is_public = true
          OR (
            auth.uid() IS NOT NULL
            AND (
              e.created_by = auth.uid()
              OR EXISTS (
                SELECT 1
                FROM public.event_members m
                WHERE m.event_id = e.id
                  AND m.user_id = auth.uid()
              )
            )
          )
        )
    )
  );

-- Membership visibility and self-service membership rows.
CREATE POLICY event_members_select_self_or_creator
  ON public.event_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_members.event_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY event_members_insert_self
  ON public.event_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY event_members_delete_self_or_creator
  ON public.event_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_members.event_id
        AND e.created_by = auth.uid()
    )
  );

-- Bookmarks remain user-scoped.
CREATE POLICY bookmarks_select_own
  ON public.bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY bookmarks_insert_own
  ON public.bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY bookmarks_delete_own
  ON public.bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.khatms FORCE ROW LEVEL SECURITY;
ALTER TABLE public.juzs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.event_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks FORCE ROW LEVEL SECURITY;
