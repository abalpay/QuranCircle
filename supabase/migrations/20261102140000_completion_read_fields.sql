-- Read fields for the completion UI (#80, #81). No table, policy or write path changes.
--
-- 1. get_event_snapshot_by_shortcode: each khatm gains last_claimed_at, the latest
--    claim time (NULL for an empty khatm). The banner shows "latest claim + 7 days"
--    as the automatic completion date (D5.3). Only the organizer needs it, so it is
--    NULL for every other caller (anonymous visitors, readers). Same signature, so grants, owner and
--    SECURITY DEFINER / search_path settings are those of 20261102130000.
-- 2. list_my_circles_with_progress: gains has_khatm_ready_to_complete. The return
--    type changes, so the function is dropped and created again with the grants of
--    00030 (authenticated and service_role only).

CREATE OR REPLACE FUNCTION public.get_event_snapshot_by_shortcode(
  p_short_code TEXT,
  p_khatm_limit INT DEFAULT 3,
  p_before_khatm_number INT DEFAULT NULL
)
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
  v_total_khatms INT := 0;
  v_loaded_khatms INT := 0;
  v_has_more_khatms BOOLEAN := false;
  v_next_before_khatm_number INT := NULL;
  v_requested_limit INT := GREATEST(1, LEAST(COALESCE(p_khatm_limit,3),20));
  v_oldest_loaded_khatm_number INT := NULL;
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


  SELECT COUNT(*)::INT
  INTO v_total_khatms
  FROM public.khatms k
  WHERE k.event_id = v_event.id
    AND k.is_deleted = false;

  WITH scoped_khatms AS (
    SELECT k.id, k.khatm_number, k.completed_at, k.completion_source
    FROM public.khatms k
    WHERE k.event_id = v_event.id
      AND k.is_deleted = false
      AND (
        p_before_khatm_number IS NULL
        OR k.khatm_number < p_before_khatm_number
      )
    ORDER BY k.khatm_number DESC
    LIMIT v_requested_limit
  ),
  khatm_payload AS (
    SELECT
      sk.id,
      sk.khatm_number,
      sk.completed_at,
      sk.completion_source,
      j_stats.last_claimed_at,
      COALESCE(j_stats.claimed_count, 0) AS claimed_count,
      COALESCE(j_stats.read_count, 0) AS read_count,
      COALESCE(j_stats.juzs, '[]'::jsonb) AS juzs
    FROM scoped_khatms sk
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE j.status <> 'unclaimed')::INT AS claimed_count,
        COUNT(*) FILTER (WHERE j.status = 'read')::INT AS read_count,
        MAX(j.claimed_at) AS last_claimed_at,
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
      WHERE j.khatm_id = sk.id
    ) j_stats ON true
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', kp.id,
          'khatm_number', kp.khatm_number,
          'completed_at', kp.completed_at,
          'completion_source', kp.completion_source,
          'last_claimed_at', CASE WHEN v_is_creator THEN kp.last_claimed_at ELSE NULL END,
          'claimed_count', kp.claimed_count,
          'read_count', kp.read_count,
          'juzs', kp.juzs
        )
        ORDER BY kp.khatm_number
      ),
      '[]'::jsonb
    ) AS khatms,
    COUNT(*)::INT AS loaded_khatms,
    MIN(kp.khatm_number)::INT AS oldest_loaded_khatm_number
  INTO v_khatms, v_loaded_khatms, v_oldest_loaded_khatm_number
  FROM khatm_payload kp;

  IF v_loaded_khatms > 0 THEN
    IF p_before_khatm_number IS NULL THEN
      v_has_more_khatms := v_total_khatms > v_loaded_khatms;
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM public.khatms k
        WHERE k.event_id = v_event.id
          AND k.is_deleted = false
          AND k.khatm_number < v_oldest_loaded_khatm_number
      )
      INTO v_has_more_khatms;
    END IF;
  END IF;

  IF v_has_more_khatms THEN
    v_next_before_khatm_number := v_oldest_loaded_khatm_number;
  END IF;

  RETURN jsonb_build_object(
    'id', v_event.id,
    'name', v_event.name,
    'description', v_event.description,
    'short_code', v_event.short_code,
    'is_public', v_event.is_public,
    'is_archived', v_event.is_archived,
    'open_next_khatm', v_event.open_next_khatm,
    'created_at', v_event.created_at,
    'is_creator', v_is_creator,
    'is_member', v_is_member,
    'can_manage', v_is_creator,
    'khatms', v_khatms,
    'loaded_khatms', v_loaded_khatms,
    'total_khatms', v_total_khatms,
    'has_more_khatms', v_has_more_khatms,
    'next_before_khatm_number', v_next_before_khatm_number
  );
END;
$$;

DROP FUNCTION public.list_my_circles_with_progress();

CREATE FUNCTION public.list_my_circles_with_progress()
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
  last_activity_at TIMESTAMPTZ,
  has_khatm_ready_to_complete BOOLEAN
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
    COALESCE(activity.last_activity_at, se.created_at) AS last_activity_at,
    -- D5.2: a fully claimed, still open khatm in a circle that is not archived.
    (
      NOT se.is_archived
      AND EXISTS (
        SELECT 1
        FROM public.khatms rk
        WHERE rk.event_id = se.id
          AND rk.is_deleted = false
          AND rk.completed_at IS NULL
          AND (SELECT COUNT(*) FROM public.juzs rj WHERE rj.khatm_id = rk.id) = 30
          AND NOT EXISTS (
            SELECT 1 FROM public.juzs rj
            WHERE rj.khatm_id = rk.id AND rj.status = 'unclaimed'
          )
      )
    ) AS has_khatm_ready_to_complete
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

REVOKE ALL ON FUNCTION public.list_my_circles_with_progress()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_my_circles_with_progress()
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
