-- Read-only, aggregate-only preflight for the anonymous-user cleanup job.
-- This deliberately returns no user identifiers or profile data.

SET statement_timeout = '30s';

SELECT
  current_setting('cron.use_background_workers', true) AS cron_uses_background_workers,
  current_setting('cron.timezone', true) AS cron_timezone,
  current_setting('statement_timeout') AS session_statement_timeout;

WITH anonymous_users AS (
  SELECT
    u.created_at < now() - interval '30 days' AS is_past_retention,
    EXISTS (
      SELECT 1 FROM public.events AS e WHERE e.created_by = u.id
    ) OR EXISTS (
      SELECT 1 FROM public.juzs AS j WHERE j.claimed_by_user_id = u.id
    ) OR EXISTS (
      SELECT 1 FROM public.event_members AS em WHERE em.user_id = u.id
    ) OR EXISTS (
      SELECT 1 FROM public.bookmarks AS b WHERE b.user_id = u.id
    ) OR EXISTS (
      SELECT 1
      FROM storage.objects AS o
      WHERE o.owner = u.id OR o.owner_id = u.id::text
    ) OR EXISTS (
      SELECT 1
      FROM storage.buckets AS sb
      WHERE sb.owner = u.id OR sb.owner_id = u.id::text
    ) OR EXISTS (
      SELECT 1
      FROM storage.s3_multipart_uploads AS smu
      WHERE smu.owner_id = u.id::text
    ) OR EXISTS (
      SELECT 1
      FROM storage.s3_multipart_uploads_parts AS smup
      WHERE smup.owner_id = u.id::text
    ) AS has_application_or_storage_reference,
    EXISTS (
      SELECT 1
      FROM auth.sessions AS s
      WHERE s.user_id = u.id
        AND GREATEST(
          COALESCE(
            s.refreshed_at AT TIME ZONE 'UTC',
            '-infinity'::timestamptz
          ),
          COALESCE(s.updated_at, '-infinity'::timestamptz),
          COALESCE(s.created_at, '-infinity'::timestamptz)
        ) >= now() - interval '30 days'
    ) AS has_recent_session
  FROM auth.users AS u
  WHERE u.is_anonymous IS TRUE
)
SELECT
  count(*) AS total_anonymous_users,
  count(*) FILTER (WHERE NOT is_past_retention) AS within_retention,
  count(*) FILTER (WHERE is_past_retention) AS past_retention,
  count(*) FILTER (
    WHERE is_past_retention
      AND has_application_or_storage_reference
  ) AS past_retention_with_reference,
  count(*) FILTER (
    WHERE is_past_retention
      AND NOT has_application_or_storage_reference
      AND has_recent_session
  ) AS past_retention_unreferenced_with_recent_session,
  count(*) FILTER (
    WHERE is_past_retention
      AND NOT has_application_or_storage_reference
      AND NOT has_recent_session
  ) AS eligible_for_cleanup
FROM anonymous_users;
