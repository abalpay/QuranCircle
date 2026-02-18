-- Fix private realtime topic authorization to use Supabase-supported topic helpers.
-- This keeps event invalidation channels private and session-backed.

DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_event_invalidation_subscribe" ON realtime.messages';

    EXECUTE $policy$
      CREATE POLICY "authenticated_event_invalidation_subscribe"
        ON realtime.messages
        FOR SELECT
        TO authenticated
        USING (
          realtime.messages.extension = 'broadcast'
          AND CASE
            WHEN split_part(realtime.topic(), ':', 1) = 'event'
             AND split_part(realtime.topic(), ':', 2) ~* '^[0-9a-f-]{36}$'
            THEN public.can_access_event((split_part(realtime.topic(), ':', 2))::uuid)
            ELSE false
          END
        )
    $policy$;
  END IF;
END
$$;
