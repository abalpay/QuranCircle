-- Verify Phase 1 hardening from migration 00030:
-- - RPC privilege matrix
-- - anon cannot execute mutation/user RPCs
-- - public read RPCs remain callable by anon
-- - duplicate indexes are removed
-- - public events cursor index exists

-- 1) Inspect effective routine privileges for relevant functions.
SELECT
  rp.routine_name,
  rp.grantee,
  rp.privilege_type
FROM information_schema.routine_privileges rp
WHERE rp.routine_schema = 'public'
  AND rp.routine_name IN (
    'current_auth_is_non_anonymous',
    'can_access_event',
    'current_user_is_event_creator',
    'current_user_is_event_member',
    'get_event_snapshot_by_shortcode',
    'list_public_events_with_progress',
    'list_public_events_for_sitemap',
    'get_community_stats',
    'ensure_event_membership',
    'create_event_with_initial_khatm',
    'claim_juz_batch',
    'unclaim_juz',
    'mark_juz_read',
    'unmark_juz_read',
    'list_user_events_with_progress',
    'list_my_circles_with_progress',
    'set_event_archive',
    'delete_event_by_shortcode',
    'cleanup_current_user_data',
    'merge_anonymous_identity',
    'merge_anonymous_identity_for_target'
  )
ORDER BY rp.routine_name, rp.grantee, rp.privilege_type;

-- 2) Assertions: anon can read, but cannot run mutation/user RPCs.
DO $$
BEGIN
  -- anon-read RPCs should remain callable.
  IF NOT has_function_privilege('anon', 'public.get_event_snapshot_by_shortcode(text,integer,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon cannot execute get_event_snapshot_by_shortcode';
  END IF;
  IF NOT has_function_privilege('anon', 'public.list_public_events_with_progress(integer,timestamp with time zone,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon cannot execute list_public_events_with_progress';
  END IF;
  IF NOT has_function_privilege('anon', 'public.list_public_events_for_sitemap()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon cannot execute list_public_events_for_sitemap';
  END IF;
  IF NOT has_function_privilege('anon', 'public.get_community_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon cannot execute get_community_stats';
  END IF;

  -- anon-mutation/user RPCs must be blocked.
  IF has_function_privilege('anon', 'public.claim_juz_batch(text,uuid,integer[],text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute claim_juz_batch';
  END IF;
  IF has_function_privilege('anon', 'public.unclaim_juz(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute unclaim_juz';
  END IF;
  IF has_function_privilege('anon', 'public.mark_juz_read(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute mark_juz_read';
  END IF;
  IF has_function_privilege('anon', 'public.unmark_juz_read(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute unmark_juz_read';
  END IF;
  IF has_function_privilege('anon', 'public.ensure_event_membership(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute ensure_event_membership';
  END IF;
  IF has_function_privilege('anon', 'public.list_my_circles_with_progress()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute list_my_circles_with_progress';
  END IF;
  IF has_function_privilege('anon', 'public.list_user_events_with_progress()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute list_user_events_with_progress';
  END IF;
  IF has_function_privilege('anon', 'public.create_event_with_initial_khatm(text,text,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute create_event_with_initial_khatm';
  END IF;
  IF has_function_privilege('anon', 'public.set_event_archive(text,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute set_event_archive';
  END IF;
  IF has_function_privilege('anon', 'public.delete_event_by_shortcode(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute delete_event_by_shortcode';
  END IF;
  IF has_function_privilege('anon', 'public.cleanup_current_user_data()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute cleanup_current_user_data';
  END IF;
  IF has_function_privilege('anon', 'public.merge_anonymous_identity_for_target(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute merge_anonymous_identity_for_target';
  END IF;

  -- merge RPC hardening.
  IF has_function_privilege('authenticated', 'public.merge_anonymous_identity_for_target(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated can execute merge_anonymous_identity_for_target';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.merge_anonymous_identity_for_target(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role cannot execute merge_anonymous_identity_for_target';
  END IF;

  RAISE NOTICE 'PASS: RPC privilege assertions succeeded.';
END
$$;

-- 3) Index assertions.
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'events_short_code_idx'
  )
  INTO v_exists;
  IF v_exists THEN
    RAISE EXCEPTION 'FAILED: events_short_code_idx still exists';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'juzs_khatm_juz_number_idx'
  )
  INTO v_exists;
  IF v_exists THEN
    RAISE EXCEPTION 'FAILED: juzs_khatm_juz_number_idx still exists';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'events_public_created_at_id_idx'
  )
  INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'FAILED: events_public_created_at_id_idx is missing';
  END IF;

  RAISE NOTICE 'PASS: index assertions succeeded.';
END
$$;
