"""Test security migrations using synthetic data in a disposable, network-isolated PG.
Requires Docker and the Supabase PostgreSQL image used by local development.
Never connects to a configured project database or reads any .env file.
"""
from pathlib import Path
import re
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / 'supabase/migrations'
NAME = 'qurancircle-security-' + uuid.uuid4().hex[:10]
IMAGE = 'public.ecr.aws/supabase/postgres:17.6.1.167'


def run_sql(sql):
    result = subprocess.run(
        ['docker', 'exec', '-i', NAME, 'psql', '-h', '/tmp', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
        input=sql, text=True, capture_output=True, check=False,
    )
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    for line in result.stderr.splitlines():
        if 'PASS' in line:
            print(line)


def extract(file, name):
    source = (MIGRATIONS / file).read_text()
    return re.search(r'CREATE OR REPLACE FUNCTION public\.' + name + r'\([\s\S]*?\n\$\$;', source).group(0)


subprocess.run(['docker', 'run', '--rm', '-d', '--name', NAME, '--network', 'none', '--user', 'postgres', '--entrypoint', '/bin/bash', IMAGE, '-c', 'initdb -D /tmp/security-pg -A trust >/tmp/security-init.log && exec postgres -D /tmp/security-pg -c listen_addresses="" -c unix_socket_directories=/tmp'], check=True, capture_output=True)
try:
    for _ in range(100):
        ready = subprocess.run(['docker', 'exec', NAME, 'pg_isready', '-h', '/tmp'], capture_output=True)
        if ready.returncode == 0:
            break
        time.sleep(0.2)
    else:
        raise RuntimeError('Isolated PostgreSQL did not become ready')
    sql = """
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,is_anonymous boolean NOT NULL DEFAULT false);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE FUNCTION public.current_auth_is_non_anonymous() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() IS NOT NULL AND COALESCE((auth.jwt()->>'is_anonymous')::boolean,false)=false $$;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
"""
    sql += (MIGRATIONS / '00001_initial_schema.sql').read_text()
    sql += (MIGRATIONS / '00009_identity_foundation.sql').read_text()
    sql += 'ALTER TABLE public.khatms ADD completed_at timestamptz; CREATE UNIQUE INDEX khatm_unique ON public.khatms(event_id,khatm_number) WHERE is_deleted=false; CREATE UNIQUE INDEX juz_unique ON public.juzs(khatm_id,juz_number);'
    for file, names in [
        ('00012_mutation_rpcs.sql', ['unclaim_juz','mark_juz_read','unmark_juz_read']),
        ('00025_remove_lock_feature.sql', ['claim_juz_batch']),
        ('00023_validate_create_event_rpc_short_code.sql', ['create_event_with_initial_khatm']),
        ('00028_snapshot_windowed_read_rpc.sql', ['get_event_snapshot_by_shortcode']),
        ('20260725044903_add_khatm_completion_metrics.sql', ['mark_juz_read_with_completion']),
    ]:
        for name in names:
            sql += extract(file,name) + '\n'
    run_sql(sql)
    for suffix in ['fix_juz_authorization','bound_rpc_inputs_and_work']:
        run_sql(next(MIGRATIONS.glob('*_' + suffix + '.sql')).read_text())
    for file in ['juz-authorization.sql','rpc-limits.sql']:
        run_sql((ROOT / 'tests/security' / file).read_text())
    print('Database security regressions passed.')
finally:
    subprocess.run(['docker','stop',NAME], capture_output=True)
