import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.qurancircle.io";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeEnv(value) {
  return (value ?? "").replace(/\\n/g, "").trim();
}

async function expectVisible(locator, label, timeout = 15000) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
  } catch {
    throw new Error(`Expected visible: ${label}`);
  }
}

function randomSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

const supabaseUrl = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

assert(supabaseUrl, "Missing NEXT_PUBLIC_SUPABASE_URL");
assert(serviceRoleKey, "Missing SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = randomSuffix();
const tempEmail = `codex-prod-smoke-${suffix}@example.com`;
const tempPassword = `Sm0ke!${suffix}Aa`;
const tempUsername = `smoke${suffix.slice(-6)}`;
const circleName = `Prod Smoke ${suffix}`;

const userResult = await admin.auth.admin.createUser({
  email: tempEmail,
  password: tempPassword,
  email_confirm: true,
  user_metadata: {
    username: tempUsername,
  },
});

if (userResult.error || !userResult.data.user) {
  throw new Error(`Failed to create temp user: ${userResult.error?.message ?? "unknown"}`);
}

const tempUserId = userResult.data.user.id;
const browser = await chromium.launch({ headless: true });
let circleUrl;

try {
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();

  await anonPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await expectVisible(
    anonPage.getByRole("heading", { name: /Complete the Quran/i }),
    "Home heading"
  );
  await expectVisible(
    anonPage.getByRole("button", { name: "Sign In" }),
    "Sign In button"
  );

  await anonPage.goto(`${BASE_URL}/browse`, { waitUntil: "networkidle" });
  await expectVisible(
    anonPage.getByRole("heading", { name: /Browse Community Khatms/i }),
    "Browse heading"
  );

  await anonPage.goto(`${BASE_URL}/account`, { waitUntil: "networkidle" });
  await anonPage.waitForTimeout(1200);
  const accountPath = new URL(anonPage.url()).pathname;
  assert(accountPath === "/", `Anonymous /account did not redirect to / (got ${accountPath})`);

  await anonContext.close();

  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();

  await authPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await authPage.getByRole("button", { name: "Sign In" }).click();

  const loginDialog = authPage.getByRole("dialog");
  await expectVisible(loginDialog, "Login dialog");

  await loginDialog.getByLabel("Email").fill(tempEmail);
  await loginDialog.getByLabel("Password").fill(tempPassword);
  await loginDialog.locator("form button[type='submit']").first().click();
  await loginDialog.waitFor({ state: "hidden", timeout: 20000 });

  await authPage.getByRole("button", { name: /Start A Khatm Circle/i }).click();

  const createDialog = authPage.getByRole("dialog");
  await expectVisible(
    createDialog.getByRole("heading", { name: /Create New Khatm Circle/i }),
    "Create circle dialog"
  );

  await createDialog.getByLabel("Circle Name").fill(circleName);
  await createDialog.getByLabel("Description \(Optional\)").fill(
    "Automated production smoke validation"
  );
  await createDialog.getByRole("button", { name: "Create Circle" }).click();

  await authPage.waitForURL(/\/s\/[A-Za-z0-9]{8}/, { timeout: 20000 });
  circleUrl = authPage.url();
  await expectVisible(
    authPage.getByRole("heading", { name: circleName }),
    "Created circle heading"
  );

  await authContext.close();

  const claimContext = await browser.newContext();
  const claimPage = await claimContext.newPage();

  await claimPage.goto(circleUrl, { waitUntil: "networkidle" });
  await expectVisible(
    claimPage.getByRole("heading", { name: circleName }),
    "Smoke circle page"
  );

  await claimPage.getByTitle("Tap to select Juz 1", { exact: true }).first().click();
  await expectVisible(claimPage.getByText("1 Juz selected"), "Juz selected label");

  await claimPage.getByRole("button", { name: "Claim" }).click();
  await claimPage.getByLabel("Your Name").fill("Prod Smoke");
  await claimPage.getByRole("button", { name: "Claim Juz" }).click();

  await expectVisible(
    claimPage.getByRole("button", { name: "Go to My Juz" }),
    "Go to My Juz button"
  );
  await claimPage.getByRole("button", { name: "Go to My Juz" }).click();

  await expectVisible(
    claimPage.getByRole("tab", { name: /My Juz \(1\)/ }),
    "My Juz tab"
  );
  await claimPage.getByRole("button", { name: "Unclaim" }).click();
  await expectVisible(claimPage.getByText("No My Juz in this khatm"), "Unclaim confirmation");

  await claimContext.close();

  console.log(`PASS: Production smoke succeeded (circle: ${circleUrl}; user: ${tempEmail})`);
} finally {
  await browser.close();

  const deleteResult = await admin.auth.admin.deleteUser(tempUserId);
  if (deleteResult.error) {
    console.error(`WARN: failed to delete temp user ${tempUserId}: ${deleteResult.error.message}`);
  }
}
