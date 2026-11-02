BEGIN;

SELECT plan(45);

-- Users: C creator, R reader (owns every Juz), A anonymous creator, X other user.
INSERT INTO auth.users (id, aud, role, is_anonymous, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', false, now(), now()),
  ('a0000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', false, now(), now()),
  ('a0000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', true, now(), now()),
  ('a0000000-0000-0000-0000-00000000000e', 'authenticated', 'authenticated', false, now(), now());

INSERT INTO public.events (id, name, is_public, is_archived, created_by, short_code)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Completion circle', false, false, 'a0000000-0000-0000-0000-00000000000c', 'CMPLEV01'),
  ('b0000000-0000-0000-0000-000000000002', 'Anonymous organizer circle', false, false, 'a0000000-0000-0000-0000-00000000000a', 'CMPLEV02'),
  ('b0000000-0000-0000-0000-000000000003', 'Archived circle', false, true, 'a0000000-0000-0000-0000-00000000000c', 'CMPLARCH');

-- k1: last Juz still to be marked Done        k2: fully claimed, now (organizer path)
-- k3: 29 claimed + 1 unclaimed, 8 days old    k5: fully claimed, last claim 8 days ago
-- k6: fully claimed, last claim 6 days ago    k7: archived event, 8 days old
-- k8: soft-deleted, 8 days old                k9: only 29 Juz rows, 8 days old
-- k10: anonymous organizer, fully claimed
CREATE TEMP TABLE fx (khatm_id uuid, event_id uuid, num int, n_juz int, age interval, is_deleted boolean);
INSERT INTO fx VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 30, interval '0', false),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 2, 30, interval '0', false),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 3, 29, interval '8 days', false),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 5, 30, interval '8 days', false),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 6, 30, interval '6 days', false),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 1, 30, interval '8 days', false),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 8, 30, interval '8 days', true),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 9, 29, interval '8 days', false),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 1, 30, interval '0', false);

INSERT INTO public.khatms (id, event_id, khatm_number, is_deleted)
SELECT khatm_id, event_id, num, is_deleted FROM fx;

-- Juz 30 carries the latest claim; the others were claimed one day earlier.
INSERT INTO public.juzs (khatm_id, juz_number, claimed_by_name, claimed_by_user_id, status, claimed_at)
SELECT fx.khatm_id, g, 'Reader', 'a0000000-0000-0000-0000-00000000000d', 'claimed',
       now() - fx.age - CASE WHEN g = fx.n_juz THEN interval '0' ELSE interval '1 day' END
FROM fx, generate_series(1, fx.n_juz) g;

INSERT INTO public.juzs (khatm_id, juz_number)
VALUES ('c0000000-0000-0000-0000-000000000003', 30);

UPDATE public.juzs SET status = 'read', read_at = now()
WHERE khatm_id = 'c0000000-0000-0000-0000-000000000001' AND juz_number < 30;

-- Constraints.
SELECT throws_ok(
  $$UPDATE public.khatms SET completed_at = now() WHERE id = 'c0000000-0000-0000-0000-000000000006'$$,
  '23514', NULL, 'completed_at requires a completion_source'
);
SELECT throws_ok(
  $$UPDATE public.khatms SET completion_source = 'auto' WHERE id = 'c0000000-0000-0000-0000-000000000006'$$,
  '23514', NULL, 'completion_source requires completed_at'
);
SELECT throws_ok(
  $$UPDATE public.khatms SET completed_at = now(), completion_source = 'bogus' WHERE id = 'c0000000-0000-0000-0000-000000000006'$$,
  '23514', NULL, 'completion_source only accepts known values'
);

