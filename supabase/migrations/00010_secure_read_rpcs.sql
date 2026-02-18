-- Controlled read interface for SSR/OG/sitemap/API surfaces.

CREATE OR REPLACE FUNCTION public.current_auth_is_non_anonymous()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

CREATE OR REPLACE FUNCTION public.can_access_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
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
  );
$$;

CREATE OR REPLACE FUNCTION public.get_event_snapshot_by_shortcode(p_short_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_uid UUID := auth.uid();
  v_is_creator BOOLEAN := false;
  v_is_member BOOLEAN := false;
  v_khatms JSONB := '[]'::jsonb;
BEGIN
  SELECT *
  INTO v_event
  FROM public.events
  WHERE short_code = p_short_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_uid IS NOT NULL THEN
    v_is_creator := v_event.created_by = v_uid;
    SELECT EXISTS (
      SELECT 1
      FROM public.event_members m
      WHERE m.event_id = v_event.id
        AND m.user_id = v_uid
    )
    INTO v_is_member;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', k.id,
        'khatm_number', k.khatm_number,
        'claimed_count', COALESCE(j_stats.claimed_count, 0),
        'read_count', COALESCE(j_stats.read_count, 0),
        'juzs', COALESCE(j_stats.juzs, '[]'::jsonb)
      )
      ORDER BY k.khatm_number
    ),
    '[]'::jsonb
  )
  INTO v_khatms
  FROM public.khatms k
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE j.status <> 'unclaimed')::INT AS claimed_count,
      COUNT(*) FILTER (WHERE j.status = 'read')::INT AS read_count,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', j.id,
            'juz_number', j.juz_number,
            'status', j.status,
            'claimed_by_name', j.claimed_by_name,
            'is_mine', (v_uid IS NOT NULL AND j.claimed_by_user_id = v_uid)
          )
          ORDER BY j.juz_number
        ),
        '[]'::jsonb
      ) AS juzs
    FROM public.juzs j
    WHERE j.khatm_id = k.id
  ) j_stats ON true
  WHERE k.event_id = v_event.id
    AND k.is_deleted = false;

  RETURN jsonb_build_object(
    'id', v_event.id,
    'name', v_event.name,
    'description', v_event.description,
    'short_code', v_event.short_code,
    'is_locked', v_event.is_locked,
    'is_public', v_event.is_public,
    'is_archived', v_event.is_archived,
    'created_at', v_event.created_at,
    'is_creator', v_is_creator,
    'is_member', v_is_member,
    'can_manage', v_is_creator,
    'khatms', v_khatms
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_events_with_progress(p_limit INT DEFAULT 50)
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
    SELECT e.id, e.name, e.description, e.short_code, e.deadline, e.is_public, e.created_at
    FROM public.events e
    WHERE e.is_public = true
      AND e.is_archived = false
    ORDER BY e.created_at DESC
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
  ORDER BY e.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_events_for_sitemap()
RETURNS TABLE (
  short_code TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.short_code, e.created_at
  FROM public.events e
  WHERE e.is_public = true
    AND e.is_archived = false
  ORDER BY e.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_community_stats()
RETURNS TABLE (
  total_circles BIGINT,
  total_juz_claimed BIGINT,
  active_khatms BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.events e WHERE e.is_archived = false) AS total_circles,
    (SELECT COUNT(*) FROM public.juzs j WHERE j.status <> 'unclaimed') AS total_juz_claimed,
    (SELECT COUNT(*) FROM public.khatms k WHERE k.is_deleted = false) AS active_khatms;
$$;

REVOKE ALL ON FUNCTION public.can_access_event(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_event_snapshot_by_shortcode(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_public_events_with_progress(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_public_events_for_sitemap() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_community_stats() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_access_event(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_snapshot_by_shortcode(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_events_with_progress(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_events_for_sitemap() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_stats() TO anon, authenticated;
