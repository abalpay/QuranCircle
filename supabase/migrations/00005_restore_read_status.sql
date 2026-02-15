-- Restore "read" status to juzs CHECK constraint
ALTER TABLE public.juzs DROP CONSTRAINT IF EXISTS juzs_status_check;
ALTER TABLE public.juzs ADD CONSTRAINT juzs_status_check
  CHECK (status IN ('unclaimed', 'claimed', 'read'));

-- Clean up any empty device_token values
UPDATE public.juzs SET device_token = NULL WHERE device_token = '';
