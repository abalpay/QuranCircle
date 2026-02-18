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

  const { error: cleanupError } = await supabase.rpc("cleanup_current_user_data");
  if (cleanupError) {
    console.error("[deleteAccount] cleanup_current_user_data error:", cleanupError);
    return { error: "Failed to clean up account data. Please try again." };
  }

  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    console.error("[deleteAccount] Failed to create admin client:", error);
    return { error: "Server configuration error. Please contact support." };
  }

  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[deleteAccount] admin.deleteUser error:", deleteError);
    return { error: "Failed to delete account. Please try again." };
  }

  await supabase.auth.signOut();
  revalidatePath("/");
  return {};
}
