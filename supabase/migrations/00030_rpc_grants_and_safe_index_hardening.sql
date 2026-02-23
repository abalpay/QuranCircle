-- Phase 1 hardening:
-- 1) tighten RPC execute privileges to least privilege
-- 2) remove exact duplicate indexes
-- 3) add browse cursor/order index to avoid sort-heavy scans

DO $$
BEGIN
  -- Public read helpers (anon + authenticated + service_role)
  IF to_regprocedure('public.current_auth_is_non_anonymous()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.current_auth_is_non_anonymous() FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_auth_is_non_anonymous() TO anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.can_access_event(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.can_access_event(uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.can_access_event(uuid) TO anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.current_user_is_event_creator(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.current_user_is_event_creator(uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_user_is_event_creator(uuid) TO anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.current_user_is_event_member(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.current_user_is_event_member(uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_user_is_event_member(uuid) TO anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.get_event_snapshot_by_shortcode(text,integer,integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_event_snapshot_by_shortcode(text,integer,integer) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_event_snapshot_by_shortcode(text,integer,integer) TO anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.list_public_events_with_progress(integer,timestamp with time zone,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.list_public_events_with_progress(integer,timestamp with time zone,uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.list_public_events_with_progress(integer,timestamp with time zone,uuid) TO anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.list_public_events_for_sitemap()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.list_public_events_for_sitemap() FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.list_public_events_for_sitemap() TO anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.get_community_stats()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_community_stats() FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_community_stats() TO anon, authenticated, service_role';
  END IF;

  -- Auth-required mutation/user RPCs (authenticated + service_role)
  IF to_regprocedure('public.ensure_event_membership(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.ensure_event_membership(text) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ensure_event_membership(text) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.create_event_with_initial_khatm(text,text,boolean,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.create_event_with_initial_khatm(text,text,boolean,text) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_event_with_initial_khatm(text,text,boolean,text) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.claim_juz_batch(text,uuid,integer[],text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.claim_juz_batch(text,uuid,integer[],text) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_juz_batch(text,uuid,integer[],text) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.unclaim_juz(text,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.unclaim_juz(text,uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.unclaim_juz(text,uuid) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.mark_juz_read(text,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.mark_juz_read(text,uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.mark_juz_read(text,uuid) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.unmark_juz_read(text,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.unmark_juz_read(text,uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.unmark_juz_read(text,uuid) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.list_user_events_with_progress()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.list_user_events_with_progress() FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.list_user_events_with_progress() TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.list_my_circles_with_progress()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.list_my_circles_with_progress() FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.list_my_circles_with_progress() TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.set_event_archive(text,boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.set_event_archive(text,boolean) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_event_archive(text,boolean) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.delete_event_by_shortcode(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.delete_event_by_shortcode(text) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_event_by_shortcode(text) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.cleanup_current_user_data()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.cleanup_current_user_data() FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_current_user_data() TO authenticated, service_role';
  END IF;

  -- Keep legacy merge RPC non-client callable (service_role only)
  IF to_regprocedure('public.merge_anonymous_identity(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.merge_anonymous_identity(uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.merge_anonymous_identity(uuid) TO service_role';
  END IF;

  -- Privileged merge RPC (service_role only)
  IF to_regprocedure('public.merge_anonymous_identity_for_target(uuid,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.merge_anonymous_identity_for_target(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.merge_anonymous_identity_for_target(uuid,uuid) TO service_role';
  END IF;
END
$$;

-- Exact duplicate indexes:
-- - events.short_code already has unique index from UNIQUE constraint
-- - juzs(khatm_id, juz_number) already has uq_juzs_khatm_juz_number unique index
DROP INDEX IF EXISTS public.events_short_code_idx;
DROP INDEX IF EXISTS public.juzs_khatm_juz_number_idx;

-- Cursor pagination + ordering index for public browse listing:
CREATE INDEX IF NOT EXISTS events_public_created_at_id_idx
  ON public.events (created_at DESC, id DESC)
  WHERE is_public = true
    AND is_archived = false;
