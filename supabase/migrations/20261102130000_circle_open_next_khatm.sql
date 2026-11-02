-- #82 (D13): circles are ongoing by default; the organizer can stop new khatms
-- opening. Existing circles keep today's behaviour (default true).
ALTER TABLE public.events
  ADD COLUMN open_next_khatm BOOLEAN NOT NULL DEFAULT true;

-- claim_juz_batch: as in 20261102120000, but the next khatm opens only when
-- the circle's open_next_khatm is on. Grants are unchanged by CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION public.claim_juz_batch(
  p_short_code TEXT,
  p_khatm_id UUID,
  p_juz_numbers INT[],
  p_claimer_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
  v_is_archived BOOLEAN;
  v_open_next_khatm BOOLEAN;
  v_completed_at TIMESTAMPTZ;
  v_requested_numbers INT[];
  v_claimed_numbers INT[];
  v_failed_numbers INT[];
  v_unclaimed_count INT;
  v_current_khatm_number INT;
  v_new_khatm_id UUID;
  v_new_khatm_created BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  IF p_claimer_name IS NULL OR char_length(btrim(p_claimer_name)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Claimer name must be between 1 and 100 characters';
  END IF;

  IF p_juz_numbers IS NULL OR cardinality(p_juz_numbers) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Select between 1 and 30 Juz';
  END IF;
  PERFORM private.enforce_rpc_rate_limit('mutation');
  -- Serialize claims with archive and ownership mutations.
  PERFORM 1 FROM public.events WHERE short_code=p_short_code FOR UPDATE;

  SELECT e.id, e.is_archived, e.open_next_khatm, k.completed_at
  INTO v_event_id, v_is_archived, v_open_next_khatm, v_completed_at
  FROM public.khatms k
  JOIN public.events e ON e.id = k.event_id
  WHERE k.id = p_khatm_id
    AND k.is_deleted = false
    AND e.short_code = p_short_code
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_is_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This khatm is completed';
  END IF;

  SELECT ARRAY_AGG(DISTINCT n ORDER BY n)
  INTO v_requested_numbers
  FROM unnest(COALESCE(p_juz_numbers, ARRAY[]::INT[])) AS n
  WHERE n BETWEEN 1 AND 30;

  IF v_requested_numbers IS NULL OR array_length(v_requested_numbers, 1) = 0 THEN
    RAISE EXCEPTION 'Select at least one valid Juz';
  END IF;

  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (v_event_id, v_uid, 'participant')
  ON CONFLICT (event_id, user_id) DO NOTHING;

  WITH requested AS (
    SELECT unnest(v_requested_numbers) AS juz_number
  ),
  claimed_rows AS (
    UPDATE public.juzs j
    SET
      claimed_by_name = btrim(p_claimer_name),
      claimed_by_user_id = v_uid,
      status = 'claimed',
      claimed_at = now(),
      read_at = NULL
    FROM requested r
    WHERE j.khatm_id = p_khatm_id
      AND j.juz_number = r.juz_number
      AND j.status = 'unclaimed'
    RETURNING j.juz_number
  )
  SELECT ARRAY_AGG(c.juz_number ORDER BY c.juz_number)
  INTO v_claimed_numbers
  FROM claimed_rows c;

  IF v_claimed_numbers IS NULL OR array_length(v_claimed_numbers, 1) = 0 THEN
    RAISE EXCEPTION 'All selected juz were already claimed by someone else';
  END IF;

  SELECT ARRAY_AGG(x.n ORDER BY x.n)
  INTO v_failed_numbers
  FROM (
    SELECT unnest(v_requested_numbers) AS n
    EXCEPT
    SELECT unnest(v_claimed_numbers)
  ) x;

  SELECT COUNT(*)::INT
  INTO v_unclaimed_count
  FROM public.juzs
  WHERE khatm_id = p_khatm_id
    AND status = 'unclaimed';

  IF v_unclaimed_count = 0 AND v_open_next_khatm THEN
    SELECT k.khatm_number
    INTO v_current_khatm_number
    FROM public.khatms k
    WHERE k.id = p_khatm_id
    LIMIT 1;

    INSERT INTO public.khatms (event_id, khatm_number)
    VALUES (v_event_id, v_current_khatm_number + 1)
    ON CONFLICT (event_id, khatm_number) WHERE is_deleted = false
    DO NOTHING
    RETURNING id INTO v_new_khatm_id;

    IF v_new_khatm_id IS NOT NULL THEN
      INSERT INTO public.juzs (khatm_id, juz_number)
      SELECT v_new_khatm_id, generate_series(1, 30)
      ON CONFLICT (khatm_id, juz_number) DO NOTHING;
      v_new_khatm_created := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'claimed', to_jsonb(COALESCE(v_claimed_numbers, ARRAY[]::INT[])),
    'failed', to_jsonb(COALESCE(v_failed_numbers, ARRAY[]::INT[])),
    'new_khatm_created', v_new_khatm_created
  );
