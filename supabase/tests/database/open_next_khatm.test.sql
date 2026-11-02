BEGIN;

SELECT plan(41);

-- Users: C creator, A anonymous creator, R reader, X other user.
INSERT INTO auth.users (id, aud, role, is_anonymous, created_at, updated_at)
VALUES
  ('82000000-0000-4000-8000-00000000000c', 'authenticated', 'authenticated', false, now(), now()),
  ('82000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', true, now(), now()),
  ('82000000-0000-4000-8000-00000000000d', 'authenticated', 'authenticated', false, now(), now()),
  ('82000000-0000-4000-8000-00000000000e', 'authenticated', 'authenticated', false, now(), now());

INSERT INTO public.events (id, name, is_public, is_archived, created_by, short_code)
VALUES
  ('82100000-0000-4000-8000-000000000001', 'Switch flow', false, false, '82000000-0000-4000-8000-00000000000c', 'OPENEV01'),
  ('82100000-0000-4000-8000-000000000002', 'Default on', false, false, '82000000-0000-4000-8000-00000000000c', 'OPENEV02'),
  ('82100000-0000-4000-8000-000000000003', 'Trailing has a Done juz', false, false, '82000000-0000-4000-8000-00000000000c', 'OPENEV03'),
  ('82100000-0000-4000-8000-000000000004', 'Trailing has a claimed juz', false, false, '82000000-0000-4000-8000-00000000000c', 'OPENEV04'),
  ('82100000-0000-4000-8000-000000000005', 'Only khatm', false, false, '82000000-0000-4000-8000-00000000000c', 'OPENEV05'),
  ('82100000-0000-4000-8000-000000000006', 'Anonymous organizer', false, false, '82000000-0000-4000-8000-00000000000a', 'OPENEV06'),
  ('82100000-0000-4000-8000-000000000007', 'Archived', false, true, '82000000-0000-4000-8000-00000000000c', 'OPENARCH'),
  ('82100000-0000-4000-8000-000000000008', 'Rejection target', false, false, '82000000-0000-4000-8000-00000000000c', 'OPENEV08');

-- n_claimed Juz (1..n) are claimed by R; the rest are unclaimed.
CREATE TEMP TABLE fx (khatm_id uuid, event_id uuid, num int, n_claimed int);
INSERT INTO fx VALUES
  ('82200000-0000-4000-8000-000000000011', '82100000-0000-4000-8000-000000000001', 1, 29),
  ('82200000-0000-4000-8000-000000000021', '82100000-0000-4000-8000-000000000002', 1, 29),
  ('82200000-0000-4000-8000-000000000031', '82100000-0000-4000-8000-000000000003', 1, 30),
  ('82200000-0000-4000-8000-000000000032', '82100000-0000-4000-8000-000000000003', 2, 1),
  ('82200000-0000-4000-8000-000000000041', '82100000-0000-4000-8000-000000000004', 1, 30),
  ('82200000-0000-4000-8000-000000000042', '82100000-0000-4000-8000-000000000004', 2, 1),
  ('82200000-0000-4000-8000-000000000051', '82100000-0000-4000-8000-000000000005', 1, 0),
  ('82200000-0000-4000-8000-000000000061', '82100000-0000-4000-8000-000000000006', 1, 0),
  ('82200000-0000-4000-8000-000000000062', '82100000-0000-4000-8000-000000000006', 2, 0),
  ('82200000-0000-4000-8000-000000000071', '82100000-0000-4000-8000-000000000007', 1, 30),
  ('82200000-0000-4000-8000-000000000072', '82100000-0000-4000-8000-000000000007', 2, 0),
  ('82200000-0000-4000-8000-000000000081', '82100000-0000-4000-8000-000000000008', 1, 30),
  ('82200000-0000-4000-8000-000000000082', '82100000-0000-4000-8000-000000000008', 2, 0);

INSERT INTO public.khatms (id, event_id, khatm_number)
SELECT khatm_id, event_id, num FROM fx;

INSERT INTO public.juzs (khatm_id, juz_number, claimed_by_name, claimed_by_user_id, status, claimed_at)
SELECT fx.khatm_id, g,
       CASE WHEN g <= fx.n_claimed THEN 'Reader' END,
       CASE WHEN g <= fx.n_claimed THEN '82000000-0000-4000-8000-00000000000d'::uuid END,
       CASE WHEN g <= fx.n_claimed THEN 'claimed' ELSE 'unclaimed' END,
       CASE WHEN g <= fx.n_claimed THEN now() END
FROM fx, generate_series(1, 30) g;

-- OPENEV03's trailing khatm holds a Done juz.
UPDATE public.juzs SET status = 'read', read_at = now()
WHERE khatm_id = '82200000-0000-4000-8000-000000000032' AND juz_number = 1;

-- Default and rejections.
SELECT is(
  (SELECT open_next_khatm FROM public.events WHERE short_code = 'OPENEV02'),
  true, 'open_next_khatm defaults to on'
);

