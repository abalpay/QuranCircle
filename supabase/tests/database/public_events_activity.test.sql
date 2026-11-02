BEGIN;

SELECT plan(11);

INSERT INTO auth.users (id, aud, role, is_anonymous, created_at, updated_at)
VALUES ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', false, now(), now());

-- a: new, no claims                      -> listed
-- b: created exactly 7 days ago          -> listed (boundary)
-- c: created 7 days + 1s, no claims      -> excluded
-- d: old, claim 30 days ago exactly      -> listed (boundary)
-- e: old, claim 30 days + 1s ago         -> excluded
-- f: old, claim 5 days ago, khatm deleted-> excluded
-- g: new but private                     -> excluded
-- h: new but archived                    -> excluded
-- i: old, claim 29 days ago              -> listed
INSERT INTO public.events (id, name, is_public, is_archived, created_by, short_code, created_at)
VALUES
  ('30000000-0000-0000-0000-00000000000a', 'act a', true,  false, '30000000-0000-0000-0000-000000000001', 'ACTTST0A1', now() - interval '1 day'),
  ('30000000-0000-0000-0000-00000000000b', 'act b', true,  false, '30000000-0000-0000-0000-000000000001', 'ACTTST0B1', now() - interval '7 days'),
  ('30000000-0000-0000-0000-00000000000c', 'act c', true,  false, '30000000-0000-0000-0000-000000000001', 'ACTTST0C1', now() - interval '7 days 1 second'),
  ('30000000-0000-0000-0000-00000000000d', 'act d', true,  false, '30000000-0000-0000-0000-000000000001', 'ACTTST0D1', now() - interval '60 days'),
  ('30000000-0000-0000-0000-00000000000e', 'act e', true,  false, '30000000-0000-0000-0000-000000000001', 'ACTTST0E1', now() - interval '61 days'),
  ('30000000-0000-0000-0000-00000000000f', 'act f', true,  false, '30000000-0000-0000-0000-000000000001', 'ACTTST0F1', now() - interval '62 days'),
  ('30000000-0000-0000-0000-000000000010', 'act g', false, false, '30000000-0000-0000-0000-000000000001', 'ACTTST0G1', now() - interval '1 day'),
  ('30000000-0000-0000-0000-000000000011', 'act h', true,  true,  '30000000-0000-0000-0000-000000000001', 'ACTTST0H1', now() - interval '1 day'),
  ('30000000-0000-0000-0000-000000000012', 'act i', true,  false, '30000000-0000-0000-0000-000000000001', 'ACTTST0I1', now() - interval '63 days');

INSERT INTO public.khatms (id, event_id, khatm_number, is_deleted)
VALUES
  ('31000000-0000-0000-0000-00000000000d', '30000000-0000-0000-0000-00000000000d', 1, false),
  ('31000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-00000000000e', 1, false),
  ('31000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-00000000000f', 1, true),
  ('31000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000012', 1, false);

INSERT INTO public.juzs (khatm_id, juz_number, claimed_by_name, claimed_by_user_id, status, claimed_at)
VALUES
  ('31000000-0000-0000-0000-00000000000d', 1, 'x', '30000000-0000-0000-0000-000000000001', 'claimed', now() - interval '30 days'),
  ('31000000-0000-0000-0000-00000000000e', 1, 'x', '30000000-0000-0000-0000-000000000001', 'claimed', now() - interval '30 days 1 second'),
  ('31000000-0000-0000-0000-00000000000f', 1, 'x', '30000000-0000-0000-0000-000000000001', 'claimed', now() - interval '5 days'),
  ('31000000-0000-0000-0000-000000000012', 1, 'x', '30000000-0000-0000-0000-000000000001', 'claimed', now() - interval '29 days');

CREATE TEMP TABLE listed AS
SELECT id FROM public.list_public_events_with_progress(2000, NULL, NULL);

SELECT ok(EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-00000000000a'), 'new circle without claims is listed');
SELECT ok(EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-00000000000b'), 'circle created exactly 7 days ago is listed');
SELECT ok(NOT EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-00000000000c'), 'circle older than 7 days without claims is excluded');
SELECT ok(EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-00000000000d'), 'old circle with claim exactly 30 days ago is listed');
SELECT ok(NOT EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-00000000000e'), 'old circle with claim older than 30 days is excluded');
SELECT ok(NOT EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-00000000000f'), 'recent claim in a deleted khatm does not count');
SELECT ok(NOT EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-000000000010'), 'private circle stays excluded');
SELECT ok(NOT EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-000000000011'), 'archived circle stays excluded');
SELECT ok(EXISTS (SELECT 1 FROM listed WHERE id = '30000000-0000-0000-0000-000000000012'), 'old circle with claim 29 days ago is listed');

-- Walk the whole listing 2 rows at a time through the real cursor. Foreign rows may be present,
-- so only the fixture subset is compared; the excluded c sits between kept rows b and d.
CREATE TEMP TABLE paged (seq SERIAL, id UUID, created_at TIMESTAMPTZ);

DO $$
DECLARE
  cur_at TIMESTAMPTZ := NULL;
  cur_id UUID := NULL;
  n INT;
BEGIN
  FOR i IN 1..1000 LOOP
    INSERT INTO paged (id, created_at)
    SELECT p.id, p.created_at FROM public.list_public_events_with_progress(2, cur_at, cur_id) p;
    GET DIAGNOSTICS n = ROW_COUNT;
    EXIT WHEN n = 0;
    SELECT p.created_at, p.id INTO cur_at, cur_id FROM paged p ORDER BY p.seq DESC LIMIT 1;
  END LOOP;
END $$;

SELECT is(
  (SELECT array_agg(id ORDER BY seq) FROM paged WHERE id::text LIKE '30000000-0000-0000-0000-%'),
  ARRAY[
    '30000000-0000-0000-0000-00000000000a',
    '30000000-0000-0000-0000-00000000000b',
    '30000000-0000-0000-0000-00000000000d',
    '30000000-0000-0000-0000-000000000012'
  ]::uuid[],
  'cursor pages return the active fixture rows once each, in order, never the excluded ones'
);

SELECT is(
  (SELECT count(*)::int FROM paged),
  (SELECT count(DISTINCT id)::int FROM paged),
  'cursor pages have no duplicates'
);

SELECT * FROM finish();
ROLLBACK;
