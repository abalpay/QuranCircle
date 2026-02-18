-- Optional seed data for local development
-- Add test data here if needed; runs after migrations on `supabase db reset`

-- Deterministic fixtures for Playwright smoke tests.
-- These rows are intentionally stable so tests can target known short codes.
DELETE FROM public.events
WHERE short_code IN ('E2ESMOKE1', 'E2ELOCK1', 'E2EARCH1');

INSERT INTO public.events (
  id,
  name,
  description,
  is_public,
  created_by,
  short_code,
  is_archived,
  archived_at,
  is_locked
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'E2E Smoke Circle',
    'Fixture for anonymous claim and unclaim smoke test.',
    true,
    NULL,
    'E2ESMOKE1',
    false,
    NULL,
    false
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'E2E Locked Circle',
    'Fixture for locked-circle mutation blocking checks.',
    true,
    NULL,
    'E2ELOCK1',
    false,
    NULL,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'E2E Archived Circle',
    'Fixture for archived-circle mutation blocking checks.',
    true,
    NULL,
    'E2EARCH1',
    true,
    now(),
    false
  );

INSERT INTO public.khatms (id, event_id, khatm_number)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    1
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    1
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '33333333-3333-4333-8333-333333333333',
    1
  );

INSERT INTO public.juzs (khatm_id, juz_number)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, gs
FROM generate_series(1, 30) AS gs
UNION ALL
SELECT 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, gs
FROM generate_series(1, 30) AS gs
UNION ALL
SELECT 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, gs
FROM generate_series(1, 30) AS gs;
