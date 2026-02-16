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

  const adminSupabase = createAdminClient();

  // Unclaim all juzs claimed by this user
  await adminSupabase
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

  // Delete user's bookmarks
  await adminSupabase.from("bookmarks").delete().eq("user_id", user.id);

  // Nullify created_by on user's events (preserve events for other participants)
  await adminSupabase
    .from("events")
    .update({ created_by: null })
    .eq("created_by", user.id);

  // Delete the auth user
  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: "Failed to delete account. Please try again." };
  }

  // Sign out the current session
  await supabase.auth.signOut();

  revalidatePath("/");
  return {};
}
