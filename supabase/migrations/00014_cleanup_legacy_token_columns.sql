-- Remove legacy token ownership columns after UID-based ownership rollout.

DROP INDEX IF EXISTS public.juzs_device_token_khatm_idx;

ALTER TABLE public.events
  DROP COLUMN IF EXISTS creator_token;

ALTER TABLE public.juzs
  DROP COLUMN IF EXISTS device_token;
