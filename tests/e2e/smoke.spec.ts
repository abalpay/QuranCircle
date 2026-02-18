import { expect, test } from "@playwright/test";

const smokeShortCode = process.env.E2E_SMOKE_SHORT_CODE ?? "E2ESMOKE1";
const lockedShortCode = process.env.E2E_LOCKED_SHORT_CODE ?? "E2ELOCK1";
const archivedShortCode = process.env.E2E_ARCHIVED_SHORT_CODE ?? "E2EARCH1";

test.describe.configure({ mode: "serial" });

function activeTabPanel(page: import("@playwright/test").Page) {
  return page.locator('[role="tabpanel"][data-state="active"]');
}

test("home and browse pages load without forced sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Complete the Quran/i })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

  await page.goto("/browse");
  await expect(
    page.getByRole("heading", { name: /Browse Community Khatms/i })
  ).toBeVisible();
});

test("anonymous user can claim and unclaim a juz", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);
  await expect(
    page.getByRole("heading", { name: "E2E Smoke Circle" })
  ).toBeVisible();

  await activeTabPanel(page)
    .getByTitle("Tap to claim Juz 1", { exact: true })
    .first()
    .click();
  await expect(page.getByText("1 Juz selected")).toBeVisible();

  await page.getByRole("button", { name: "Claim" }).click();
  await page.getByLabel("Your Name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Claim Juz" }).click();

  const myJuzTab = page.getByRole("tab", { name: /My Juz \(1\)/ });
  await expect(myJuzTab).toBeVisible();
  await myJuzTab.click();

  await page.getByRole("button", { name: "Unclaim" }).click();
  await expect(page.getByText("You haven't claimed any juz yet.")).toBeVisible();
});

test("anonymous users are blocked from account and create-circle management", async ({
  page,
}) => {
  await page.goto("/account");
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe("/");

  await page.getByRole("button", { name: /Start A Khatm Circle/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Login" })).toBeVisible();
});

test("locked and archived circles block claim interactions", async ({ page }) => {
  await page.goto(`/s/${lockedShortCode}`);
  await expect(page.getByText("Locked", { exact: true }).first()).toBeVisible();
  await activeTabPanel(page).getByTitle("Juz 1", { exact: true }).first().click();
  await expect(page.getByText("1 Juz selected")).toHaveCount(0);

  await page.goto(`/s/${archivedShortCode}`);
  await expect(
    page.getByRole("heading", { name: "E2E Archived Circle" })
  ).toBeVisible();
  await activeTabPanel(page).getByTitle("Juz 1", { exact: true }).first().click();
  await expect(page.getByText("1 Juz selected")).toHaveCount(0);
});
