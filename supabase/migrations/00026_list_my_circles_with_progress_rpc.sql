-- List circles a user created or actually participated in via claimed/read juz activity.
-- Works for both authenticated and anonymous auth users (auth.uid() must be present).

CREATE OR REPLACE FUNCTION public.list_my_circles_with_progress()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  short_code TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  relation TEXT,
  claimed INT,
  total INT,
  my_claimed INT,
  my_read INT,
  last_activity_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH auth_context AS (
    SELECT auth.uid() AS uid
  ),
  candidate_events AS (
    SELECT e.id
    FROM public.events e
    JOIN auth_context ac ON true
    WHERE ac.uid IS NOT NULL
      AND e.created_by = ac.uid

    UNION

    SELECT k.event_id AS id
    FROM public.khatms k
    JOIN public.juzs j ON j.khatm_id = k.id
    JOIN auth_context ac ON true
    WHERE ac.uid IS NOT NULL
      AND k.is_deleted = false
      AND j.claimed_by_user_id = ac.uid
      AND j.status IN ('claimed', 'read')
  ),
  scoped_events AS (
    SELECT
      e.id,
      e.name,
      e.description,
      e.short_code,
      e.is_public,
      e.created_at,
      e.is_archived,
      e.archived_at,
      CASE
        WHEN e.created_by = ac.uid THEN 'creator'
        ELSE 'participant'
      END AS relation
    FROM public.events e
    JOIN candidate_events ce ON ce.id = e.id
    JOIN auth_context ac ON true
    WHERE ac.uid IS NOT NULL
  )
  SELECT
    se.id,
    se.name,
    se.description,
    se.short_code,
    se.is_public,
    se.created_at,
    se.is_archived,
    se.archived_at,
    se.relation,
    COALESCE(stats.claimed, 0)::INT AS claimed,
    COALESCE(NULLIF(stats.total, 0), 30)::INT AS total,
    COALESCE(stats.my_claimed, 0)::INT AS my_claimed,
    COALESCE(stats.my_read, 0)::INT AS my_read,
    COALESCE(activity.last_activity_at, se.created_at) AS last_activity_at
  FROM scoped_events se
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE j.status <> 'unclaimed') AS claimed,
      COUNT(*) AS total,
      COUNT(*) FILTER (
        WHERE j.claimed_by_user_id = ac.uid
          AND j.status IN ('claimed', 'read')
      ) AS my_claimed,
      COUNT(*) FILTER (
        WHERE j.claimed_by_user_id = ac.uid
          AND j.status = 'read'
      ) AS my_read
    FROM public.khatms k
    JOIN public.juzs j ON j.khatm_id = k.id
    JOIN auth_context ac ON true
    WHERE k.event_id = se.id
      AND k.is_deleted = false
  ) stats ON true
  LEFT JOIN LATERAL (
    SELECT MAX(COALESCE(j.read_at, j.claimed_at)) AS last_activity_at
    FROM public.khatms k
    JOIN public.juzs j ON j.khatm_id = k.id
    JOIN auth_context ac ON true
    WHERE k.event_id = se.id
      AND k.is_deleted = false
      AND j.claimed_by_user_id = ac.uid
      AND j.status IN ('claimed', 'read')
  ) activity ON true
  ORDER BY
    se.is_archived ASC,
    COALESCE(activity.last_activity_at, se.created_at) DESC,
    se.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_circles_with_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_circles_with_progress() TO authenticated;
