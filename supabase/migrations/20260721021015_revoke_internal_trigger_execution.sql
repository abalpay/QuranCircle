-- Trigger functions are invoked by their triggers and are not part of the
-- Data API. Remove PostgreSQL's default PUBLIC execute privilege so this
-- SECURITY DEFINER routine cannot be treated as a client-callable endpoint.

REVOKE ALL ON FUNCTION public.broadcast_event_invalidation()
  FROM PUBLIC, anon, authenticated, service_role;
