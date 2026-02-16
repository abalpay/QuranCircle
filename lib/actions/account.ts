"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch (e) {
    console.error("[deleteAccount] Failed to create admin client:", e);
    return { error: "Server configuration error. Please contact support." };
  }

  // Unclaim all juzs claimed by this user
  const { error: juzError } = await adminSupabase
    .from("juzs")
    .update({
      claimed_by_name: null,
      claimed_by_user_id: null,
      device_token: null,
      status: "unclaimed",
      claimed_at: null,
      read_at: null,
    })
    .eq("claimed_by_user_id", user.id);
  if (juzError) console.error("[deleteAccount] juz cleanup error:", juzError);

  // Delete user's bookmarks
  const { error: bookmarkError } = await adminSupabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id);
  if (bookmarkError) console.error("[deleteAccount] bookmark cleanup error:", bookmarkError);

  // Nullify created_by on user's events (preserve events for other participants)
  const { error: eventError } = await adminSupabase
    .from("events")
    .update({ created_by: null })
    .eq("created_by", user.id);
  if (eventError) console.error("[deleteAccount] event cleanup error:", eventError);

  // Delete the auth user
  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[deleteAccount] admin.deleteUser error:", error);
    return { error: "Failed to delete account. Please try again." };
  }

  // Sign out the current session
  await supabase.auth.signOut();

  revalidatePath("/");
  return {};
}
