"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function isAnonymousUser(user: { is_anonymous?: boolean } | null | undefined) {
  return Boolean(user?.is_anonymous);
}

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || isAnonymousUser(user)) {
    return { error: "Not authenticated" };
  }

  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    console.error("[deleteAccount] Failed to create admin client:", error);
    return { error: "Server configuration error. Please contact support." };
  }

  // Keep this compatibility call during the rollout window. Before the
  // transactional deletion migration it performs the legacy cleanup; after the
  // migration it is an authenticated no-op and the auth.users trigger performs
  // the cleanup atomically. The database migration must still be deployed first.
  try {
    const { error: cleanupError } = await supabase.rpc(
      "cleanup_current_user_data"
    );
    if (cleanupError) {
      console.error(
        "[deleteAccount] cleanup_current_user_data error:",
        cleanupError
      );
      return { error: "Failed to clean up account data. Please try again." };
    }
  } catch (error) {
    console.error(
      "[deleteAccount] cleanup_current_user_data threw:",
      error
    );
    return { error: "Failed to clean up account data. Please try again." };
  }

  try {
    const { error: deleteError } =
      await adminSupabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[deleteAccount] admin.deleteUser error:", deleteError);
      return { error: "Failed to delete account. Please try again." };
    }
  } catch (error) {
    console.error("[deleteAccount] admin.deleteUser threw:", error);
    return { error: "Failed to delete account. Please try again." };
  }

  // Auth user deletion has already committed. Session cleanup is best-effort so
  // a transient sign-out failure cannot report the completed deletion as failed.
  try {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("[deleteAccount] signOut after deletion error:", signOutError);
    }
  } catch (error) {
    console.error("[deleteAccount] signOut after deletion threw:", error);
  }
  revalidatePath("/");
  return {};
}
