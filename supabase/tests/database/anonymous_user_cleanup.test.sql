BEGIN;

SELECT plan(27);

INSERT INTO auth.users (
  id,
  aud,
  role,
  is_anonymous,
  created_at,
  updated_at
)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', true, now() - interval '5 days', now() - interval '5 days'),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', false, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days'),
  ('10000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', true, now() - interval '45 days', now() - interval '45 days');

INSERT INTO public.events (
  id,
  name,
  is_public,
  created_by,
  short_code
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Anonymous cleanup test circle',
  false,
  '10000000-0000-0000-0000-000000000004',
  'CLNUPTST1'
);

INSERT INTO public.khatms (
  id,
  event_id,
  khatm_number
)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  1
);

INSERT INTO public.juzs (
  id,
  khatm_id,
  juz_number,
  claimed_by_name,
  claimed_by_user_id,
  status,
  claimed_at
)
VALUES (
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000002',
  1,
  'Cleanup claim owner',
  '10000000-0000-0000-0000-000000000005',
  'claimed',
  now() - interval '40 days'
);

INSERT INTO public.event_members (
  event_id,
  user_id,
  role
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000006',
  'participant'
);

INSERT INTO public.bookmarks (
  event_id,
  user_id
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000007'
);

INSERT INTO auth.sessions (
  id,
  user_id,
  created_at,
  updated_at,
  refreshed_at
)
VALUES
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000008',
    now() - interval '45 days',
    now() - interval '45 days',
    (now() - interval '1 day')::timestamp
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000013',
    now() - interval '45 days',
    now() - interval '45 days',
    (now() - interval '45 days')::timestamp
  );

INSERT INTO storage.buckets (id, name, owner, owner_id)
VALUES
  ('anonymous-cleanup-test', 'anonymous-cleanup-test', NULL, NULL),
  (
    'anonymous-cleanup-owned-bucket',
    'anonymous-cleanup-owned-bucket',
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000010'
  ),
  (
    'anonymous-cleanup-multipart',
    'anonymous-cleanup-multipart',
    NULL,
    NULL
  );

INSERT INTO storage.objects (
  id,
  bucket_id,
  name,
  owner,
  owner_id
)
VALUES (
  '20000000-0000-0000-0000-000000000004',
  'anonymous-cleanup-test',
  'owned-object.txt',
  '10000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000009'
);

INSERT INTO storage.s3_multipart_uploads (
  id,
  upload_signature,
  bucket_id,
  key,
  version,
  owner_id
)
VALUES (
  'anonymous-cleanup-upload',
  'test-signature',
  'anonymous-cleanup-multipart',
  'multipart-object.txt',
  'test-version',
  '10000000-0000-0000-0000-000000000011'
);

INSERT INTO storage.s3_multipart_uploads_parts (
  id,
  upload_id,
  part_number,
  bucket_id,
  key,
  etag,
  owner_id,
  version
)
VALUES (
  '20000000-0000-0000-0000-000000000006',
  'anonymous-cleanup-upload',
  1,
  'anonymous-cleanup-multipart',
  'multipart-object.txt',
  'test-etag',
  '10000000-0000-0000-0000-000000000012',
  'test-version'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM cron.job
    WHERE jobname = 'qurancircle-cleanup-unreferenced-anonymous-users'
  ),
  1,
  'exactly one anonymous cleanup cron job is scheduled'
);

SELECT is(
  current_setting('cron.use_background_workers'),
  'off',
  'anonymous cleanup uses connection mode so its cron timeout is enforced'
);

SELECT ok(
  current_setting('cron.timezone') IN ('GMT', 'UTC', 'Etc/UTC'),
  'anonymous cleanup cron timezone is UTC-compatible'
);

SELECT is(
  (
    SELECT schedule
    FROM cron.job
    WHERE jobname = 'qurancircle-cleanup-unreferenced-anonymous-users'
  ),
  '30 3 * * 0',
  'anonymous cleanup runs weekly at 03:30 UTC on Sunday'
);

