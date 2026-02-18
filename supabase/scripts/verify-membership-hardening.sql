-- QuranCircle: Verify membership hardening after migration 00020
-- Run in Supabase Dashboard -> SQL Editor
--
-- This script verifies:
-- 1) Direct INSERT into public.event_members is blocked for authenticated clients
-- 2) Joining via ensure_event_membership(short_code) still works
--
-- Replace <EXISTING_SHORT_CODE> with a real event short code before running.

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL row_security = on;
SET LOCAL "request.jwt.claim.role" = 'authenticated';
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.event_members (event_id, user_id, role)
    VALUES (
      '22222222-2222-2222-2222-222222222222',
      auth.uid(),
      'participant'
    );

    RAISE EXCEPTION 'FAILED: direct INSERT unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: direct INSERT is blocked (insufficient_privilege)';
  END;
END
$$;

SELECT public.ensure_event_membership('<EXISTING_SHORT_CODE>') AS rpc_join_result;
-- Expected: true for a valid short code and authenticated user.

ROLLBACK;

