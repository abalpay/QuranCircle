-- Add windowed snapshot reads for circle pages to avoid unbounded payload growth.
-- Backward compatibility: callers can still pass only p_short_code.

DROP FUNCTION IF EXISTS public.get_event_snapshot_by_shortcode(TEXT);

CREATE OR REPLACE FUNCTION public.get_event_snapshot_by_shortcode(
  p_short_code TEXT,
  p_khatm_limit INT DEFAULT NULL,
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
  v_requested_limit INT := NULL;
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

  IF p_khatm_limit IS NOT NULL THEN
    v_requested_limit := GREATEST(1, LEAST(p_khatm_limit, 20));
  END IF;

  SELECT COUNT(*)::INT
  INTO v_total_khatms
  FROM public.khatms k
  WHERE k.event_id = v_event.id
    AND k.is_deleted = false;

  WITH scoped_khatms AS (
    SELECT k.id, k.khatm_number
    FROM public.khatms k
    WHERE k.event_id = v_event.id
      AND k.is_deleted = false
      AND (
        p_before_khatm_number IS NULL
        OR k.khatm_number < p_before_khatm_number
      )
    ORDER BY k.khatm_number DESC
    LIMIT COALESCE(v_requested_limit, 2147483647)
  ),
  khatm_payload AS (
    SELECT
      sk.id,
      sk.khatm_number,
      COALESCE(j_stats.claimed_count, 0) AS claimed_count,
      COALESCE(j_stats.read_count, 0) AS read_count,
      COALESCE(j_stats.juzs, '[]'::jsonb) AS juzs
    FROM scoped_khatms sk
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
      WHERE j.khatm_id = sk.id
    ) j_stats ON true
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', kp.id,
          'khatm_number', kp.khatm_number,
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

REVOKE ALL ON FUNCTION public.get_event_snapshot_by_shortcode(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_snapshot_by_shortcode(TEXT, INT, INT) TO anon, authenticated;
