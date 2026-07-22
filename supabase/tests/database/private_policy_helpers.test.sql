BEGIN;

SELECT plan(16);

SELECT is(
  to_regprocedure('public.can_access_event(uuid)'),
  NULL::regprocedure,
  'can_access_event is not exposed in public'
);
SELECT is(
  to_regprocedure('public.current_user_is_event_creator(uuid)'),
  NULL::regprocedure,
  'current_user_is_event_creator is not exposed in public'
);
SELECT is(
  to_regprocedure('public.current_user_is_event_member(uuid)'),
  NULL::regprocedure,
  'current_user_is_event_member is not exposed in public'
);

SELECT isnt(
  to_regprocedure('private.can_access_event(uuid)'),
  NULL::regprocedure,
  'can_access_event exists in private'
);
SELECT isnt(
  to_regprocedure('private.current_user_is_event_creator(uuid)'),
  NULL::regprocedure,
  'current_user_is_event_creator exists in private'
);
SELECT isnt(
  to_regprocedure('private.current_user_is_event_member(uuid)'),
  NULL::regprocedure,
  'current_user_is_event_member exists in private'
);

SELECT ok(
  (
    SELECT bool_and(p.prosecdef)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname IN (
        'can_access_event',
        'current_user_is_event_creator',
        'current_user_is_event_member'
      )
  ),
  'private policy helpers remain SECURITY DEFINER'
);

SELECT ok(
  (
    SELECT bool_and(p.proconfig @> ARRAY['search_path=public']::text[])
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname IN (
        'can_access_event',
        'current_user_is_event_creator',
        'current_user_is_event_member'
      )
  ),
  'private policy helpers retain their fixed search path'
);

SELECT ok(
  NOT has_schema_privilege('anon', 'private', 'USAGE')
  AND NOT has_schema_privilege('authenticated', 'private', 'USAGE')
  AND NOT has_schema_privilege('service_role', 'private', 'USAGE'),
  'client roles cannot resolve objects in private'
);

SELECT ok(
  has_function_privilege('anon', 'private.can_access_event(uuid)', 'EXECUTE')
  AND has_function_privilege(
    'authenticated',
    'private.current_user_is_event_creator(uuid)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'private.current_user_is_event_member(uuid)',
    'EXECUTE'
  ),
  'policy roles retain EXECUTE on private helpers'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_policy p
    WHERE pg_get_expr(p.polqual, p.polrelid) ~ 'public\.(can_access_event|current_user_is_event_(creator|member))'
  )
  AND (
    SELECT count(*)
    FROM pg_policy p
    WHERE pg_get_expr(p.polqual, p.polrelid) ~ 'private\.(can_access_event|current_user_is_event_(creator|member))'
  ) = 6,
  'RLS and Realtime policies resolve helpers from private'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'realtime'
      AND c.relname = 'messages'
      AND p.polname = 'authenticated_event_invalidation_subscribe'
      AND pg_get_expr(p.polqual, p.polrelid) LIKE '%private.can_access_event%'
  ),
  'Realtime authorization resolves can_access_event from private'
);

INSERT INTO auth.users (id, aud, role, is_anonymous, created_at, updated_at)
VALUES
  ('71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', false, now(), now()),
  ('71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', false, now(), now()),
  ('71000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', false, now(), now());

INSERT INTO public.events (id, name, is_public, created_by, short_code)
VALUES
  (
    '72000000-0000-4000-8000-000000000001',
    'Public policy helper fixture',
    true,
    '71000000-0000-4000-8000-000000000001',
    'POLPUB01'
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    'Private policy helper fixture',
    false,
    '71000000-0000-4000-8000-000000000001',
    'POLPRV01'
  );

INSERT INTO public.event_members (event_id, user_id, role)
VALUES (
  '72000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000002',
  'participant'
);

INSERT INTO public.khatms (id, event_id, khatm_number)
VALUES
  (
    '73000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    1
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000002',
    1
  );

INSERT INTO public.juzs (khatm_id, juz_number)
VALUES
  ('73000000-0000-4000-8000-000000000001', 1),
  ('73000000-0000-4000-8000-000000000002', 1);

-- The production privilege model exposes RPCs rather than tables. Temporary
-- SELECT grants let this rolled-back test exercise the RLS policy expressions.
GRANT SELECT ON public.events, public.event_members, public.khatms, public.juzs
  TO anon, authenticated;

SET LOCAL ROLE anon;
SET LOCAL row_security = on;
SET LOCAL "request.jwt.claim.role" = 'anon';
SET LOCAL "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000003';

SELECT is(
  (SELECT count(*) FROM public.events WHERE id IN (
    '72000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000002'
  )),
  1::bigint,
  'anon RLS can see the public event but not the private event'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000002';

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.khatms k ON k.event_id = e.id
    JOIN public.juzs j ON j.khatm_id = k.id
    WHERE e.id = '72000000-0000-4000-8000-000000000002'
  ),
  'member RLS can traverse the private event hierarchy'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000001';

SELECT is(
  (
    SELECT count(*)
    FROM public.events
    WHERE id = '72000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'creator RLS can see the private event'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claim.sub" = '71000000-0000-4000-8000-000000000003';

SELECT is(
  (
    SELECT count(*)
    FROM public.events
    WHERE id = '72000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'unrelated authenticated user cannot see the private event'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
