-- Private realtime invalidation broadcasts. Clients refetch snapshots instead of consuming row payloads.

CREATE OR REPLACE FUNCTION public.broadcast_event_invalidation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'events' THEN
    v_event_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'khatms' THEN
    v_event_id := COALESCE(NEW.event_id, OLD.event_id);
  ELSIF TG_TABLE_NAME = 'juzs' THEN
    SELECT k.event_id
    INTO v_event_id
    FROM public.khatms k
    WHERE k.id = COALESCE(NEW.khatm_id, OLD.khatm_id)
    LIMIT 1;
  END IF;

  IF v_event_id IS NOT NULL THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'event_id', v_event_id,
        'at', now()
      ),
      'invalidate',
      'event:' || v_event_id::text,
      true
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_events_broadcast_invalidation ON public.events;
CREATE TRIGGER trg_events_broadcast_invalidation
AFTER INSERT OR UPDATE OR DELETE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_event_invalidation();

DROP TRIGGER IF EXISTS trg_khatms_broadcast_invalidation ON public.khatms;
CREATE TRIGGER trg_khatms_broadcast_invalidation
AFTER INSERT OR UPDATE OR DELETE ON public.khatms
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_event_invalidation();

DROP TRIGGER IF EXISTS trg_juzs_broadcast_invalidation ON public.juzs;
CREATE TRIGGER trg_juzs_broadcast_invalidation
AFTER INSERT OR UPDATE OR DELETE ON public.juzs
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_event_invalidation();

-- Authorize private topic reads based on event visibility/membership.
-- Some projects may not expose realtime.messages as a relation; guard policy creation.
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
          CASE
            WHEN split_part(topic, '':'', 1) = ''event''
             AND split_part(topic, '':'', 2) ~* ''^[0-9a-f-]{36}$''
            THEN public.can_access_event((split_part(topic, '':'', 2))::uuid)
            ELSE false
          END
        )
    $policy$;
  END IF;
END
$$;
