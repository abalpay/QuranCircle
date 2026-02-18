-- Fix anonymous source detection in merge flow.
-- On hosted Supabase, auth.users.raw_app_meta_data->>'provider' may be empty
-- for anonymous users while auth.users.is_anonymous is the reliable signal.

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
      'reason', 'no_merge_required',
      'events_updated', 0,
      'juzs_updated', 0,
      'members_merged', 0
    );
  END IF;

  SELECT COALESCE(u.is_anonymous, false)
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
    RETURN jsonb_build_object(
      'merged', false,
      'reason', 'source_not_anonymous',
      'events_updated', 0,
      'juzs_updated', 0,
      'members_merged', 0
    );
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
