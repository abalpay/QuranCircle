-- Remove only old, inactive anonymous Auth users that have no application or
-- Storage ownership. The batch limit keeps the weekly transaction bounded.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF current_setting('cron.use_background_workers')::BOOLEAN THEN
    RAISE EXCEPTION
      'Anonymous cleanup requires cron.use_background_workers=off so its 30-second timeout is enforced';
  END IF;

  IF current_setting('cron.timezone') NOT IN ('GMT', 'UTC', 'Etc/UTC') THEN
    RAISE EXCEPTION
      'Anonymous cleanup requires cron.timezone to be GMT or UTC';
  END IF;
END;
$$;

CREATE TABLE private.anonymous_user_cleanup_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention INTERVAL NOT NULL,
  batch_limit INTEGER NOT NULL CHECK (batch_limit BETWEEN 1 AND 1000),
  deleted_count INTEGER NOT NULL CHECK (deleted_count >= 0)
);

ALTER TABLE private.anonymous_user_cleanup_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.anonymous_user_cleanup_runs
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE private.anonymous_user_cleanup_runs_id_seq
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.cleanup_unreferenced_anonymous_users(
  p_retention INTERVAL DEFAULT interval '30 days',
  p_batch_limit INTEGER DEFAULT 1000
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '30s'
SET lock_timeout = '5s'
AS $$
DECLARE
  v_candidate_ids UUID[];
  v_deleted_count INTEGER;
BEGIN
  IF p_retention IS NULL OR p_retention < interval '1 day' THEN
    RAISE EXCEPTION 'Retention must be at least one day';
  END IF;

  IF p_batch_limit IS NULL OR p_batch_limit < 1 OR p_batch_limit > 1000 THEN
    RAISE EXCEPTION 'Batch limit must be between 1 and 1000';
  END IF;

  SELECT COALESCE(array_agg(candidate.id), ARRAY[]::UUID[])
  INTO v_candidate_ids
  FROM (
    SELECT u.id
    FROM auth.users AS u
    WHERE u.is_anonymous IS TRUE
      AND u.created_at < now() - p_retention
      AND NOT EXISTS (
        SELECT 1
        FROM public.events AS e
        WHERE e.created_by = u.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.juzs AS j
        WHERE j.claimed_by_user_id = u.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.event_members AS em
        WHERE em.user_id = u.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.bookmarks AS b
        WHERE b.user_id = u.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM storage.objects AS o
        WHERE o.owner = u.id
           OR o.owner_id = u.id::text
      )
      AND NOT EXISTS (
        SELECT 1
        FROM storage.buckets AS sb
        WHERE sb.owner = u.id
           OR sb.owner_id = u.id::text
      )
      AND NOT EXISTS (
        SELECT 1
        FROM storage.s3_multipart_uploads AS smu
        WHERE smu.owner_id = u.id::text
      )
      AND NOT EXISTS (
        SELECT 1
        FROM storage.s3_multipart_uploads_parts AS smup
        WHERE smup.owner_id = u.id::text
      )
      AND NOT EXISTS (
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
          ) >= now() - p_retention
      )
    ORDER BY u.created_at, u.id
    LIMIT p_batch_limit
    FOR UPDATE OF u SKIP LOCKED
  ) AS candidate;

  -- Existing session rows can be refreshed without changing their user_id.
  -- Lock them before taking the fresh snapshot used by the final recheck. New
  -- sessions and application references are blocked by the auth.users row
  -- locks through their foreign keys.
  PERFORM 1
  FROM auth.sessions AS s
  WHERE s.user_id = ANY(v_candidate_ids)
  FOR UPDATE;

  -- Storage ownership columns do not reference auth.users with foreign keys.
  -- Discover candidates first so the potentially expensive scan never blocks
  -- uploads. Immediately before the fresh recheck/delete, lock parent tables
  -- before their children to match Storage's mutation order. NOWAIT makes the
  -- cleanup fail closed instead of waiting behind live Storage traffic.
  LOCK TABLE
    storage.buckets,
    storage.objects,
    storage.s3_multipart_uploads,
    storage.s3_multipart_uploads_parts
  IN SHARE ROW EXCLUSIVE MODE NOWAIT;

  DELETE FROM auth.users AS u
  WHERE u.id = ANY(v_candidate_ids)
    AND u.is_anonymous IS TRUE
    AND u.created_at < now() - p_retention
    AND NOT EXISTS (
      SELECT 1
      FROM public.events AS e
      WHERE e.created_by = u.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.juzs AS j
      WHERE j.claimed_by_user_id = u.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.event_members AS em
      WHERE em.user_id = u.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.bookmarks AS b
      WHERE b.user_id = u.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM storage.objects AS o
      WHERE o.owner = u.id
         OR o.owner_id = u.id::text
    )
    AND NOT EXISTS (
      SELECT 1
      FROM storage.buckets AS sb
      WHERE sb.owner = u.id
         OR sb.owner_id = u.id::text
    )
    AND NOT EXISTS (
      SELECT 1
      FROM storage.s3_multipart_uploads AS smu
      WHERE smu.owner_id = u.id::text
    )
    AND NOT EXISTS (
      SELECT 1
      FROM storage.s3_multipart_uploads_parts AS smup
      WHERE smup.owner_id = u.id::text
    )
    AND NOT EXISTS (
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
        ) >= now() - p_retention
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  INSERT INTO private.anonymous_user_cleanup_runs (
    retention,
    batch_limit,
    deleted_count
  )
  VALUES (
    p_retention,
    p_batch_limit,
    v_deleted_count
  );

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION private.cleanup_unreferenced_anonymous_users(INTERVAL, INTEGER)
IS 'Deletes a bounded batch of old, inactive anonymous users with no application or Storage ownership.';

REVOKE ALL ON FUNCTION private.cleanup_unreferenced_anonymous_users(INTERVAL, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;

-- Sunday at 03:30 UTC. Reusing the job name makes the migration idempotent if
-- the schedule is recreated during a controlled recovery.
SELECT cron.schedule(
  'qurancircle-cleanup-unreferenced-anonymous-users',
  '30 3 * * 0',
  $cron$
    SET statement_timeout = '30s';
    SET lock_timeout = '5s';
    SELECT private.cleanup_unreferenced_anonymous_users(
      interval '30 days',
      1000
    );
  $cron$
);

-- Production activation is a separate, explicit rollout decision after the
-- aggregate candidate preflight. Keeping the new job inactive also provides a
-- safe migration/app rollback window.
SELECT cron.alter_job(
  job_id := (
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'qurancircle-cleanup-unreferenced-anonymous-users'
  ),
  active := false
);
