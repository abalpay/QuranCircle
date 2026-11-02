BEGIN;

SELECT plan(14);

INSERT INTO auth.users (id, aud, role, is_anonymous, created_at, updated_at)
VALUES
  ('89000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', true, now(), now()),
  ('89000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', true, now(), now()),
  ('89000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', false, now(), now());

-- Anonymous organizer A.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', true);

SELECT lives_ok(
  $$SELECT * FROM public.create_event_with_initial_khatm('Anon circle', 'desc', false, 'ANONORG01')$$,
  'anonymous user can create a circle'
);

SELECT is(
  (SELECT count(*)::int FROM public.list_my_circles_with_progress() WHERE short_code = 'ANONORG01' AND relation = 'creator'),
  1,
  'anonymous creator sees the circle in My Circles'
);

SELECT lives_ok(
  $$SELECT public.set_event_archive('ANONORG01', true)$$,
  'anonymous creator can archive own circle'
);

-- Another anonymous user is rejected.
SELECT set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}', true);

SELECT throws_ok(
  $$SELECT public.set_event_archive('ANONORG01', false)$$,
  'Unauthorized',
  'another anonymous user cannot archive the circle'
);

SELECT throws_ok(
  $$SELECT public.delete_event_by_shortcode('ANONORG01')$$,
  'Unauthorized',
  'another anonymous user cannot delete the circle'
);

-- Creator deletes own circle.
SELECT set_config('request.jwt.claims', '{"sub":"89000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}', true);

SELECT lives_ok(
  $$SELECT public.delete_event_by_shortcode('ANONORG01')$$,
  'anonymous creator can delete own circle'
);

-- Hourly create limit applies to anonymous users (10 per hour).
SELECT lives_ok(
  $$SELECT public.create_event_with_initial_khatm('Limit ' || g, '', false, 'ANONLIM' || g) FROM generate_series(1, 9) g$$,
  'anonymous user can create up to the hourly limit (10 total)'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_event_with_initial_khatm('Over', '', false, 'ANONOVER1')$$,
  'Too many requests. Please try again later.',
  'the 11th create in an hour is rate limited for anonymous users'
);

-- No session.
SELECT set_config('request.jwt.claims', '{}', true);

SELECT throws_ok(
  $$SELECT * FROM public.create_event_with_initial_khatm('No session', '', false, 'ANONNOSES')$$,
  'Sign in required to create a circle.',
  'no session cannot create'
);

RESET ROLE;

-- Raw anon role has no execute grant.
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM public.create_event_with_initial_khatm('Raw anon', '', false, 'ANONRAW01')$$,
  '42501',
  NULL,
  'raw anon role is denied create'
);
SELECT throws_ok(
  $$SELECT public.set_event_archive('ANONLIM1', true)$$,
  '42501',
  NULL,
  'raw anon role is denied archive'
);
RESET ROLE;

-- Merge moves ownership of an anonymous organizer's circle to the target account.
SELECT is(
  (public.merge_anonymous_identity_for_target(
    '89000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000003'
  ) ->> 'merged')::boolean,
  true,
  'merge reports success'
);

SELECT is(
  (SELECT count(*)::int FROM public.events
   WHERE short_code LIKE 'ANONLIM%' AND created_by = '89000000-0000-4000-8000-000000000003'),
  9,
  'merge moves the anonymous creator circles to the target account'
);

SELECT is(
  (SELECT count(*)::int FROM public.events
   WHERE short_code LIKE 'ANONLIM%' AND created_by = '89000000-0000-4000-8000-000000000001'),
  0,
  'the anonymous user no longer owns them'
);

SELECT * FROM finish();

ROLLBACK;
