-- Keep SECURITY DEFINER helpers used only by RLS and Realtime outside the
-- exposed Data API schema. ALTER FUNCTION preserves each function's OID, so
-- existing policy dependencies continue to resolve to the same routine.

ALTER FUNCTION public.can_access_event(UUID)
  SET SCHEMA private;

ALTER FUNCTION public.current_user_is_event_creator(UUID)
  SET SCHEMA private;

ALTER FUNCTION public.current_user_is_event_member(UUID)
  SET SCHEMA private;

-- Policy evaluation still needs EXECUTE. Client roles intentionally have no
-- USAGE on private, so these grants do not create callable Data API endpoints.
REVOKE ALL ON FUNCTION private.can_access_event(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.current_user_is_event_creator(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.current_user_is_event_member(UUID)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.can_access_event(UUID)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_is_event_creator(UUID)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_is_event_member(UUID)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION private.can_access_event(UUID) IS
  'Internal SECURITY DEFINER helper for event visibility RLS and Realtime policies.';
COMMENT ON FUNCTION private.current_user_is_event_creator(UUID) IS
  'Internal SECURITY DEFINER helper for creator-scoped RLS policies.';
COMMENT ON FUNCTION private.current_user_is_event_member(UUID) IS
  'Internal SECURITY DEFINER helper for membership-scoped RLS policies.';

-- Remove the old public RPC signatures from PostgREST's schema cache as soon
-- as this transaction commits.
NOTIFY pgrst, 'reload schema';
