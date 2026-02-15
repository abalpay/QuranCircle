-- Add composite index for common juz queries (filter by khatm + status)
CREATE INDEX IF NOT EXISTS juzs_khatm_status_idx
  ON public.juzs (khatm_id, status);

-- Add unique constraint to prevent duplicate juz per khatm
CREATE UNIQUE INDEX IF NOT EXISTS uq_juzs_khatm_juz_number
  ON public.juzs (khatm_id, juz_number);

-- Add index for user's events lookup
CREATE INDEX IF NOT EXISTS events_created_by_idx
  ON public.events (created_by)
  WHERE created_by IS NOT NULL;
