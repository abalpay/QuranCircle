import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase env for merge security E2E tests.");
}

const admin = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAnonClient() {
  return createClient(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createPasswordUser(email: string, password: string, username: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create user: ${error?.message ?? "unknown"}`);
  }
  return data.user;
}

test.describe.configure({ mode: "serial" });

test("authenticated clients cannot execute legacy merge RPC directly", async () => {
  const runToken = randomUUID().replace(/-/g, "").slice(0, 8);
  const email = `merge-client-${runToken}@e2e.local`;
  const password = `MergeClient-${runToken}!A`;
  const user = await createPasswordUser(email, password, "Merge Client");

  const client = createAnonClient();
  try {
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    expect(signInError).toBeNull();

    const { error: mergeError } = await client.rpc("merge_anonymous_identity", {
      p_source_user_id: randomUUID(),
    });

    expect(mergeError).not.toBeNull();
    expect((mergeError?.message ?? "").toLowerCase()).toContain("permission");
  } finally {
    await client.auth.signOut();
    await admin.auth.admin.deleteUser(user.id);
  }
});

test("service-role merge RPC transfers ownership to explicit target", async () => {
  const runToken = randomUUID().replace(/-/g, "").slice(0, 8);
  const targetEmail = `merge-target-${runToken}@e2e.local`;
  const targetPassword = `MergeTarget-${runToken}!A`;
  const targetUser = await createPasswordUser(
    targetEmail,
    targetPassword,
    "Merge Target"
  );

  const sourceClient = createAnonClient();
  let sourceUserId: string | null = null;
  const eventId = randomUUID();
  const khatmId = randomUUID();
  const shortCode = `MSEC${runToken.toUpperCase()}`;

  try {
    const { data: anonSignIn, error: anonSignInError } =
      await sourceClient.auth.signInAnonymously();
    expect(anonSignInError).toBeNull();
    sourceUserId = anonSignIn.user?.id ?? null;
    expect(sourceUserId).toBeTruthy();

    const { error: eventError } = await admin.from("events").insert({
      id: eventId,
      name: "Merge Security Circle",
      description: "Fixture for merge hardening checks.",
      is_public: false,
      created_by: sourceUserId,
      short_code: shortCode,
      is_archived: false,
      archived_at: null,
    });
    expect(eventError).toBeNull();

    const { error: memberError } = await admin.from("event_members").insert({
      event_id: eventId,
      user_id: sourceUserId,
      role: "creator",
    });
    expect(memberError).toBeNull();

    const { error: khatmError } = await admin.from("khatms").insert({
      id: khatmId,
      event_id: eventId,
      khatm_number: 1,
    });
    expect(khatmError).toBeNull();

    const { error: juzError } = await admin.from("juzs").insert({
      id: randomUUID(),
      khatm_id: khatmId,
      juz_number: 1,
      status: "claimed",
      claimed_by_name: "Anon Source",
      claimed_by_user_id: sourceUserId,
      claimed_at: new Date().toISOString(),
      read_at: null,
    });
    expect(juzError).toBeNull();

    const { data: mergeData, error: mergeError } = await admin.rpc(
      "merge_anonymous_identity_for_target",
      {
        p_source_user_id: sourceUserId,
        p_target_user_id: targetUser.id,
      }
    );

    expect(mergeError).toBeNull();
    expect((mergeData as { merged?: boolean } | null)?.merged).toBe(true);

    const { data: mergedEvent, error: mergedEventError } = await admin
      .from("events")
      .select("created_by")
      .eq("id", eventId)
      .single();
    expect(mergedEventError).toBeNull();
    expect(mergedEvent?.created_by).toBe(targetUser.id);

    const { data: mergedJuz, error: mergedJuzError } = await admin
      .from("juzs")
      .select("claimed_by_user_id")
      .eq("khatm_id", khatmId)
      .eq("juz_number", 1)
      .single();
    expect(mergedJuzError).toBeNull();
    expect(mergedJuz?.claimed_by_user_id).toBe(targetUser.id);

    const { data: sourceMembershipRows, error: sourceMembershipError } = await admin
      .from("event_members")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", sourceUserId);
    expect(sourceMembershipError).toBeNull();
    expect(sourceMembershipRows ?? []).toHaveLength(0);

    const { data: targetMembershipRows, error: targetMembershipError } = await admin
      .from("event_members")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", targetUser.id);
    expect(targetMembershipError).toBeNull();
    expect((targetMembershipRows ?? []).length).toBeGreaterThan(0);
  } finally {
    await sourceClient.auth.signOut();
    await admin.from("events").delete().eq("id", eventId);
    await admin.auth.admin.deleteUser(targetUser.id);
    if (sourceUserId) {
      await admin.auth.admin.deleteUser(sourceUserId);
    }
  }
});
