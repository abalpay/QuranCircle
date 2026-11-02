-- #89: anonymous (guest) sessions may create and manage their own circles.
-- Only change vs 20260915012118: auth.uid() IS NOT NULL replaces current_auth_is_non_anonymous().
-- CREATE OR REPLACE keeps existing grants (authenticated).

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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to create a circle.';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Circle name must be between 1 and 200 characters';
  END IF;

  IF v_short_code = '' OR v_short_code !~ '^[A-Za-z0-9]{1,24}$' THEN
    RAISE EXCEPTION 'Invalid short code';
  END IF;

  IF char_length(btrim(COALESCE(p_description,''))) > 2000 THEN
    RAISE EXCEPTION 'Description must be at most 2000 characters';
  END IF;
  PERFORM private.enforce_rpc_rate_limit('create_event');

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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to manage this circle';
  END IF;

  PERFORM private.enforce_rpc_rate_limit('mutation');

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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to manage this circle';
  END IF;

  PERFORM private.enforce_rpc_rate_limit('mutation');

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

NOTIFY pgrst, 'reload schema';
