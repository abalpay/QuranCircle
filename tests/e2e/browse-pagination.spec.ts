import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase env for browse pagination E2E tests.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FIXTURE_EVENT_COUNT = 30;
const fixtureEventIds: string[] = [];
let fixtureToken = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  fixtureToken = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const baseTime = Date.now();
  const rows = Array.from({ length: FIXTURE_EVENT_COUNT }, (_, index) => {
    const id = randomUUID();
    fixtureEventIds.push(id);
    const sequence = String(index + 1).padStart(2, "0");
    return {
      id,
      name: `Browse Pagination ${fixtureToken} ${sequence}`,
      description: `Fixture ${fixtureToken} ${sequence}`,
      is_public: true,
      created_by: null,
      short_code: `BPG${fixtureToken}${sequence}`,
      is_archived: false,
      archived_at: null,
      created_at: new Date(baseTime + index * 1_000).toISOString(),
    };
  });

  const { error } = await admin.from("events").insert(rows);
  if (error) {
    throw new Error(`Failed to seed pagination events: ${error.message}`);
  }
});

test.afterAll(async () => {
  if (fixtureEventIds.length === 0) return;
  await admin.from("events").delete().in("id", fixtureEventIds);
});

test("browse page loads additional cursor pages", async ({ page }) => {
  await page.goto("/browse");
  await page.getByPlaceholder("Search circles...").fill(fixtureToken);

  const fixtureCards = page.locator("h2", {
    hasText: new RegExp(`Browse Pagination ${fixtureToken}`),
  });
  await expect(fixtureCards).toHaveCount(12);

  // Page size is 12, total fixtures is 30. Need to click "Load more" until all are loaded.
  while (await page.getByRole("button", { name: "Load more circles" }).isVisible()) {
    await page.getByRole("button", { name: "Load more circles" }).click();
    // Wait for new items to load
    await page.waitForTimeout(1000);
  }
  await expect(fixtureCards).toHaveCount(FIXTURE_EVENT_COUNT);
  await expect(
    page.getByRole("button", { name: "Load more circles" })
  ).toHaveCount(0);
});
