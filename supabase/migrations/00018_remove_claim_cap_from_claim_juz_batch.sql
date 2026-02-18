-- Remove per-identity claim cap while preserving all other claim guards and
-- automatic next-khatm creation when a khatm becomes fully claimed.

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
  v_is_locked BOOLEAN;
  v_is_archived BOOLEAN;
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

  IF p_claimer_name IS NULL OR btrim(p_claimer_name) = '' THEN
    RAISE EXCEPTION 'Claimer name is required';
  END IF;

  SELECT e.id, e.is_locked, e.is_archived
  INTO v_event_id, v_is_locked, v_is_archived
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

  IF v_is_locked THEN
    RAISE EXCEPTION 'This Khatim is locked';
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
