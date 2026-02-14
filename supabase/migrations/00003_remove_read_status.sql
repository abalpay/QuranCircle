-- Remove "read" marker state; keep only unclaimed/claimed.
UPDATE public.juzs
SET status = 'claimed',
    read_at = NULL
WHERE status = 'read';

ALTER TABLE public.juzs
DROP CONSTRAINT IF EXISTS juzs_status_check;

ALTER TABLE public.juzs
ADD CONSTRAINT juzs_status_check
CHECK (status IN ('unclaimed', 'claimed'));
