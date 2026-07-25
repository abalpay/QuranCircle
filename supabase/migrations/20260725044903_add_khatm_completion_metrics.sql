-- Record exactly the first time each Khatm reaches 30 read Juz. This is product
-- operational data and does not store visitor attribution or analytics data.

ALTER TABLE public.khatms
ADD COLUMN completed_at TIMESTAMPTZ;

WITH completed_khatms AS (
  SELECT
    j.khatm_id,
    MAX(j.read_at) AS completed_at
  FROM public.juzs j
  GROUP BY j.khatm_id
  HAVING COUNT(*) FILTER (WHERE j.status = 'read') = 30
)
UPDATE public.khatms k
SET completed_at = completed_khatms.completed_at
FROM completed_khatms
WHERE k.id = completed_khatms.khatm_id;

CREATE INDEX khatms_completed_at_idx
ON public.khatms (completed_at)
WHERE completed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.mark_juz_read_with_completion(
  p_short_code TEXT,
  p_juz_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event_archived BOOLEAN;
  v_event_creator UUID;
  v_claimed_by UUID;
  v_status TEXT;
  v_khatm_id UUID;
  v_completed_at TIMESTAMPTZ;
  v_read_count INT;
  v_newly_completed BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  -- Lock the parent Khatm before updating a Juz so simultaneous final reads
  -- serialize on one row and exactly one caller records first completion.
  SELECT
    e.is_archived,
    e.created_by,
    j.claimed_by_user_id,
    j.status,
    k.id,
    k.completed_at
  INTO
    v_event_archived,
    v_event_creator,
    v_claimed_by,
    v_status,
    v_khatm_id,
    v_completed_at
  FROM public.juzs j
  JOIN public.khatms k ON k.id = j.khatm_id
  JOIN public.events e ON e.id = k.event_id
  WHERE j.id = p_juz_id
    AND e.short_code = p_short_code
  LIMIT 1
  FOR UPDATE OF k, j;

  IF v_khatm_id IS NULL THEN
    RAISE EXCEPTION 'Juz not found';
  END IF;

  IF v_event_archived THEN
    RAISE EXCEPTION 'This Khatim is archived';
  END IF;

  IF v_status <> 'claimed' THEN
    RAISE EXCEPTION 'Juz must be claimed before marking as read';
  END IF;

  IF v_uid <> v_event_creator AND v_uid <> v_claimed_by THEN
    RAISE EXCEPTION 'Only the claimer or event creator can mark as read';
  END IF;

  UPDATE public.juzs
  SET
    status = 'read',
    read_at = now()
  WHERE id = p_juz_id;

  SELECT COUNT(*) FILTER (WHERE status = 'read')::INT
  INTO v_read_count
  FROM public.juzs
  WHERE khatm_id = v_khatm_id;

  IF v_read_count = 30 AND v_completed_at IS NULL THEN
    UPDATE public.khatms
    SET completed_at = now()
    WHERE id = v_khatm_id
      AND completed_at IS NULL;

    v_newly_completed := FOUND;
  END IF;

  RETURN jsonb_build_object(
    'updated', true,
    'newly_completed', v_newly_completed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_juz_read_with_completion(
  TEXT,
  UUID
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_juz_read_with_completion(
  TEXT,
  UUID
) TO authenticated, service_role;
