-- Read-only post-migration verification for the anonymous-user cleanup job.

SELECT
  current_setting('cron.use_background_workers') AS cron_uses_background_workers,
  current_setting('cron.timezone') AS cron_timezone,
  current_setting('statement_timeout') AS session_statement_timeout;

SELECT
  jobid,
  jobname,
  schedule,
  active,
  database,
  username
FROM cron.job
WHERE jobname = 'qurancircle-cleanup-unreferenced-anonymous-users';

SELECT
  completed_at,
  retention,
  batch_limit,
  deleted_count
FROM private.anonymous_user_cleanup_runs
ORDER BY completed_at DESC
LIMIT 10;

SELECT
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid
  FROM cron.job
  WHERE jobname = 'qurancircle-cleanup-unreferenced-anonymous-users'
)
ORDER BY start_time DESC
LIMIT 10;
