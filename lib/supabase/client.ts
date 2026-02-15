import { createBrowserClient } from "@supabase/ssr";

function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, key };
}

export function createClient() {
  const { url, key } = getEnvVars();
  return createBrowserClient(url, key, {
    realtime: {
      timeout: 30_000,
    },
  });
}
