BEGIN;

SELECT plan(7);

-- Baseline first: the database may hold other rows, so assert on deltas.
CREATE TEMP TABLE stats_before AS SELECT * FROM public.get_community_stats();

INSERT INTO auth.users (id, aud, role, is_anonymous, created_at, updated_at)
VALUES ('40000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', false, now(), now());

INSERT INTO public.events (id, name, is_public, is_archived, created_by, short_code)
VALUES ('40000000-0000-0000-0000-0000000000e1', 'stats circle', false, false, '40000000-0000-0000-0000-000000000001', 'STATTST01');

-- k1 completed (counts)   k2 completed but deleted (no)   k3 not completed (no)
-- k4 completed by organizer (counts)
INSERT INTO public.khatms (id, event_id, khatm_number, is_deleted, completed_at, completion_source)
VALUES
  ('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000e1', 1, false, now(), 'all_done'),
  ('41000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-0000000000e1', 2, true,  now(), 'all_done'),
  ('41000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-0000000000e1', 3, false, NULL, NULL),
  ('41000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-0000000000e1', 4, false, now(), 'organizer');

-- One claimed and one Done juz in k3; both count as juz claimed.
INSERT INTO public.juzs (khatm_id, juz_number, claimed_by_name, claimed_by_user_id, status, claimed_at)
VALUES ('41000000-0000-0000-0000-000000000003', 1, 'x', '40000000-0000-0000-0000-000000000001', 'claimed', now());
INSERT INTO public.juzs (khatm_id, juz_number, claimed_by_name, claimed_by_user_id, status, claimed_at, read_at)
VALUES ('41000000-0000-0000-0000-000000000003', 2, 'x', '40000000-0000-0000-0000-000000000001', 'read', now(), now());

CREATE TEMP TABLE stats_after AS SELECT * FROM public.get_community_stats();

SELECT is(
  (SELECT khatms_completed FROM stats_after) - (SELECT khatms_completed FROM stats_before),
  2::bigint, 'counts completed khatms, ignoring deleted and not-yet-completed ones'
);
SELECT is(
  (SELECT total_juz_claimed FROM stats_after) - (SELECT total_juz_claimed FROM stats_before),
  2::bigint, 'juz claimed still counts claimed and Done juz'
);
SELECT is(
  (SELECT total_circles FROM stats_after) - (SELECT total_circles FROM stats_before),
  1::bigint, 'total circles still counts the new circle'
);

SELECT has_column('public', 'khatms', 'completed_at', 'khatms.completed_at exists');
SELECT is(
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'get_community_stats'
     AND 'active_khatms' = ANY (p.proargnames)),
  0::bigint, 'the active_khatms column is gone'
);
SELECT ok(has_function_privilege('anon', 'public.get_community_stats()', 'EXECUTE'), 'anon can execute get_community_stats');
SELECT ok(has_function_privilege('authenticated', 'public.get_community_stats()', 'EXECUTE'), 'authenticated can execute get_community_stats');

SELECT * FROM finish();
ROLLBACK;
