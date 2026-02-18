-- Transactional mutation RPCs. Server actions call these instead of direct table writes.

CREATE OR REPLACE FUNCTION public.ensure_event_membership(p_short_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
  v_role TEXT := 'participant';
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT id, CASE WHEN created_by = v_uid THEN 'creator' ELSE 'participant' END
  INTO v_event_id, v_role
  FROM public.events
  WHERE short_code = p_short_code
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (v_event_id, v_uid, v_role)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET role = CASE
    WHEN event_members.role = 'creator' OR EXCLUDED.role = 'creator' THEN 'creator'
    ELSE event_members.role
  END;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_event_with_initial_khatm(
  p_name TEXT,
  p_description TEXT,
  p_is_public BOOLEAN,
  p_short_code TEXT
)
RETURNS TABLE (
  event_id UUID,
  short_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
  v_khatm_id UUID;
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Sign in required to create a circle.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Circle name required';
  END IF;

  INSERT INTO public.events (
    name,
    description,
    is_public,
    created_by,
    short_code
  )
  VALUES (
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    COALESCE(p_is_public, false),
    v_uid,
    p_short_code
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (v_event_id, v_uid, 'creator')
  ON CONFLICT (event_id, user_id) DO NOTHING;

  INSERT INTO public.khatms (event_id, khatm_number)
  VALUES (v_event_id, 1)
  RETURNING id INTO v_khatm_id;

  INSERT INTO public.juzs (khatm_id, juz_number)
  SELECT v_khatm_id, generate_series(1, 30);

  RETURN QUERY
  SELECT v_event_id, p_short_code;
END;
$$;

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
  v_current_claim_count INT;
  v_requested_unclaimed_count INT;
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

  SELECT COUNT(*)::INT
  INTO v_current_claim_count
  FROM public.juzs j
  WHERE j.khatm_id = p_khatm_id
    AND j.claimed_by_user_id = v_uid
    AND j.status <> 'unclaimed';

  SELECT COUNT(*)::INT
  INTO v_requested_unclaimed_count
  FROM public.juzs j
  WHERE j.khatm_id = p_khatm_id
    AND j.juz_number = ANY(v_requested_numbers)
    AND j.status = 'unclaimed';

  IF v_current_claim_count + v_requested_unclaimed_count > 5 THEN
    RAISE EXCEPTION 'Claim limit reached: max 5 Juz per Khatm';
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
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  SELECT e.is_archived, e.created_by, j.claimed_by_user_id
  INTO v_event_archived, v_event_creator, v_claimed_by
  FROM public.juzs j
  JOIN public.khatms k ON k.id = j.khatm_id
  JOIN public.events e ON e.id = k.event_id
  WHERE j.id = p_juz_id
    AND e.short_code = p_short_code
  LIMIT 1;

  IF v_event_creator IS NULL AND v_claimed_by IS NULL THEN
    RAISE EXCEPTION 'Juz not found';
  END IF;

  IF v_event_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_uid <> v_event_creator AND v_uid <> v_claimed_by THEN
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

CREATE OR REPLACE FUNCTION public.mark_juz_read(
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
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  SELECT e.is_archived, e.created_by, j.claimed_by_user_id, j.status
  INTO v_event_archived, v_event_creator, v_claimed_by, v_status
  FROM public.juzs j
  JOIN public.khatms k ON k.id = j.khatm_id
  JOIN public.events e ON e.id = k.event_id
  WHERE j.id = p_juz_id
    AND e.short_code = p_short_code
  LIMIT 1;

  IF v_event_creator IS NULL AND v_claimed_by IS NULL THEN
    RAISE EXCEPTION 'Juz not found';
  END IF;

  IF v_event_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_status <> 'claimed' THEN
    RAISE EXCEPTION 'Juz must be claimed before marking as read';
  END IF;

  IF v_uid <> v_event_creator AND v_uid <> v_claimed_by THEN
    RAISE EXCEPTION 'Only the claimer or event creator can mark as read';
  END IF;

  UPDATE public.juzs
  SET status = 'read',
      read_at = now()
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
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  SELECT e.is_archived, e.created_by, j.claimed_by_user_id, j.status
  INTO v_event_archived, v_event_creator, v_claimed_by, v_status
  FROM public.juzs j
  JOIN public.khatms k ON k.id = j.khatm_id
  JOIN public.events e ON e.id = k.event_id
  WHERE j.id = p_juz_id
    AND e.short_code = p_short_code
  LIMIT 1;

  IF v_event_creator IS NULL AND v_claimed_by IS NULL THEN
    RAISE EXCEPTION 'Juz not found';
  END IF;

  IF v_event_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_status <> 'read' THEN
    RAISE EXCEPTION 'Juz is not marked as read';
  END IF;

  IF v_uid <> v_event_creator AND v_uid <> v_claimed_by THEN
    RAISE EXCEPTION 'Only the claimer or event creator can unmark as read';
  END IF;

  UPDATE public.juzs
  SET status = 'claimed',
      read_at = NULL
  WHERE id = p_juz_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_event_lock(
  p_short_code TEXT,
  p_is_locked BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Sign in required to manage this circle';
  END IF;

  UPDATE public.events
  SET is_locked = COALESCE(p_is_locked, false)
  WHERE short_code = p_short_code
    AND created_by = v_uid
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.events WHERE short_code = p_short_code) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
    RAISE EXCEPTION 'Event not found';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_event_archive(
  p_short_code TEXT,
  p_is_archived BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Sign in required to manage this circle';
  END IF;

  UPDATE public.events
  SET
    is_archived = COALESCE(p_is_archived, false),
    archived_at = CASE
      WHEN COALESCE(p_is_archived, false) THEN now()
      ELSE NULL
    END
  WHERE short_code = p_short_code
    AND created_by = v_uid
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.events WHERE short_code = p_short_code) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
    RAISE EXCEPTION 'Event not found';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_event_by_shortcode(
  p_short_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Sign in required to manage this circle';
  END IF;

  DELETE FROM public.events
  WHERE short_code = p_short_code
    AND created_by = v_uid
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.events WHERE short_code = p_short_code) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
    RAISE EXCEPTION 'Event not found';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_current_user_data()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.juzs
  SET
    claimed_by_name = NULL,
    claimed_by_user_id = NULL,
    status = 'unclaimed',
    claimed_at = NULL,
    read_at = NULL
  WHERE claimed_by_user_id = v_uid;

  DELETE FROM public.bookmarks
  WHERE user_id = v_uid;

  UPDATE public.events
  SET created_by = NULL
  WHERE created_by = v_uid;

  DELETE FROM public.event_members
  WHERE user_id = v_uid;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_anonymous_identity(
  p_source_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID := auth.uid();
  v_source_is_anonymous BOOLEAN := false;
  v_events_updated INT := 0;
  v_juzs_updated INT := 0;
  v_members_merged INT := 0;
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF p_source_user_id IS NULL OR p_source_user_id = v_target_user_id THEN
    RETURN jsonb_build_object(
      'merged', false,
      'events_updated', 0,
      'juzs_updated', 0,
      'members_merged', 0
    );
  END IF;

  SELECT COALESCE((u.raw_app_meta_data ->> 'provider') = 'anonymous', false)
  INTO v_source_is_anonymous
  FROM auth.users u
  WHERE u.id = p_source_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'merged', false,
      'reason', 'source_not_found',
      'events_updated', 0,
      'juzs_updated', 0,
      'members_merged', 0
    );
  END IF;

  IF NOT v_source_is_anonymous THEN
    RAISE EXCEPTION 'Source identity is not anonymous';
  END IF;

  UPDATE public.events
  SET created_by = v_target_user_id
  WHERE created_by = p_source_user_id;
  GET DIAGNOSTICS v_events_updated = ROW_COUNT;

  INSERT INTO public.event_members (event_id, user_id, role)
  SELECT e.id, v_target_user_id, 'creator'
  FROM public.events e
  WHERE e.created_by = v_target_user_id
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET role = 'creator';

  INSERT INTO public.event_members (event_id, user_id, role)
  SELECT m.event_id,
         v_target_user_id,
         CASE WHEN m.role = 'creator' THEN 'creator' ELSE 'participant' END
  FROM public.event_members m
  WHERE m.user_id = p_source_user_id
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET role = CASE
    WHEN event_members.role = 'creator' OR EXCLUDED.role = 'creator' THEN 'creator'
    ELSE event_members.role
  END;
  GET DIAGNOSTICS v_members_merged = ROW_COUNT;

  UPDATE public.juzs
  SET claimed_by_user_id = v_target_user_id
  WHERE claimed_by_user_id = p_source_user_id;
  GET DIAGNOSTICS v_juzs_updated = ROW_COUNT;

  DELETE FROM public.event_members
  WHERE user_id = p_source_user_id;

  RETURN jsonb_build_object(
    'merged', true,
    'events_updated', v_events_updated,
    'juzs_updated', v_juzs_updated,
    'members_merged', v_members_merged
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_event_membership(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_event_with_initial_khatm(TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_juz_batch(TEXT, UUID, INT[], TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unclaim_juz(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_juz_read(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unmark_juz_read(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_event_lock(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_event_archive(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_event_by_shortcode(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_current_user_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merge_anonymous_identity(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ensure_event_membership(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_with_initial_khatm(TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_juz_batch(TEXT, UUID, INT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unclaim_juz(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_juz_read(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unmark_juz_read(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_event_lock(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_event_archive(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_event_by_shortcode(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_current_user_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_anonymous_identity(UUID) TO authenticated;
