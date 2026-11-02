-- #100: Browse lists only active circles: created in the last 7 days, or with a
-- juz claimed in the last 30 days in a non-deleted khatm. Same signature,
-- return shape and grants as 00029/00030. Filtering happens before LIMIT so
-- (created_at, id) cursor pagination stays gap- and duplicate-free.

CREATE OR REPLACE FUNCTION public.list_public_events_with_progress(
  p_limit INT DEFAULT 50,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  short_code TEXT,
  deadline TIMESTAMPTZ,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  claimed INT,
  total INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH limited_events AS (
    SELECT
      e.id,
      e.name,
      e.description,
      e.short_code,
      e.deadline,
      e.is_public,
      e.created_at
    FROM public.events e
    WHERE e.is_public = true
      AND e.is_archived = false
      AND (
        e.created_at >= now() - interval '7 days'
        OR EXISTS (
          SELECT 1
          FROM public.khatms ak
          JOIN public.juzs aj ON aj.khatm_id = ak.id
          WHERE ak.event_id = e.id
            AND ak.is_deleted = false
            AND (
              aj.claimed_at >= now() - interval '30 days'
              OR aj.read_at >= now() - interval '30 days'
            )
        )
      )
      AND (
        p_before_created_at IS NULL
        OR e.created_at < p_before_created_at
        OR (
          e.created_at = p_before_created_at
          AND p_before_id IS NOT NULL
          AND e.id < p_before_id
        )
      )
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 2000))
  )
  SELECT
    e.id,
    e.name,
    e.description,
    e.short_code,
    e.deadline,
    e.is_public,
    e.created_at,
    COALESCE(stats.claimed, 0)::INT AS claimed,
    COALESCE(NULLIF(stats.total, 0), 30)::INT AS total
  FROM limited_events e
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE j.status <> 'unclaimed') AS claimed,
      COUNT(*) AS total
    FROM public.khatms k
    JOIN public.juzs j ON j.khatm_id = k.id
    WHERE k.event_id = e.id
      AND k.is_deleted = false
  ) stats ON true
  ORDER BY e.created_at DESC, e.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_public_events_with_progress(INT, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_public_events_with_progress(INT, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