SELECT set_config('request.jwt.claims', '', true);
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('OPENEV01', false)$$,
  'Active session required', 'no session is rejected'
);
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000e","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('OPENEV08', false)$$,
  'Unauthorized', 'a non-creator is rejected'
);
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('OPENEV08', false)$$,
  'Unauthorized', 'a reader who is not the creator is rejected'
);
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000a","role":"authenticated","is_anonymous":true}', true);
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('OPENEV08', false)$$,
  'Unauthorized', 'an anonymous non-creator is rejected'
);
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000c","role":"authenticated","is_anonymous":false}', true);
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('NOSUCHEV1', false)$$,
  'Event not found', 'an unknown circle is rejected'
);
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('OPENEV01', NULL)$$,
  'Invalid input', 'a NULL switch value is rejected'
);
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('OPENARCH', false)$$,
  'This Khatim is archived', 'an archived circle is rejected'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000007'),
  2, 'the archived circle keeps its khatms'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000008'),
  2, 'rejected non-creators leave the empty trailing khatm in place'
);
SELECT is(
  (SELECT open_next_khatm FROM public.events WHERE short_code = 'OPENEV08'),
  true, 'rejected non-creators leave the setting unchanged'
);

-- Off: the last claim opens no khatm.
SELECT is(
  public.set_open_next_khatm('OPENEV01', false)->>'open_next_khatm',
  'false', 'the creator switches it off'
);
SELECT is(
  public.get_event_snapshot_by_shortcode('OPENEV01')->>'open_next_khatm',
  'false', 'the snapshot returns the setting'
);
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT is(
  public.claim_juz_batch('OPENEV01', '82200000-0000-4000-8000-000000000011', ARRAY[30], 'Reader')->>'new_khatm_created',
  'false', 'with the switch off, claiming the last Juz opens no khatm'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000001'),
  1, 'the circle still has one khatm'
);

-- On with a full latest khatm opens the next one.
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000c","role":"authenticated","is_anonymous":false}', true);
SELECT is(
  public.set_open_next_khatm('OPENEV01', true)->>'opened_khatm',
  'true', 'switching on with a full latest khatm opens the next'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000001'),
  2, 'the circle now has two khatms'
);
SELECT is(
  (SELECT count(*)::int FROM public.juzs j JOIN public.khatms k ON k.id = j.khatm_id
   WHERE k.event_id = '82100000-0000-4000-8000-000000000001' AND k.khatm_number = 2 AND j.status = 'unclaimed'),
  30, 'the new khatm has 30 unclaimed Juz'
);
SELECT is(
  public.get_event_snapshot_by_shortcode('OPENEV01')->>'open_next_khatm',
  'true', 'the snapshot returns the setting on'
);
SELECT is(
  public.set_open_next_khatm('OPENEV01', true)->>'opened_khatm',
  'false', 'switching on again does not open another khatm'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000001'),
  2, 'still two khatms'
);

-- Off removes the empty trailing khatm, and only that.
SELECT is(
  public.set_open_next_khatm('OPENEV01', false)->>'removed_khatm',
  'true', 'switching off removes the empty trailing khatm'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000001'),
  1, 'one khatm remains'
);
SELECT is(
  (SELECT count(*)::int FROM public.juzs WHERE khatm_id = '82200000-0000-4000-8000-000000000011' AND status = 'claimed'),
  30, 'the claimed khatm keeps its 30 claims'
);
SELECT is(
  public.set_open_next_khatm('OPENEV01', false)->>'removed_khatm',
  'false', 'switching off again never removes the only khatm'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000001'),
  1, 'the only khatm stays'
);

-- On (default): the last claim opens the next khatm.
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT is(
  public.claim_juz_batch('OPENEV02', '82200000-0000-4000-8000-000000000021', ARRAY[30], 'Reader')->>'new_khatm_created',
  'true', 'with the switch on, claiming the last Juz opens the next khatm'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000002'),
  2, 'the circle has two khatms'
);

-- Off never removes a trailing khatm that has a claim or a Done juz.
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000c","role":"authenticated","is_anonymous":false}', true);
SELECT is(
  public.set_open_next_khatm('OPENEV03', false)->>'removed_khatm',
  'false', 'a trailing khatm with a Done juz is kept'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000003'),
  2, 'both khatms remain (Done juz)'
);
SELECT is(
  public.set_open_next_khatm('OPENEV04', false)->>'removed_khatm',
  'false', 'a trailing khatm with a claimed juz is kept'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000004'),
  2, 'both khatms remain (claimed juz)'
);
SELECT is(
  public.set_open_next_khatm('OPENEV05', false)->>'removed_khatm',
  'false', 'an empty only khatm is kept'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000005'),
  1, 'the only khatm remains'
);

-- An anonymous organizer can use the switch on their own circle.
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-00000000000a","role":"authenticated","is_anonymous":true}', true);
SELECT is(
  public.set_open_next_khatm('OPENEV06', false)->>'removed_khatm',
  'true', 'an anonymous creator can switch off and remove the empty trailing khatm'
);
SELECT is(
  (SELECT count(*)::int FROM public.khatms WHERE event_id = '82100000-0000-4000-8000-000000000006'),
  1, 'the anonymous creator circle has one khatm'
);
SELECT is(
  (SELECT open_next_khatm FROM public.events WHERE short_code = 'OPENEV06'),
  false, 'the anonymous creator setting is saved'
);

-- Grants: authenticated and service_role only.
SELECT is(
  has_function_privilege('anon', 'public.set_open_next_khatm(text,boolean)', 'EXECUTE'),
  false, 'anon has no execute grant'
);
SELECT is(
  has_function_privilege('authenticated', 'public.set_open_next_khatm(text,boolean)', 'EXECUTE'),
  true, 'authenticated has execute'
);
SELECT is(
  has_function_privilege('service_role', 'public.set_open_next_khatm(text,boolean)', 'EXECUTE'),
  true, 'service_role has execute'
);
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT public.set_open_next_khatm('OPENEV01', false)$$,
  '42501', NULL, 'raw anon role is denied'
);
RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
