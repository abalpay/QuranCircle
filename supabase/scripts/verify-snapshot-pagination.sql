-- Verify windowed snapshot payload contract from migration 00028.
-- Replace <SHORT_CODE> with a real circle short code in your environment.

-- 1) Confirm function signature.
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS identity_args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_event_snapshot_by_shortcode';

-- 2) Read first page (latest cycles only).
SELECT public.get_event_snapshot_by_shortcode(
  p_short_code => '<SHORT_CODE>',
  p_khatm_limit => 3
) AS first_page_snapshot;

-- 3) Read older page using cursor from first response.
WITH first_page AS (
  SELECT public.get_event_snapshot_by_shortcode(
    p_short_code => '<SHORT_CODE>',
    p_khatm_limit => 3
  ) AS snapshot
)
SELECT public.get_event_snapshot_by_shortcode(
  p_short_code => '<SHORT_CODE>',
  p_khatm_limit => 3,
  p_before_khatm_number => (first_page.snapshot ->> 'next_before_khatm_number')::INT
) AS older_page_snapshot
FROM first_page;

-- Expected:
-- - has_more_khatms reflects remaining cycles.
-- - next_before_khatm_number advances until null.
-- - total_khatms remains stable across pages.

