import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${key}. Run 'supabase start && supabase db reset --local --yes' and export local Supabase env before running contract tests.`
    );
  }
  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const createdUserIds: string[] = [];

function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertNoFunctionSignatureDrift(
  error:
    | {
        message?: string | null;
        details?: string | null;
      }
    | null
    | undefined,
  functionName: string
) {
  const message = (error?.message ?? "").toLowerCase();
  const details = (error?.details ?? "").toLowerCase();
  expect(message).not.toContain("could not find the function");
  expect(details).not.toContain(functionName.toLowerCase());
}

async function createAuthenticatedClient() {
  const token = randomUUID().replace(/-/g, "").slice(0, 8);
  const email = `contracts-${token}@e2e.local`;
  const password = `Contracts-${token}!A`;

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: "Contract Tester" },
  });
  if (!createdUser.user || createError) {
    throw new Error(
      `Failed to create authenticated contract user: ${
        createError?.message ?? "unknown"
      }`
    );
  }
  createdUserIds.push(createdUser.user.id);

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    throw new Error(`Failed to sign in contract user: ${signInError.message}`);
  }
  return client;
}

describe("RPC contract checks", () => {
  afterAll(async () => {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("supports windowed snapshot RPC args", async () => {
    const { data, error } = await admin.rpc("get_event_snapshot_by_shortcode", {
      p_short_code: "E2ESMOKE1",
      p_khatm_limit: 3,
      p_before_khatm_number: 2,
    });

    assertNoFunctionSignatureDrift(error, "get_event_snapshot_by_shortcode");
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("supports public-events cursor RPC args", async () => {
    const { data, error } = await admin.rpc("list_public_events_with_progress", {
      p_limit: 5,
      p_before_created_at: new Date().toISOString(),
      p_before_id: randomUUID(),
    });

    assertNoFunctionSignatureDrift(error, "list_public_events_with_progress");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("allows public read RPCs for raw anon role", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.rpc("list_public_events_with_progress", {
      p_limit: 5,
      p_before_created_at: new Date().toISOString(),
      p_before_id: randomUUID(),
    });

    assertNoFunctionSignatureDrift(error, "list_public_events_with_progress");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("blocks mutation RPCs for raw anon role", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("claim_juz_batch", {
      p_short_code: "E2ESMOKE1",
      p_khatm_id: randomUUID(),
      p_juz_numbers: [1],
      p_claimer_name: "Anon Contract Tester",
    });

    expect(error).not.toBeNull();
    expect((error?.message ?? "").toLowerCase()).toContain("permission");
  });

  it("blocks legacy merge RPC for authenticated clients", async () => {
    const client = await createAuthenticatedClient();
    try {
      const { error } = await client.rpc("merge_anonymous_identity", {
        p_source_user_id: randomUUID(),
      });

      expect(error).not.toBeNull();
      expect((error?.message ?? "").toLowerCase()).toContain("permission");
    } finally {
      await client.auth.signOut();
    }
  });

  it("blocks privileged merge RPC for authenticated clients", async () => {
    const client = await createAuthenticatedClient();
    try {
      const { error } = await client.rpc("merge_anonymous_identity_for_target", {
        p_source_user_id: randomUUID(),
        p_target_user_id: randomUUID(),
      });

      expect(error).not.toBeNull();
      expect((error?.message ?? "").toLowerCase()).toContain("permission");
    } finally {
      await client.auth.signOut();
    }
  });

  it("allows privileged merge RPC for service-role client", async () => {
    const { error } = await admin.rpc("merge_anonymous_identity_for_target", {
      p_source_user_id: randomUUID(),
      p_target_user_id: randomUUID(),
    });

    assertNoFunctionSignatureDrift(error, "merge_anonymous_identity_for_target");
    expect((error?.message ?? "").toLowerCase()).not.toContain("permission");
  });
});
