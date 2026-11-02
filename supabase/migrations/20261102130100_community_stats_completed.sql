-- #83: the homepage stat counts khatms COMPLETED (completed_at set, not deleted)
-- instead of every non-deleted khatm ("active khatms"). The OUT column is renamed,
-- which CREATE OR REPLACE cannot do, so drop and recreate. Grants as in 00030.

DROP FUNCTION IF EXISTS public.get_community_stats();

CREATE FUNCTION public.get_community_stats()
RETURNS TABLE (
  total_circles BIGINT,
  total_juz_claimed BIGINT,
  khatms_completed BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.events e WHERE e.is_archived = false) AS total_circles,
    (SELECT COUNT(*) FROM public.juzs j WHERE j.status <> 'unclaimed') AS total_juz_claimed,
    (SELECT COUNT(*) FROM public.khatms k WHERE k.is_deleted = false AND k.completed_at IS NOT NULL) AS khatms_completed;
$$;

REVOKE ALL ON FUNCTION public.get_community_stats() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_community_stats() TO anon, authenticated, service_role;
