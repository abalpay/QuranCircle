-- Verify Phase 1 hardening from migration 00030:
-- - RPC privilege matrix
-- - anon cannot execute mutation/user RPCs
-- - public read RPCs remain callable by anon
-- - duplicate indexes are removed
-- - public events cursor index exists

-- 1) Inspect effective routine privileges for relevant functions.
SELECT
  rp.routine_schema,
  rp.routine_name,
  rp.grantee,
  rp.privilege_type
FROM information_schema.routine_privileges rp
WHERE rp.routine_schema IN ('public', 'private')
  AND rp.routine_name IN (
    'current_auth_is_non_anonymous',
    'broadcast_event_invalidation',
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
    'mark_juz_read_with_completion',
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
  -- SECURITY DEFINER policy helpers must not be exposed as public RPCs.
  IF to_regprocedure('public.can_access_event(uuid)') IS NOT NULL
     OR to_regprocedure('public.current_user_is_event_creator(uuid)') IS NOT NULL
     OR to_regprocedure('public.current_user_is_event_member(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'FAILED: internal policy helper remains in public';
  END IF;
  IF to_regprocedure('private.can_access_event(uuid)') IS NULL
     OR to_regprocedure('private.current_user_is_event_creator(uuid)') IS NULL
     OR to_regprocedure('private.current_user_is_event_member(uuid)') IS NULL THEN
    RAISE EXCEPTION 'FAILED: private policy helper is missing';
  END IF;
  IF has_schema_privilege('anon', 'private', 'USAGE')
     OR has_schema_privilege('authenticated', 'private', 'USAGE')
     OR has_schema_privilege('service_role', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'FAILED: a client role can resolve objects in private';
  END IF;
  IF NOT has_function_privilege('anon', 'private.can_access_event(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.can_access_event(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'private.current_user_is_event_creator(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.current_user_is_event_creator(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'private.current_user_is_event_member(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.current_user_is_event_member(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: RLS roles cannot execute a private policy helper';
  END IF;

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
  IF has_function_privilege('anon', 'public.mark_juz_read_with_completion(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute mark_juz_read_with_completion';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.mark_juz_read_with_completion(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated cannot execute mark_juz_read_with_completion';
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
  IF to_regprocedure('public.cleanup_current_user_data()') IS NULL THEN
    RAISE EXCEPTION 'FAILED: account deletion rollout compatibility RPC is missing';
  END IF;
  IF has_function_privilege('anon', 'public.cleanup_current_user_data()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute cleanup_current_user_data';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.cleanup_current_user_data()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated cannot execute cleanup_current_user_data compatibility RPC';
  END IF;
  IF has_function_privilege('service_role', 'public.cleanup_current_user_data()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role can execute cleanup_current_user_data compatibility RPC';
  END IF;
  IF has_function_privilege('anon', 'public.merge_anonymous_identity_for_target(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can execute merge_anonymous_identity_for_target';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'cleanup_user_data_before_auth_delete'
      AND NOT t.tgisinternal
      AND t.tgenabled <> 'D'
      AND t.tgfoid = to_regprocedure('private.cleanup_user_data_before_auth_delete()')
  ) THEN
    RAISE EXCEPTION 'FAILED: transactional account-deletion trigger is missing or disabled';
  END IF;

  -- Internal trigger functions must never be client-callable.
  IF has_function_privilege('anon', 'public.broadcast_event_invalidation()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.broadcast_event_invalidation()', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.broadcast_event_invalidation()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: client role can execute broadcast_event_invalidation';
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

-- 3) Direct table access is service-role only; clients use RPCs.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.events',
    'public.khatms',
    'public.juzs',
    'public.bookmarks',
    'public.event_members'
  ]
  LOOP
    IF has_table_privilege('anon', v_table, 'SELECT,INSERT,UPDATE,DELETE')
       OR has_table_privilege('authenticated', v_table, 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'FAILED: client role has direct CRUD on %', v_table;
    END IF;

    IF NOT has_table_privilege('service_role', v_table, 'SELECT')
       OR NOT has_table_privilege('service_role', v_table, 'INSERT')
       OR NOT has_table_privilege('service_role', v_table, 'UPDATE')
       OR NOT has_table_privilege('service_role', v_table, 'DELETE') THEN
      RAISE EXCEPTION 'FAILED: service_role lacks required CRUD on %', v_table;
    END IF;
  END LOOP;

  RAISE NOTICE 'PASS: direct table privilege assertions succeeded.';
END
$$;

-- 4) Index assertions.
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

  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'khatms_completed_at_idx'
  )
  INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'FAILED: khatms_completed_at_idx is missing';
  END IF;

  RAISE NOTICE 'PASS: index assertions succeeded.';
END
$$;

-- 5) Product outcome schema assertions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'khatms'
      AND column_name = 'completed_at'
  ) THEN
    RAISE EXCEPTION 'FAILED: khatms.completed_at is missing';
  END IF;

  RAISE NOTICE 'PASS: product outcome schema assertions succeeded.';
END
$$;
