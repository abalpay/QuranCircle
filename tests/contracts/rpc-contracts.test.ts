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

  it("keeps application tables behind the allowlisted RPC surface", async () => {
    const anon = createAnonClient();
    const { error } = await anon.from("events").select("id").limit(1);

    expect(error).not.toBeNull();
    expect((error?.message ?? "").toLowerCase()).toContain("permission");
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

  it("keeps the account-cleanup rollout RPC non-mutating", async () => {
    const client = await createAuthenticatedClient();
    const token = randomUUID().replace(/-/g, "").slice(0, 8);
    const eventId = randomUUID();

    try {
      const {
        data: { user },
        error: userError,
      } = await client.auth.getUser();
      expect(userError).toBeNull();
      expect(user).toBeTruthy();
      if (!user) throw new Error("Compatibility RPC fixture user was not found");

      const { error: eventError } = await admin.from("events").insert({
        id: eventId,
        name: "Account deletion rollout compatibility circle",
        short_code: `SHIM${token}`,
        is_public: false,
        created_by: user.id,
      });
      expect(eventError).toBeNull();

      const { data: shimResult, error: shimError } = await client.rpc(
        "cleanup_current_user_data"
      );
      expect(shimError).toBeNull();
      expect(shimResult).toBe(true);

      const { data: eventAfter, error: eventReadError } = await admin
        .from("events")
        .select("created_by")
        .eq("id", eventId)
        .single();
      expect(eventReadError).toBeNull();
      expect(eventAfter?.created_by).toBe(user.id);
    } finally {
      await admin.from("events").delete().eq("id", eventId);
      await client.auth.signOut();
    }
  });

  it("cleans application data in the auth-user deletion transaction", async () => {
    const token = randomUUID().replace(/-/g, "").slice(0, 8);
    const eventId = randomUUID();
    const khatmId = randomUUID();
    const juzId = randomUUID();
    let userId: string | undefined;

    try {
      const { data: createdUser, error: createError } =
        await admin.auth.admin.createUser({
          email: `account-delete-${token}@e2e.local`,
          password: `Account-${token}!A`,
          email_confirm: true,
        });
      expect(createError).toBeNull();
      expect(createdUser.user).toBeTruthy();
      userId = createdUser.user?.id;
      if (!userId) throw new Error("Account deletion fixture user was not created");
      createdUserIds.push(userId);

      const { error: eventError } = await admin.from("events").insert({
        id: eventId,
        name: "Account deletion contract circle",
        short_code: `DEL${token}`,
        is_public: false,
        created_by: userId,
      });
      expect(eventError).toBeNull();

      const { error: khatmError } = await admin.from("khatms").insert({
        id: khatmId,
        event_id: eventId,
        khatm_number: 1,
      });
      expect(khatmError).toBeNull();

      const claimedAt = new Date().toISOString();
      const { error: juzError } = await admin.from("juzs").insert({
        id: juzId,
        khatm_id: khatmId,
        juz_number: 1,
        claimed_by_name: "Deletion Contract User",
        claimed_by_user_id: userId,
        status: "claimed",
        claimed_at: claimedAt,
      });
      expect(juzError).toBeNull();

      const { error: memberError } = await admin.from("event_members").insert({
        event_id: eventId,
        user_id: userId,
        role: "creator",
      });
      expect(memberError).toBeNull();

      const { error: bookmarkError } = await admin.from("bookmarks").insert({
        event_id: eventId,
        user_id: userId,
      });
      expect(bookmarkError).toBeNull();

      const { error: deleteError } =
        await admin.auth.admin.deleteUser(userId);
      expect(deleteError).toBeNull();
      createdUserIds.splice(createdUserIds.indexOf(userId), 1);

      const { data: eventAfter, error: eventReadError } = await admin
        .from("events")
        .select("created_by")
        .eq("id", eventId)
        .single();
      expect(eventReadError).toBeNull();
      expect(eventAfter?.created_by).toBeNull();

      const { data: juzAfter, error: juzReadError } = await admin
        .from("juzs")
        .select(
          "claimed_by_name, claimed_by_user_id, status, claimed_at, read_at"
        )
        .eq("id", juzId)
        .single();
      expect(juzReadError).toBeNull();
      expect(juzAfter).toEqual({
        claimed_by_name: null,
        claimed_by_user_id: null,
        status: "unclaimed",
        claimed_at: null,
        read_at: null,
      });

      const [{ data: bookmarks }, { data: memberships }] = await Promise.all([
        admin.from("bookmarks").select("id").eq("user_id", userId),
        admin.from("event_members").select("id").eq("user_id", userId),
      ]);
      expect(bookmarks).toEqual([]);
      expect(memberships).toEqual([]);
    } finally {
      await admin.from("events").delete().eq("id", eventId);
    }
  });
});
