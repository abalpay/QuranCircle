-- Khatm completion rule (D5/D6): record how a khatm completed, make completed
-- khatms final, add organizer completion and a (inactive) 7-day auto-complete.
ALTER TABLE public.khatms
  ADD COLUMN completion_source TEXT
  CONSTRAINT khatms_completion_source_check
  CHECK (completion_source IN ('all_done', 'organizer', 'auto'));

-- Every khatm completed so far was completed by its last Juz being marked Done.
UPDATE public.khatms SET completion_source = 'all_done' WHERE completed_at IS NOT NULL;

ALTER TABLE public.khatms
  ADD CONSTRAINT khatms_completion_consistency_check
  CHECK ((completed_at IS NULL) = (completion_source IS NULL)) NOT VALID;
ALTER TABLE public.khatms VALIDATE CONSTRAINT khatms_completion_consistency_check;

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

  SELECT e.id, e.is_archived, k.completed_at
  INTO v_event_id, v_is_archived, v_completed_at
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

  IF v_unclaimed_count = 0 THEN
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

CREATE OR REPLACE FUNCTION public.unclaim_juz(
  p_short_code TEXT,
  p_juz_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_khatm_id UUID;
  v_completed_at TIMESTAMPTZ;
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  PERFORM private.enforce_rpc_rate_limit('mutation');

  -- Lock event before Khatm/Juz, matching all mutation paths.
  PERFORM 1 FROM public.events e
  WHERE e.short_code = p_short_code
  FOR UPDATE;


  SELECT k.id, k.completed_at INTO v_khatm_id, v_completed_at FROM public.khatms k JOIN public.juzs j ON j.khatm_id=k.id JOIN public.events e ON e.id=k.event_id WHERE j.id=p_juz_id AND e.short_code=p_short_code FOR UPDATE OF k;

  SELECT e.is_archived, e.created_by, j.claimed_by_user_id
  INTO v_event_archived, v_event_creator, v_claimed_by
  FROM public.juzs j
  JOIN public.khatms k ON k.id = j.khatm_id
  JOIN public.events e ON e.id = k.event_id
  WHERE j.id = p_juz_id
    AND e.short_code = p_short_code
  LIMIT 1
  FOR UPDATE OF j;

  IF v_event_creator IS NULL AND v_claimed_by IS NULL THEN
    RAISE EXCEPTION 'Juz not found';
  END IF;

  IF v_event_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This khatm is completed';
  END IF;

  IF v_uid IS DISTINCT FROM v_event_creator AND v_uid IS DISTINCT FROM v_claimed_by THEN
    RAISE EXCEPTION 'Only the claimer or event creator can unclaim';
  END IF;

  UPDATE public.juzs
  SET
    claimed_by_name = NULL,
    claimed_by_user_id = NULL,
    status = 'unclaimed',
    claimed_at = NULL,
    read_at = NULL
  WHERE id = p_juz_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_juz_read_with_completion(
  p_short_code TEXT,
  p_juz_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
  v_status TEXT;
  v_khatm_id UUID;
  v_completed_at TIMESTAMPTZ;
  v_read_count INT;
  v_newly_completed BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  PERFORM private.enforce_rpc_rate_limit('mutation');

  -- Lock event before Khatm/Juz, matching all mutation paths.
  PERFORM 1 FROM public.events e
  WHERE e.short_code = p_short_code
  FOR UPDATE;


  -- Lock the parent Khatm before updating a Juz so simultaneous final reads
  -- serialize on one row and exactly one caller records first completion.
  SELECT
    e.is_archived,
    e.created_by,
    j.claimed_by_user_id,
    j.status,
    k.id,
    k.completed_at
  INTO
    v_event_archived,
    v_event_creator,
    v_claimed_by,
    v_status,
    v_khatm_id,
    v_completed_at
  FROM public.juzs j
  JOIN public.khatms k ON k.id = j.khatm_id
  JOIN public.events e ON e.id = k.event_id
  WHERE j.id = p_juz_id
    AND e.short_code = p_short_code
  LIMIT 1
  FOR UPDATE OF k, j;

  IF v_khatm_id IS NULL THEN
    RAISE EXCEPTION 'Juz not found';
  END IF;

  IF v_event_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_status <> 'claimed' THEN
    RAISE EXCEPTION 'Juz must be claimed before marking as read';
  END IF;

  IF v_uid IS DISTINCT FROM v_event_creator AND v_uid IS DISTINCT FROM v_claimed_by THEN
    RAISE EXCEPTION 'Only the claimer or event creator can mark as read';
  END IF;

  UPDATE public.juzs
  SET
    status = 'read',
    read_at = now()
  WHERE id = p_juz_id;

  SELECT COUNT(*) FILTER (WHERE status = 'read')::INT
  INTO v_read_count
  FROM public.juzs
  WHERE khatm_id = v_khatm_id;

  IF v_read_count = 30 AND v_completed_at IS NULL THEN
    UPDATE public.khatms
    SET completed_at = now(), completion_source = 'all_done'
    WHERE id = v_khatm_id
      AND completed_at IS NULL;

    v_newly_completed := FOUND;
  END IF;

  RETURN jsonb_build_object(
    'updated', true,
    'newly_completed', v_newly_completed
  );
END;
$$;

CREATE FUNCTION public.complete_khatm(
  p_short_code TEXT,
  p_khatm_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_creator UUID;
  v_archived BOOLEAN;
  v_completed_at TIMESTAMPTZ;
  v_unclaimed INT;
  v_total INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  PERFORM private.enforce_rpc_rate_limit('mutation');

  -- Lock event before Khatm, matching all mutation paths.
  PERFORM 1 FROM public.events e WHERE e.short_code = p_short_code FOR UPDATE;

  SELECT e.created_by, e.is_archived, k.completed_at
  INTO v_creator, v_archived, v_completed_at
  FROM public.khatms k
  JOIN public.events e ON e.id = k.event_id
  WHERE k.id = p_khatm_id
    AND k.is_deleted = false
    AND e.short_code = p_short_code
  FOR UPDATE OF k;

  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Khatm not found';
  END IF;

  IF v_uid IS DISTINCT FROM v_creator THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('completed', true, 'newly_completed', false);
  END IF;

  SELECT COUNT(*) FILTER (WHERE j.status = 'unclaimed')::INT, COUNT(*)::INT
  INTO v_unclaimed, v_total
  FROM public.juzs j
  WHERE j.khatm_id = p_khatm_id;

  IF v_total <> 30 OR v_unclaimed > 0 THEN
    RAISE EXCEPTION 'All 30 Juz must be claimed before completing';
  END IF;

  UPDATE public.khatms
  SET completed_at = now(), completion_source = 'organizer'
  WHERE id = p_khatm_id;

  RETURN jsonb_build_object('completed', true, 'newly_completed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_khatm(TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_khatm(TEXT, UUID)
  TO authenticated, service_role;

-- D5.3: a fully claimed khatm completes 7 days after its last claim. The
-- completion time is that deadline, not the (later) time the job ran.
CREATE FUNCTION private.auto_complete_khatms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r RECORD;
  v_last_claim TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT k.id, k.event_id
    FROM public.khatms k
    JOIN public.events e ON e.id = k.event_id
    WHERE k.completed_at IS NULL
      AND k.is_deleted = false
      AND e.is_archived = false
    ORDER BY k.created_at
    LIMIT 1000 -- shortcut: bounded batch per run, the next run picks up the rest
  LOOP
    -- Event first, then khatm, like every mutation; skip busy events.
    PERFORM 1 FROM public.events e
    WHERE e.id = r.event_id AND e.is_archived = false
    FOR UPDATE SKIP LOCKED;
    CONTINUE WHEN NOT FOUND;

    PERFORM 1 FROM public.khatms k
    WHERE k.id = r.id AND k.completed_at IS NULL AND k.is_deleted = false
    FOR UPDATE;
    CONTINUE WHEN NOT FOUND;

    -- Recheck under the lock: a claim or unclaim may have raced the scan.
    SELECT MAX(j.claimed_at) INTO v_last_claim
    FROM public.juzs j
    WHERE j.khatm_id = r.id
    HAVING COUNT(*) = 30 AND COUNT(*) FILTER (WHERE j.status = 'unclaimed') = 0;

    IF v_last_claim IS NOT NULL AND v_last_claim <= now() - interval '7 days' THEN
      UPDATE public.khatms
      SET completed_at = v_last_claim + interval '7 days', completion_source = 'auto'
      WHERE id = r.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION private.auto_complete_khatms()
  FROM PUBLIC, anon, authenticated, service_role;

-- Daily at 04:15 UTC. Created INACTIVE: activation is a separate, owner-approved
-- step after a read-only production count.
SELECT cron.schedule(
  'qurancircle-auto-complete-khatms',
  '15 4 * * *',
  $cron$
    SET statement_timeout = '30s';
    SET lock_timeout = '5s';
    SELECT private.auto_complete_khatms();
  $cron$
);

SELECT cron.alter_job(
  job_id := (
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'qurancircle-auto-complete-khatms'
  ),
  active := false
);

NOTIFY pgrst, 'reload schema';