END;
$$;

-- get_event_snapshot_by_shortcode: as in 20261102120000, plus open_next_khatm.
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
          'completed_at', kp.completed_at,
          'completion_source', kp.completion_source,
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

-- Creator-only switch. Off: remove an empty trailing khatm (never one with
-- claims, never the only khatm). On: open the next khatm if the latest is full.
CREATE FUNCTION public.set_open_next_khatm(
  p_short_code TEXT,
  p_open BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
  v_creator UUID;
  v_archived BOOLEAN;
  v_latest_id UUID;
  v_latest_number INT;
  v_total INT;
  v_claimed INT;
  v_unclaimed INT;
  v_new_khatm_id UUID;
  v_removed BOOLEAN := false;
  v_opened BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  IF p_open IS NULL THEN
    RAISE EXCEPTION 'Invalid input';
  END IF;

  PERFORM private.enforce_rpc_rate_limit('mutation');

  -- Lock event before Khatm, matching all mutation paths.
  SELECT e.id, e.created_by, e.is_archived
  INTO v_event_id, v_creator, v_archived
  FROM public.events e
  WHERE e.short_code = p_short_code
  FOR UPDATE;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_uid IS DISTINCT FROM v_creator THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  UPDATE public.events SET open_next_khatm = p_open WHERE id = v_event_id;

  SELECT k.id, k.khatm_number
  INTO v_latest_id, v_latest_number
  FROM public.khatms k
  WHERE k.event_id = v_event_id AND k.is_deleted = false
  ORDER BY k.khatm_number DESC
  LIMIT 1
  FOR UPDATE;

  IF v_latest_id IS NOT NULL THEN
    SELECT COUNT(*) FILTER (WHERE j.status <> 'unclaimed')::INT,
           COUNT(*) FILTER (WHERE j.status = 'unclaimed')::INT
    INTO v_claimed, v_unclaimed
    FROM public.juzs j
    WHERE j.khatm_id = v_latest_id;

    IF NOT p_open THEN
      SELECT COUNT(*)::INT INTO v_total
      FROM public.khatms k
      WHERE k.event_id = v_event_id AND k.is_deleted = false;

      IF v_claimed = 0 AND v_total > 1 THEN
        DELETE FROM public.khatms WHERE id = v_latest_id;
        v_removed := true;
      END IF;
    ELSIF v_unclaimed = 0 AND v_claimed = 30 THEN
      INSERT INTO public.khatms (event_id, khatm_number)
      VALUES (v_event_id, v_latest_number + 1)
      ON CONFLICT (event_id, khatm_number) WHERE is_deleted = false
      DO NOTHING
      RETURNING id INTO v_new_khatm_id;

      IF v_new_khatm_id IS NOT NULL THEN
        INSERT INTO public.juzs (khatm_id, juz_number)
        SELECT v_new_khatm_id, generate_series(1, 30)
        ON CONFLICT (khatm_id, juz_number) DO NOTHING;
        v_opened := true;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'open_next_khatm', p_open,
    'removed_khatm', v_removed,
    'opened_khatm', v_opened
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_open_next_khatm(TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_open_next_khatm(TEXT, BOOLEAN)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
