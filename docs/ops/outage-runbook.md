# Runbook: the site is down

Keep calm, work top to bottom. Never put circle names, short codes, emails or connection strings into issues or commits (the repo is public).

## 1. What is down?

| Check | How |
| --- | --- |
| Vercel platform | status page `vercel-status.com` |
| Supabase platform | status page `status.supabase.com` |
| Latest app deployment | `vercel ls` (state of recent deployments), `vercel logs <deployment-url>` for runtime errors |
| Database | Supabase dashboard: Logs, Reports (CPU, connections); try a simple query in the SQL editor |
| Just one page | does the homepage load but a circle page fails? Then suspect the last deploy or a database function, not the platform |

If a platform status page shows an incident, there is nothing to fix: wait, and tell people (section 6).

## 2. Roll back the app

If the problem started with a deploy: in the Vercel dashboard open the project, Deployments, pick the last deployment that was fine and choose "Promote to Production" (or `vercel promote <deployment-url>`). Rollback is instant and does not change the database. Then fix on `staging` and promote normally.

## 3. Pause scheduled jobs

If a cron job is hurting the database (in the Supabase SQL editor):

```sql
select jobid, jobname, schedule, active from cron.job;
select cron.alter_job(job_id := <jobid>, active := false);   -- pause
-- later: active := true
```

## 4. Restore the database from backup

**Restoring into production overwrites live data and is Ahmet's call. Do not do it on your own.** First try everything above, and ask whether Supabase support or point-in-time options can help.

1. Take the newest dump from private storage (see `docs/ops/backups.md`); check its sha256 against your notes.
2. Run `scripts/restore-drill.sh` on it to confirm it is healthy and see the counts.
3. Decide with Ahmet where to restore: preferably a **new** Supabase project, then repoint the app (Vercel env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, redeploy). Restoring over the existing project is the last resort.
4. Restore with `age -d -i <identity> < dump.age | pg_restore --clean --if-exists -d "<target connection string>"`, then recreate the cron jobs from the migrations (`...cron-jobs.json.age` lists what was there and whether each was active).
5. Smoke test: homepage, a circle page, sign-in. Data changed after the backup is lost; say so honestly to affected organizers.

## 5. Uptime monitor

Free external monitor (e.g. UptimeRobot). Account owner: Ahmet. Configure two HTTP(s) keyword monitors:

1. **Homepage**: the production site URL, keyword that is always on the page (for example the site name) set to "alert when keyword does not exist".
2. **Probe circle page**: a link-only archived circle made for this purpose; its URL is entered only in the monitor, never in this repo. Keyword: the probe circle's name, alert when missing. This proves the page, database read and rendering all work.

Settings for both: 5-minute interval, alert contact = email (Ahmet), alert after 1 failed check is fine at this scale. After setup, pause then resume a monitor (or point it at a wrong keyword) once to confirm that the alert email arrives.

## 6. Who to tell

- Ahmet first, always.
- Then, if more than about 30 minutes: affected organizers who contact you, with a plain, short note (what is wrong, that data is safe or not, when you will update). Do not name circles publicly.
