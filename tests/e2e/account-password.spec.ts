import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase env for account password E2E tests.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAuthClient() {
  return createClient(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signInThroughUi(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Password").fill(password);
  await dialog.getByRole("button", { name: /^Login$/ }).click();
  await expect(page.getByRole("button", { name: /Salam,/ })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("password changes verify the current password before updating", async ({
  page,
}) => {
  const runToken = randomUUID().replace(/-/g, "").slice(0, 10);
  const email = `password-${runToken}@e2e.local`;
  const oldPassword = `OldPassword-${runToken}!A1`;
  const wrongPassword = `WrongPassword-${runToken}!A1`;
  const newPassword = `NewPassword-${runToken}!A2`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: oldPassword,
    email_confirm: true,
    user_metadata: { username: "Password Test" },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create password test user: ${error?.message ?? "unknown"}`);
  }

  try {
    await signInThroughUi(page, email, oldPassword);
    await page.goto("/account");

    await page.getByLabel("Current password").fill(wrongPassword);
    await page.getByLabel("New password").fill(newPassword);
    await page.getByLabel("Confirm password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(
      page.getByText("Current password could not be verified")
    ).toBeVisible();

    const oldPasswordClient = createAuthClient();
    const oldPasswordResult = await oldPasswordClient.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
    expect(oldPasswordResult.error).toBeNull();
    await oldPasswordClient.auth.signOut();

    const rejectedPasswordClient = createAuthClient();
    const rejectedPasswordResult =
      await rejectedPasswordClient.auth.signInWithPassword({
        email,
        password: newPassword,
      });
    expect(rejectedPasswordResult.error).not.toBeNull();
    await rejectedPasswordClient.auth.signOut();

    await page.getByLabel("Current password").fill(oldPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated")).toBeVisible();

    const updatedPasswordClient = createAuthClient();
    const updatedPasswordResult =
      await updatedPasswordClient.auth.signInWithPassword({
        email,
        password: newPassword,
      });
    expect(updatedPasswordResult.error).toBeNull();
    await updatedPasswordClient.auth.signOut();

    const retiredPasswordClient = createAuthClient();
    const retiredPasswordResult =
      await retiredPasswordClient.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
    expect(retiredPasswordResult.error).not.toBeNull();
    await retiredPasswordClient.auth.signOut();
  } finally {
    await admin.auth.admin.deleteUser(data.user.id);
  }
});
