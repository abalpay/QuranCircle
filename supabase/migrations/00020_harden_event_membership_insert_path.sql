-- Harden membership writes: joining must flow through SECURITY DEFINER RPCs.
-- Direct table writes from client roles are disallowed.

DROP POLICY IF EXISTS event_members_insert_self ON public.event_members;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.event_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.event_members FROM authenticated;

