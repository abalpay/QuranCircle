BEGIN;

SELECT plan(19);

INSERT INTO auth.users (id, aud, role, is_anonymous, created_at, updated_at)
VALUES
  ('d0000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', false, now(), now()),
  ('d0000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', false, now(), now());

-- Creator C owns every circle; R holds the claims.
INSERT INTO public.events (id, name, is_public, is_archived, created_by, short_code)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Ready circle',    false, false, 'd0000000-0000-0000-0000-00000000000c', 'RDYEV001'),
  ('e0000000-0000-0000-0000-000000000002', 'Archived circle', false, true,  'd0000000-0000-0000-0000-00000000000c', 'RDYEV002'),
  ('e0000000-0000-0000-0000-000000000003', 'Partial circle',  false, false, 'd0000000-0000-0000-0000-00000000000c', 'RDYEV003'),
  ('e0000000-0000-0000-0000-000000000004', 'Done circle',     false, false, 'd0000000-0000-0000-0000-00000000000c', 'RDYEV004'),
  ('e0000000-0000-0000-0000-000000000005', 'Short circle',    false, false, 'd0000000-0000-0000-0000-00000000000c', 'RDYEV005'),
  ('e0000000-0000-0000-0000-000000000006', 'Deleted khatm',   false, false, 'd0000000-0000-0000-0000-00000000000c', 'RDYEV006');

-- k1 ready: 30 claimed, latest claim 2 days ago.    k2 archived circle, 30 claimed.
-- k3 29 claimed + 1 unclaimed.                       k3b empty khatm (30 unclaimed).
-- k4 30 claimed, completed.                          k5 only 29 Juz rows, all claimed.
-- k6 30 claimed but soft-deleted.
CREATE TEMP TABLE fx (khatm_id uuid, event_id uuid, num int, n_juz int, n_claimed int);
INSERT INTO fx VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 1, 30, 30),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 1, 30, 30),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 1, 30, 29),
  ('f0000000-0000-0000-0000-00000000003b', 'e0000000-0000-0000-0000-000000000003', 2, 30, 0),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 1, 30, 30),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 1, 29, 29),
  ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006', 1, 30, 30);

INSERT INTO public.khatms (id, event_id, khatm_number)
SELECT khatm_id, event_id, num FROM fx;
UPDATE public.khatms SET is_deleted = true WHERE id = 'f0000000-0000-0000-0000-000000000006';

-- Claim times differ per Juz so "latest" is a real maximum (Juz 1 is the newest, 2 days ago).
INSERT INTO public.juzs (khatm_id, juz_number, claimed_by_name, claimed_by_user_id, status, claimed_at)
SELECT fx.khatm_id, g, 'Reader', 'd0000000-0000-0000-0000-00000000000d', 'claimed',
       now() - interval '2 days' - (g - 1) * interval '1 hour'
FROM fx, generate_series(1, fx.n_claimed) g;

INSERT INTO public.juzs (khatm_id, juz_number)
SELECT fx.khatm_id, g
FROM fx, generate_series(fx.n_claimed + 1, fx.n_juz) g;

UPDATE public.khatms
SET completed_at = now(), completion_source = 'organizer'
WHERE id = 'f0000000-0000-0000-0000-000000000004';

-- Grants are unchanged: the snapshot is public, My Circles is signed-in only.
SELECT ok(has_function_privilege('anon', 'public.get_event_snapshot_by_shortcode(text,integer,integer)', 'EXECUTE'), 'anon can still read the snapshot');
SELECT ok(has_function_privilege('authenticated', 'public.get_event_snapshot_by_shortcode(text,integer,integer)', 'EXECUTE'), 'authenticated can read the snapshot');
SELECT ok(NOT has_function_privilege('anon', 'public.list_my_circles_with_progress()', 'EXECUTE'), 'anon cannot list My Circles');
SELECT ok(has_function_privilege('authenticated', 'public.list_my_circles_with_progress()', 'EXECUTE'), 'authenticated can list My Circles');
SELECT ok(has_function_privilege('service_role', 'public.list_my_circles_with_progress()', 'EXECUTE'), 'service_role can list My Circles');
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p, aclexplode(p.proacl) a
    WHERE p.oid = 'public.list_my_circles_with_progress()'::regprocedure AND a.grantee = 0
  ),
  'PUBLIC has no grant on list_my_circles_with_progress'
);

-- The creator sees last_claimed_at and has_khatm_ready_to_complete.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-00000000000c","role":"authenticated","is_anonymous":false}', true);

SELECT is(
  (public.get_event_snapshot_by_shortcode('RDYEV001')->'khatms'->0->>'last_claimed_at')::timestamptz,
  now() - interval '2 days',
  'creator: last_claimed_at is the latest claim of the khatm (Juz 1, 2 days ago; the rest are older)'
);
SELECT is(
  (public.get_event_snapshot_by_shortcode('RDYEV003')->'khatms'->0->>'last_claimed_at')::timestamptz,
  now() - interval '2 days',
  'creator: unclaimed Juz do not count toward last_claimed_at'
);
SELECT is(
  public.get_event_snapshot_by_shortcode('RDYEV003')->'khatms'->1->'last_claimed_at',
  'null'::jsonb,
  'creator: last_claimed_at is null for an empty khatm'
);

SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV001'), true, 'fully claimed, open khatm is ready to complete');
SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV003'), false, 'a khatm with an unclaimed Juz is not ready');
SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV004'), false, 'a completed khatm is not ready');
SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV002'), false, 'an archived circle is not ready');
SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV005'), false, 'a khatm without 30 Juz rows is not ready');
SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV006'), false, 'a deleted khatm is not ready');

-- Everyone else gets null: a reader, then an anonymous visitor.
SELECT set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-00000000000d","role":"authenticated","is_anonymous":false}', true);
SELECT is(
  public.get_event_snapshot_by_shortcode('RDYEV001')->'khatms'->0->'last_claimed_at',
  'null'::jsonb,
  'a non-creator reader gets a null last_claimed_at'
);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '', true);
SELECT is(
  public.get_event_snapshot_by_shortcode('RDYEV001')->'khatms'->0->'last_claimed_at',
  'null'::jsonb,
  'an anonymous visitor gets a null last_claimed_at'
);

RESET ROLE;
UPDATE public.khatms SET completed_at = now(), completion_source = 'organizer'
WHERE id = 'f0000000-0000-0000-0000-000000000001';
UPDATE public.events SET is_archived = false WHERE id = 'e0000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-00000000000c","role":"authenticated","is_anonymous":false}', true);

SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV001'), false, 'false once the khatm is completed');
SELECT is((SELECT has_khatm_ready_to_complete FROM public.list_my_circles_with_progress() WHERE short_code = 'RDYEV002'), true, 'unarchiving makes the full khatm ready again');

SELECT * FROM finish();
ROLLBACK;
