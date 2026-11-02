# Database backups

Weekly encrypted export of the production database, plus a monthly restore drill.
Scripts: `scripts/backup-prod-db.sh`, `scripts/restore-drill.sh` (env vars documented at the top of each).

## Rules

- Dumps hold real participant data. Store them in **private storage only** (a private repo or private bucket, or an encrypted drive). Never commit or upload them to this public repo, and do not add a workflow here that touches production data.
- Dumps are encrypted with `age`; the repo and the scheduler only ever see the **public** key. Keep the secret key (identity file) in a password manager and one offline copy. Without it a dump is useless.
- Never paste the connection string into issues, logs or shell history; export it from a password manager or a secret store.

## One-time setup (Ahmet)

1. Install `age` and a PostgreSQL client of major version 17 or newer (`brew install age libpq`; `libpq` provides `pg_dump` and `psql`).
2. `age-keygen -o ~/qc-backup-identity.txt` and store that file safely; it prints the public key (`age1...`).
3. Choose a private destination for dumps.

## Run a backup

```bash
export BACKUP_DB_URL='<direct or session-pooler connection string>'   # not the :6543 transaction pooler
export BACKUP_AGE_RECIPIENT='age1...'                                # public key only
export BACKUP_DIR="$HOME/qurancircle-backups"                        # outside this repo
scripts/backup-prod-db.sh
```

It writes `qc-prod-<UTC timestamp>.dump.age` (schemas `public`, `private`, `auth`, custom format) and `...cron-jobs.json.age` (pg_cron job definitions, which live outside those schemas), then prints each file's size and sha256. Copy both files to the private destination and record the sha256. The script refuses to run without a recipient key (`ALLOW_UNENCRYPTED=1` exists for local tests only).

To run it weekly unattended, use a **private** scheduler (a private repo's scheduled workflow with the URL and public key as secrets, or a cron job on your own machine). The same script is used either way.

## Retention

Keep the last 12 weekly dumps (about 3 months) and one per month for a year; delete older ones. The database is small, so storage is not a concern.

## Monthly restore drill

A backup that has not been restored is a guess. Once a month, with the newest dump:

```bash
export BACKUP_AGE_IDENTITY_FILE=~/qc-backup-identity.txt
EXPECT_EVENTS=... EXPECT_KHATMS=... EXPECT_JUZS=... EXPECT_USERS=... \
  scripts/restore-drill.sh path/to/qc-prod-<timestamp>.dump.age
```

It restores into a throwaway Docker container (no network, removed on exit; Docker must be running) and prints row counts for `public.events`, `public.khatms`, `public.juzs` and `auth.users`. The `EXPECT_*` values are optional: take them from a read-only count in the Supabase SQL editor around the backup time (the dump is up to a week old, so allow for growth); a mismatch makes the script exit 1. `auth.users` must be non-zero, or organizer links would break after a real restore.
Note the date and result in your private notes.
