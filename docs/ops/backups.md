# Database backups

Weekly encrypted export of the production database, plus a monthly restore drill.
Scripts: `scripts/backup-prod-db.sh`, `scripts/restore-drill.sh` (env vars documented at the top of each).

## Rules

- Dumps hold real participant data. Store them in **private storage only** (a private repo or private bucket, or an encrypted drive). Never commit or upload them to this public repo, and do not add a workflow here that touches production data.
- Dumps are encrypted with `age`; the repo and the scheduler only ever see the **public** key. Keep the secret key (identity file) in a password manager and one offline copy. Without it a dump is useless.
- A dump contains refresh tokens, sessions, password hashes and IP addresses. Treat the age identity file as sensitive as the service-role key.
- The connection URL must have **no password** (the script refuses one). Put the password in `PGPASSWORD` or `~/.pgpass` (mode 600), never in shell history or an issue.
- Never paste drill or backup output into issues or PRs (counts and sizes are fine only in private notes).

## One-time setup (Ahmet)

1. Install `age` and a PostgreSQL client of major version 17 or newer (`brew install age libpq`; `libpq` provides `pg_dump` and `psql`). Homebrew's `libpq` is keg-only, so add `export PATH="$(brew --prefix libpq)/bin:$PATH"` to your shell profile, and to the PATH of any cron job or scheduler that runs the backup.
2. `age-keygen -o ~/qc-backup-identity.txt` (it prints the public key `age1...`). Store the identity in a password manager and delete the loose file, or protect it with a passphrase (`age -p -o identity.age ~/qc-backup-identity.txt`) and decrypt it only for drills.
3. Choose a private destination for dumps.

## Run a backup

```bash
export BACKUP_DB_URL='postgresql://USER@HOST:5432/postgres'          # no password; not the :6543 pooler
export PGPASSWORD="$(<from your password manager>)"                  # or use ~/.pgpass
export BACKUP_AGE_RECIPIENT='age1...'                                # public key only
export BACKUP_DIR="$HOME/qurancircle-backups"                        # outside this repo
scripts/backup-prod-db.sh
```

It writes `qc-prod-<UTC timestamp>.dump.age` (schemas `public`, `private`, `auth`, custom format) and `...cron-jobs.json.age` (pg_cron job definitions, which live outside those schemas), then prints each file's size and sha256. Copy both files to the private destination and record the sha256. The script refuses to run without a recipient key, and refuses a URL that contains a password.

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
The drill proves the dump is readable and complete, not that a restore into Supabase works. Note the date and result in your private notes only.

The drill container is removed (with its volume) on exit. After a crash or Ctrl-C, sweep leftovers:

```bash
docker ps -a --filter name=qc-restore-drill-     # remove any with: docker rm -f -v <name>
docker volume ls                                 # no unexplained anonymous volumes should remain
```
