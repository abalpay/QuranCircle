#!/usr/bin/env bash
# Encrypted export of the production database. Run by hand or from a PRIVATE scheduler;
# never from this public repo's CI. Nothing unencrypted ever touches disk.
#
# Required env:
#   BACKUP_DB_URL         PASSWORD-LESS postgres URL, e.g. postgresql://USER@HOST:5432/postgres
#                         (Supabase direct or session-pooler; the transaction pooler on :6543 does not
#                         work for pg_dump). Give the password via PGPASSWORD or ~/.pgpass so it never
#                         appears in a process list or shell history. Never echoed.
#   BACKUP_AGE_RECIPIENT  age public key ("age1...") that may decrypt the dump.
# Optional env:
#   BACKUP_DIR            output directory (default: $HOME/qurancircle-backups). Keep it OUTSIDE this repo.
# Tools: pg_dump + psql (major version >= the server's, currently 17), age, shasum or sha256sum.
#
# Contents: schemas public, private, auth (auth.users is needed or every organizer link breaks).
# pg_cron job definitions live in the extension-owned "cron" schema, which pg_dump skips on
# Supabase, so they are exported separately as JSON (<name>.cron-jobs.json.age); the jobs
# themselves are recreated by the migrations. Storage and other Supabase schemas are not used by the app.
set -euo pipefail
umask 077

: "${BACKUP_DB_URL:?BACKUP_DB_URL is not set}"
for tool in pg_dump psql; do command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }; done

if [[ "$BACKUP_DB_URL" =~ ://[^/@]*:[^/@]*@ ]]; then
  echo "BACKUP_DB_URL contains a password. Remove it and use PGPASSWORD or ~/.pgpass instead." >&2; exit 1
fi
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is not set}"
command -v age >/dev/null || { echo "missing tool: age" >&2; exit 1; }

dir="${BACKUP_DIR:-$HOME/qurancircle-backups}"
mkdir -p "$dir"
base="$dir/qc-prod-$(date -u +%Y%m%dT%H%M%SZ)"
dump="$base.dump.age"
jobs="$base.cron-jobs.json.age"
# write to .partial and rename on success, so a failed run never leaves a truncated "good" file
trap 'rm -f "$dump.partial" "$jobs.partial"' EXIT

pg_dump --format=custom --schema=public --schema=private --schema=auth "$BACKUP_DB_URL" | age -r "$BACKUP_AGE_RECIPIENT" > "$dump.partial"
psql "$BACKUP_DB_URL" -X -At -c "select coalesce(json_agg(j order by jobid), '[]') from (select jobid, jobname, schedule, active, command from cron.job) j" | age -r "$BACKUP_AGE_RECIPIENT" > "$jobs.partial"
mv "$dump.partial" "$dump"; mv "$jobs.partial" "$jobs"

sha() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi; }
for f in "$dump" "$jobs"; do
  echo "$(basename "$f")  $(wc -c < "$f" | tr -d ' ') bytes  sha256 $(sha "$f" | cut -d' ' -f1)"
done
