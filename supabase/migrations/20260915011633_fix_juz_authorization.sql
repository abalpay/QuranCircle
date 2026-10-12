-- Fail closed for deleted creators and serialize authorization with mutation.
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
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  -- Lock event before Khatm/Juz, matching all mutation paths.
  PERFORM 1 FROM public.events e
  WHERE e.short_code = p_short_code
  FOR UPDATE;


  SELECT k.id INTO v_khatm_id FROM public.khatms k JOIN public.juzs j ON j.khatm_id=k.id JOIN public.events e ON e.id=k.event_id WHERE j.id=p_juz_id AND e.short_code=p_short_code FOR UPDATE OF k;

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

CREATE OR REPLACE FUNCTION public.unmark_juz_read(
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
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  -- Lock event before Khatm/Juz, matching all mutation paths.
  PERFORM 1 FROM public.events e
  WHERE e.short_code = p_short_code
  FOR UPDATE;


  SELECT k.id INTO v_khatm_id FROM public.khatms k JOIN public.juzs j ON j.khatm_id=k.id JOIN public.events e ON e.id=k.event_id WHERE j.id=p_juz_id AND e.short_code=p_short_code FOR UPDATE OF k;

  SELECT e.is_archived, e.created_by, j.claimed_by_user_id, j.status
  INTO v_event_archived, v_event_creator, v_claimed_by, v_status
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

  IF v_status <> 'read' THEN
    RAISE EXCEPTION 'Juz is not marked as read';
  END IF;

  IF v_uid IS DISTINCT FROM v_event_creator AND v_uid IS DISTINCT FROM v_claimed_by THEN
    RAISE EXCEPTION 'Only the claimer or event creator can unmark as read';
  END IF;

  UPDATE public.juzs
  SET status = 'claimed',
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
    SET completed_at = now()
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

CREATE OR REPLACE FUNCTION public.mark_juz_read(p_short_code TEXT, p_juz_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM public.mark_juz_read_with_completion(p_short_code, p_juz_id);
  RETURN true;
END;
$$;

-- Preserve the client RPC allowlist. Raw anon cannot mutate reading state.
REVOKE ALL ON FUNCTION public.unclaim_juz(TEXT,UUID), public.unmark_juz_read(TEXT,UUID), public.mark_juz_read(TEXT,UUID), public.mark_juz_read_with_completion(TEXT,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unclaim_juz(TEXT,UUID), public.unmark_juz_read(TEXT,UUID), public.mark_juz_read(TEXT,UUID), public.mark_juz_read_with_completion(TEXT,UUID) TO authenticated, service_role;
