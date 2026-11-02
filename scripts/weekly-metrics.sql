-- Weekly numbers for D12 (success = juz claimed and khatms completed). READ-ONLY.
-- Run against a database you mean to measure, e.g. psql "$DATABASE_URL" -f scripts/weekly-metrics.sql
-- Weeks are ISO weeks (Monday start, UTC). Counts are by event time, not current state:
-- a juz claimed then unclaimed leaves no claimed_at, so "juz claimed" is the live claim date.
-- Archived circles count; soft-deleted khatms do not count as completed.
WITH weeks AS (
  SELECT date_trunc('week', ts AT TIME ZONE 'UTC') AS week, kind, source
  FROM (
    SELECT created_at AS ts, 'circles_created' AS kind, NULL::text AS source FROM public.events
    UNION ALL
    SELECT claimed_at, 'juz_claimed', NULL FROM public.juzs WHERE claimed_at IS NOT NULL
    UNION ALL
    SELECT read_at, 'done_marks', NULL FROM public.juzs WHERE read_at IS NOT NULL
    UNION ALL
    SELECT completed_at, 'khatms_completed', completion_source
    FROM public.khatms WHERE completed_at IS NOT NULL AND is_deleted = false
  ) x
)
SELECT
  to_char(week, 'IYYY-"W"IW') AS iso_week,
  week::date AS week_start,
  count(*) FILTER (WHERE kind = 'circles_created') AS circles_created,
  count(*) FILTER (WHERE kind = 'juz_claimed') AS juz_claimed,
  count(*) FILTER (WHERE kind = 'done_marks') AS done_marks,
  count(*) FILTER (WHERE kind = 'khatms_completed') AS khatms_completed,
  count(*) FILTER (WHERE kind = 'khatms_completed' AND source = 'all_done') AS completed_all_done,
  count(*) FILTER (WHERE kind = 'khatms_completed' AND source = 'organizer') AS completed_organizer,
  count(*) FILTER (WHERE kind = 'khatms_completed' AND source = 'auto') AS completed_auto
FROM weeks
GROUP BY week
ORDER BY week DESC;