SELECT ok(
  NOT (
    SELECT active
    FROM cron.job
    WHERE jobname = 'qurancircle-cleanup-unreferenced-anonymous-users'
  ),
  'anonymous cleanup cron job is inactive until explicitly approved'
);

SELECT ok(
  (
    SELECT
      command LIKE '%SET statement_timeout = ''30s'';%'
      AND command LIKE '%SET lock_timeout = ''5s'';%'
    FROM cron.job
    WHERE jobname = 'qurancircle-cleanup-unreferenced-anonymous-users'
  ),
  'anonymous cleanup cron command enforces statement and lock timeouts'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'private.cleanup_unreferenced_anonymous_users(interval,integer)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'private.cleanup_unreferenced_anonymous_users(interval,integer)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'service_role',
    'private.cleanup_unreferenced_anonymous_users(interval,integer)',
    'EXECUTE'
  ),
  'client and service roles cannot invoke the private cleanup function'
);

SELECT ok(
  position(
    'SELECT COALESCE(array_agg(candidate.id), ARRAY[]::UUID[])' IN
    pg_get_functiondef(
      'private.cleanup_unreferenced_anonymous_users(interval,integer)'::regprocedure
    )
  ) > 0
  AND position(
    'SELECT COALESCE(array_agg(candidate.id), ARRAY[]::UUID[])' IN
    pg_get_functiondef(
      'private.cleanup_unreferenced_anonymous_users(interval,integer)'::regprocedure
    )
  ) < position(
    'LOCK TABLE' IN
    pg_get_functiondef(
      'private.cleanup_unreferenced_anonymous_users(interval,integer)'::regprocedure
    )
  )
  AND pg_get_functiondef(
    'private.cleanup_unreferenced_anonymous_users(interval,integer)'::regprocedure
  ) LIKE '%IN SHARE ROW EXCLUSIVE MODE NOWAIT%',
  'cleanup discovers candidates before taking fail-fast Storage locks'
);

SELECT throws_ok(
  $$
    SELECT private.cleanup_unreferenced_anonymous_users(NULL, 1000)
  $$,
  'P0001',
  'Retention must be at least one day',
  'cleanup rejects a NULL retention before selecting candidates'
);

SELECT throws_ok(
  $$
    SELECT private.cleanup_unreferenced_anonymous_users(
      interval '30 days',
      NULL
    )
  $$,
  'P0001',
  'Batch limit must be between 1 and 1000',
  'cleanup rejects a NULL batch limit before selecting candidates'
);

SELECT is(
  private.cleanup_unreferenced_anonymous_users(interval '30 days', 1000),
  2,
  'cleanup deletes old unreferenced anonymous users without recent sessions'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000001'),
  0,
  'old unreferenced anonymous user is deleted'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000002'),
  1,
  'recent anonymous user is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000003'),
  1,
  'permanent user is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000004'),
  1,
  'anonymous event owner is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000005'),
  1,
  'anonymous Juz claimant is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000006'),
  1,
  'anonymous event member is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000007'),
  1,
  'anonymous bookmark owner is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000008'),
  1,
  'anonymous user with a recently refreshed session is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000009'),
  1,
  'anonymous Storage object owner is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000010'),
  1,
  'anonymous Storage bucket owner is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000011'),
  1,
  'anonymous multipart upload owner is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000012'),
  1,
  'anonymous multipart upload part owner is preserved'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000013'),
  0,
  'an old anonymous user with only a stale session is deleted'
);

SELECT is(
  (SELECT count(*)::integer FROM auth.sessions WHERE id = '20000000-0000-0000-0000-000000000007'),
  0,
  'the deleted anonymous user stale session cascades'
);

SELECT is(
  (SELECT count(*)::integer FROM private.anonymous_user_cleanup_runs),
  1,
  'cleanup records one aggregate maintenance run'
);

SELECT is(
  (
    SELECT deleted_count
    FROM private.anonymous_user_cleanup_runs
    ORDER BY id DESC
    LIMIT 1
  ),
  2,
  'maintenance run records the deleted user count without identities'
);

SELECT * FROM finish();

ROLLBACK;
