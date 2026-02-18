-- Enforce DB-level short code contract for event links.
-- Contract: alphanumeric, 1-24 chars.

DO $$
DECLARE
  v_invalid_count INT;
BEGIN
  SELECT COUNT(*)::INT
  INTO v_invalid_count
  FROM public.events e
  WHERE e.short_code IS NULL
    OR e.short_code !~ '^[A-Za-z0-9]{1,24}$';

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce short code contract: % invalid rows found in public.events.short_code',
      v_invalid_count;
  END IF;
END
$$;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_short_code_contract_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_short_code_contract_check
  CHECK (short_code ~ '^[A-Za-z0-9]{1,24}$');