-- All Juz Done completes the khatm as all_done (reader R).
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT is(
  public.mark_juz_read_with_completion('CMPLEV01', (SELECT id FROM public.juzs WHERE khatm_id = 'c0000000-0000-0000-0000-000000000001' AND juz_number = 30))->>'newly_completed',
  'true', 'marking the last Juz Done completes the khatm'
);
SELECT is(
  (SELECT completion_source FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000001'),
  'all_done', 'Done completion records all_done'
);

-- complete_khatm rejections.
SELECT set_config('request.jwt.claims', '', true);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000002')$$,
  'Active session required', 'complete_khatm needs a session'
);
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000e","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000002')$$,
  'Unauthorized', 'complete_khatm rejects a non-creator'
);
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000002')$$,
  'Unauthorized', 'complete_khatm rejects a reader who is not the creator'
);
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000c","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000003')$$,
  'All 30 Juz must be claimed before completing', 'complete_khatm rejects a khatm with an unclaimed Juz'
);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000009')$$,
  'All 30 Juz must be claimed before completing', 'complete_khatm rejects a khatm with fewer than 30 Juz rows'
);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLARCH', 'c0000000-0000-0000-0000-000000000007')$$,
  'This Khatim is archived', 'complete_khatm rejects an archived circle'
);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000008')$$,
  'Khatm not found', 'complete_khatm rejects a deleted khatm'
);
SELECT throws_ok(
  $$SELECT public.complete_khatm('CMPLEV02', 'c0000000-0000-0000-0000-000000000002')$$,
  'Khatm not found', 'complete_khatm rejects a khatm from another circle'
);

-- Organizer completion.
SELECT is(
  public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000002')->>'newly_completed',
  'true', 'creator completes a fully claimed khatm'
);
SELECT is(
  (SELECT completion_source FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000002'),
  'organizer', 'organizer completion records organizer'
);
CREATE TEMP TABLE organizer_stamp AS
  SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000002';
SELECT is(
  public.complete_khatm('CMPLEV01', 'c0000000-0000-0000-0000-000000000002')->>'newly_completed',
  'false', 'completing twice is a no-op'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000002'),
  (SELECT completed_at FROM organizer_stamp), 'completing twice keeps completed_at'
);

-- An anonymous organizer can complete their own khatm.
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated","is_anonymous":true}', true);
SELECT is(
  public.complete_khatm('CMPLEV02', 'c0000000-0000-0000-0000-000000000010')->>'newly_completed',
  'true', 'complete_khatm does not require a non-anonymous user'
);

-- Completed khatms are final: no unclaim, no claim, Done/undo still work.
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  format($$SELECT public.unclaim_juz('CMPLEV01', %L)$$, (SELECT id FROM public.juzs WHERE khatm_id = 'c0000000-0000-0000-0000-000000000002' AND juz_number = 1)),
  'This khatm is completed', 'reader cannot unclaim in a completed khatm'
);
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000c","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  format($$SELECT public.unclaim_juz('CMPLEV01', %L)$$, (SELECT id FROM public.juzs WHERE khatm_id = 'c0000000-0000-0000-0000-000000000002' AND juz_number = 1)),
  'This khatm is completed', 'creator cannot unclaim in a completed khatm'
);
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT lives_ok(
  format($$SELECT public.mark_juz_read_with_completion('CMPLEV01', %L)$$, (SELECT id FROM public.juzs WHERE khatm_id = 'c0000000-0000-0000-0000-000000000002' AND juz_number = 1)),
  'Done is still allowed in a completed khatm'
);
SELECT lives_ok(
  format($$SELECT public.unmark_juz_read('CMPLEV01', %L)$$, (SELECT id FROM public.juzs WHERE khatm_id = 'c0000000-0000-0000-0000-000000000002' AND juz_number = 1)),
  'undo is still allowed in a completed khatm'
);
SELECT is(
  (SELECT completion_source FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000002'),
  'organizer', 'Done/undo leaves completion_source unchanged'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000002'),
  (SELECT completed_at FROM organizer_stamp), 'Done/undo leaves completed_at unchanged'
);

-- A hole in a completed khatm (for example after account deletion) cannot be claimed.
UPDATE public.juzs
SET status = 'unclaimed', claimed_by_name = NULL, claimed_by_user_id = NULL, claimed_at = NULL, read_at = NULL
WHERE khatm_id = 'c0000000-0000-0000-0000-000000000002' AND juz_number = 5;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000e","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  $$SELECT public.claim_juz_batch('CMPLEV01', 'c0000000-0000-0000-0000-000000000002', ARRAY[5], 'Late reader')$$,
  'This khatm is completed', 'claim_juz_batch rejects a completed khatm'
);

