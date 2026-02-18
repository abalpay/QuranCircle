-- Replace app-level N+1 progress reads with a single server-side aggregation RPC.

CREATE OR REPLACE FUNCTION public.list_user_events_with_progress()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  short_code TEXT,
  deadline TIMESTAMPTZ,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  claimed INT,
  total INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH auth_context AS (
    SELECT auth.uid() AS uid
  ),
  scoped_events AS (
    SELECT
      e.id,
      e.name,
      e.description,
      e.short_code,
      e.deadline,
      e.is_public,
      e.created_at,
      e.is_archived
    FROM public.events e
    JOIN auth_context cu ON true
    WHERE cu.uid IS NOT NULL
      AND public.current_auth_is_non_anonymous()
      AND e.created_by = cu.uid
  )
  SELECT
    se.id,
    se.name,
    se.description,
    se.short_code,
    se.deadline,
    se.is_public,
    se.created_at,
    se.is_archived,
    COALESCE(COUNT(j.id) FILTER (WHERE j.status <> 'unclaimed'), 0)::INT AS claimed,
    COALESCE(NULLIF(COUNT(j.id), 0), 30)::INT AS total
  FROM scoped_events se
  LEFT JOIN public.khatms k
    ON k.event_id = se.id
   AND k.is_deleted = false
  LEFT JOIN public.juzs j
    ON j.khatm_id = k.id
  GROUP BY
    se.id,
    se.name,
    se.description,
    se.short_code,
    se.deadline,
    se.is_public,
    se.created_at,
    se.is_archived
  ORDER BY se.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_user_events_with_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_user_events_with_progress() TO authenticated;
