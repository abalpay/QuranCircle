-- Validate short-code contract inside event creation RPC to protect direct callers.

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
#variable_conflict use_column
DECLARE
  v_uid UUID := auth.uid();
  v_event_id UUID;
  v_khatm_id UUID;
  v_short_code TEXT := btrim(COALESCE(p_short_code, ''));
BEGIN
  IF NOT public.current_auth_is_non_anonymous() THEN
    RAISE EXCEPTION 'Sign in required to create a circle.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Circle name required';
  END IF;

  IF v_short_code = '' OR v_short_code !~ '^[A-Za-z0-9]{1,24}$' THEN
    RAISE EXCEPTION 'Invalid short code';
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
    v_short_code
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.event_members (event_id, user_id, role)
  VALUES (v_event_id, v_uid, 'creator')
  ON CONFLICT ON CONSTRAINT event_members_event_id_user_id_key DO NOTHING;

  INSERT INTO public.khatms (event_id, khatm_number)
  VALUES (v_event_id, 1)
  RETURNING id INTO v_khatm_id;

  INSERT INTO public.juzs (khatm_id, juz_number)
  SELECT v_khatm_id, generate_series(1, 30);

  RETURN QUERY
  SELECT v_event_id AS event_id, v_short_code AS short_code;
END;
$$;

