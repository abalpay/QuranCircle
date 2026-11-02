#!/usr/bin/env bash
# Encrypted export of the production database. Run by hand or from a PRIVATE scheduler;
# never from this public repo's CI. Writes nothing unencrypted to disk by default.
#
# Required env:
#   BACKUP_DB_URL         postgres connection string (Supabase direct or session-pooler URL;
#                         the transaction pooler on :6543 does not work for pg_dump). Never echoed.
#   BACKUP_AGE_RECIPIENT  age public key ("age1...") that may decrypt the dump.
# Optional env:
#   BACKUP_DIR            output directory (default: $HOME/qurancircle-backups). Keep it OUTSIDE this repo.
#   ALLOW_UNENCRYPTED=1   local testing only: write a plaintext dump instead of refusing.
# Tools: pg_dump + psql (major version >= the server's, currently 17), age, shasum or sha256sum.
#
# Contents: schemas public, private, auth (auth.users is needed or every organizer link breaks).
# pg_cron job definitions live in the extension-owned "cron" schema, which pg_dump skips on
# Supabase, so they are exported separately as JSON (<name>.cron-jobs.json[.age]); the jobs
# themselves are recreated by the migrations. Storage and other Supabase schemas are not used by the app.
set -euo pipefail
umask 077

: "${BACKUP_DB_URL:?BACKUP_DB_URL is not set}"
for tool in pg_dump psql; do command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }; done

if [[ "${ALLOW_UNENCRYPTED:-}" == 1 ]]; then
  ext=""; encrypt() { cat; }
  echo "WARNING: ALLOW_UNENCRYPTED=1, writing PLAINTEXT dumps" >&2
else
  : "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is not set (set ALLOW_UNENCRYPTED=1 only for local tests)}"
  command -v age >/dev/null || { echo "missing tool: age" >&2; exit 1; }
  ext=".age"; encrypt() { age -r "$BACKUP_AGE_RECIPIENT"; }
fi

dir="${BACKUP_DIR:-$HOME/qurancircle-backups}"
mkdir -p "$dir"
base="$dir/qc-prod-$(date -u +%Y%m%dT%H%M%SZ)"
dump="$base.dump$ext"
jobs="$base.cron-jobs.json$ext"
trap 'rm -f "$dump" "$jobs"' ERR

pg_dump --format=custom --schema=public --schema=private --schema=auth "$BACKUP_DB_URL" | encrypt > "$dump"
psql "$BACKUP_DB_URL" -X -At -c "select coalesce(json_agg(j order by jobid), '[]') from (select jobid, jobname, schedule, active, command from cron.job) j" | encrypt > "$jobs"
trap - ERR

sha() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi; }
for f in "$dump" "$jobs"; do
  echo "$(basename "$f")  $(wc -c < "$f" | tr -d ' ') bytes  sha256 $(sha "$f" | cut -d' ' -f1)"
done
