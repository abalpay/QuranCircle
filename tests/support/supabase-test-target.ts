const LOCAL_SUPABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

// Remote E2E is permitted only for an intentionally disposable environment.
// The production project is an unconditional deny target: ALLOW_REMOTE_E2E is
// never allowed to override this guard.
const PRODUCTION_SUPABASE_HOSTS = new Set([
  "vbxdcuucynuneqanrquw.supabase.co",
]);

type TestEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  ALLOW_REMOTE_E2E?: string;
};

export function assertSafeSupabaseTestTarget(
  env: TestEnvironment = process.env
): void {
  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  // Missing variables are reported by the calling test configuration with its
  // complete list of required values.
  if (!rawUrl) return;

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid URL before destructive tests can run."
    );
  }

  // DNS treats a terminal dot as the same absolute hostname. Normalize it so
  // an equivalent FQDN cannot bypass either the production denylist or the
  // local-only default.
  const targetHostname = target.hostname.toLowerCase().replace(/\.+$/, "");

  if (PRODUCTION_SUPABASE_HOSTS.has(targetHostname)) {
    throw new Error(
      `Refusing to run destructive contract/E2E tests against the production Supabase host ${targetHostname}. ` +
        "This target cannot be enabled with ALLOW_REMOTE_E2E."
    );
  }

  if (
    !LOCAL_SUPABASE_HOSTS.has(targetHostname) &&
    env.ALLOW_REMOTE_E2E !== "1"
  ) {
    throw new Error(
      `Refusing to run destructive contract/E2E tests against remote Supabase host ${targetHostname}. ` +
        "Use the local Supabase stack, or set ALLOW_REMOTE_E2E=1 only for an intentionally isolated disposable project."
    );
  }
}
