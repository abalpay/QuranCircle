-- Add cursor pagination support for public events browse listing.
-- Backward compatibility: callers can still pass only p_limit.

DROP FUNCTION IF EXISTS public.list_public_events_with_progress(INT);

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

REVOKE ALL ON FUNCTION public.list_public_events_with_progress(INT, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_events_with_progress(INT, TIMESTAMPTZ, UUID) TO anon, authenticated;