-- Incomplete khatms keep working.
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT lives_ok(
  format($$SELECT public.unclaim_juz('CMPLEV01', %L)$$, (SELECT id FROM public.juzs WHERE khatm_id = 'c0000000-0000-0000-0000-000000000003' AND juz_number = 1)),
  'unclaim still works in an incomplete khatm'
);
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000e","role":"authenticated","is_anonymous":false}', true);
SELECT lives_ok(
  $$SELECT public.claim_juz_batch('CMPLEV01', 'c0000000-0000-0000-0000-000000000003', ARRAY[1], 'New reader')$$,
  'claim still works in an incomplete khatm'
);

-- Snapshot exposes completion fields per khatm.
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000e","role":"authenticated","is_anonymous":false}', true);
CREATE TEMP TABLE snap AS
  SELECT public.get_event_snapshot_by_shortcode('CMPLEV01', 20) AS j;
SELECT is(
  (SELECT k->>'completion_source' FROM snap, jsonb_array_elements(j->'khatms') k WHERE k->>'id' = 'c0000000-0000-0000-0000-000000000002'),
  'organizer', 'snapshot returns completion_source'
);
SELECT isnt(
  (SELECT k->>'completed_at' FROM snap, jsonb_array_elements(j->'khatms') k WHERE k->>'id' = 'c0000000-0000-0000-0000-000000000002'),
  NULL, 'snapshot returns completed_at'
);
SELECT is(
  (SELECT k->'completed_at' FROM snap, jsonb_array_elements(j->'khatms') k WHERE k->>'id' = 'c0000000-0000-0000-0000-000000000003'),
  'null'::jsonb, 'snapshot returns null completed_at for an open khatm'
);

-- Auto-complete.
SELECT cmp_ok(private.auto_complete_khatms(), '>=', 1, 'auto-complete completes at least the eligible khatm');
SELECT is(
  (SELECT completion_source FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000005'),
  'auto', '8 days after the last claim completes as auto'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000005'),
  now() - interval '1 day', 'auto completed_at is the last claim plus 7 days'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000006'),
  NULL, '6 days after the last claim is not completed'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000003'),
  NULL, 'a khatm with an unclaimed Juz is not auto-completed'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000009'),
  NULL, 'a khatm with fewer than 30 Juz rows is not auto-completed'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000007'),
  NULL, 'a khatm in an archived circle is not auto-completed'
);
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000008'),
  NULL, 'a deleted khatm is not auto-completed'
);
SELECT is(private.auto_complete_khatms(), 0, 'auto-complete is idempotent');
SELECT is(
  (SELECT completed_at FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000005'),
  now() - interval '1 day', 'a second run keeps completed_at'
);
SELECT is(
  (SELECT completion_source FROM public.khatms WHERE id = 'c0000000-0000-0000-0000-000000000002'),
  'organizer', 'auto-complete leaves other completions alone'
);

-- Grants.
SELECT ok(
  has_function_privilege('authenticated', 'public.complete_khatm(text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.complete_khatm(text,uuid)', 'EXECUTE'),
  'complete_khatm is callable by authenticated but not raw anon'
);
SELECT ok(
  NOT has_function_privilege('anon', 'private.auto_complete_khatms()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'private.auto_complete_khatms()', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'private.auto_complete_khatms()', 'EXECUTE'),
  'client roles cannot execute auto_complete_khatms'
);

-- Cron job exists but is inactive.
SELECT is(
  (SELECT count(*)::integer FROM cron.job WHERE jobname = 'qurancircle-auto-complete-khatms'),
  1, 'auto-complete cron job exists'
);
SELECT is(
  (SELECT active FROM cron.job WHERE jobname = 'qurancircle-auto-complete-khatms'),
  false, 'auto-complete cron job is inactive until approved'
);

SELECT * FROM finish();

ROLLBACK;
