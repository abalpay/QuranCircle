#!/usr/bin/env bash
# Restore a backup into a THROWAWAY Postgres container and print row counts.
# Usage: scripts/restore-drill.sh <qc-prod-...dump[.age]>
#
# Env:
#   BACKUP_AGE_IDENTITY_FILE  age secret-key file (required for *.age dumps)
#   EXPECT_EVENTS EXPECT_KHATMS EXPECT_JUZS EXPECT_USERS   optional counts to compare; mismatch exits 1
#   DRILL_IMAGE               default: the image used by tests/security/run-database.py
# Tools: docker, age. The container has no network, a random name, and is removed on exit.
# It never touches the local Supabase stack (ports 543xx) or any real database.
set -euo pipefail

dump="${1:?usage: restore-drill.sh <dump file>}"
[[ -f "$dump" ]] || { echo "no such file: $dump" >&2; exit 1; }
image="${DRILL_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.167}"
name="qc-restore-drill-$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')"

if [[ "$dump" == *.age ]]; then
  : "${BACKUP_AGE_IDENTITY_FILE:?BACKUP_AGE_IDENTITY_FILE is not set}"
  command -v age >/dev/null || { echo "missing tool: age" >&2; exit 1; }
  read_dump() { age -d -i "$BACKUP_AGE_IDENTITY_FILE" < "$dump"; }
else
  read_dump() { cat "$dump"; }
fi

trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$name" --network none -e POSTGRES_PASSWORD=drill "$image" >/dev/null
psql() { docker exec -i "$name" psql -h /var/run/postgresql -U supabase_admin -d postgres -X -At -v ON_ERROR_STOP=1 "$@"; }

# The entrypoint runs a temporary init server first; wait for the final one.
for _ in $(seq 1 120); do
  docker logs "$name" 2>&1 | grep -q 'init process complete' && psql -c 'select 1' >/dev/null 2>&1 && break
  sleep 1
done
psql -c 'select 1' >/dev/null || { echo "throwaway database did not start" >&2; exit 1; }

# Supabase roles and extensions already exist in the image. Some errors (e.g. objects owned by
# extensions the image preinstalls) are expected, so they are counted and shown rather than fatal;
# the row counts below are the real check.
errs=$(read_dump | docker exec -i "$name" pg_restore -h /var/run/postgresql -U supabase_admin -d postgres --clean --if-exists 2>&1 >/dev/null | tee /dev/stderr | grep -c 'error:' || true)
echo "pg_restore reported $errs error line(s)"

fail=0
check() { # label, table, expected
  local n; n=$(psql -c "select count(*) from $2")
  printf '%-14s %s' "$2" "$n"
  if [[ -n "${3:-}" ]]; then
    if [[ "$n" == "$3" ]]; then printf '  (expected %s, ok)' "$3"; else printf '  (expected %s, MISMATCH)' "$3"; fail=1; fi
  fi
  echo
}
check events public.events "${EXPECT_EVENTS:-}"
check khatms public.khatms "${EXPECT_KHATMS:-}"
check juzs public.juzs "${EXPECT_JUZS:-}"
check users auth.users "${EXPECT_USERS:-}"
exit $fail
