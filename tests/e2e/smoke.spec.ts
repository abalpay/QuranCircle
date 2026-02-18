import { expect, test } from "@playwright/test";

const smokeShortCode = process.env.E2E_SMOKE_SHORT_CODE ?? "E2ESMOKE1";
const archivedShortCode = process.env.E2E_ARCHIVED_SHORT_CODE ?? "E2EARCH1";

test.describe.configure({ mode: "serial" });

test.use({ viewport: { width: 390, height: 844 } });

test("home, browse, and my circles pages load without forced sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Complete the Quran/i })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

  await page.goto("/browse");
  await expect(
    page.getByRole("heading", { name: /Browse Community Khatms/i })
  ).toBeVisible();

  await page.goto("/my-circles");
  await expect(
    page.getByRole("heading", { name: "My Circles" })
  ).toBeVisible();

  await page.goto("/browse");
  await page.getByRole("link", { name: "Home" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");

  await page.getByRole("link", { name: "My Circles" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/my-circles");

  await page.getByRole("link", { name: "Browse" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/browse");
});

test("anonymous user can claim and unclaim a juz", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);
  await expect(
    page.getByRole("heading", { name: "E2E Smoke Circle" })
  ).toBeVisible();

  await expect(
    page.getByRole("tab", { name: /Available \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");

  await page.getByTitle("Tap to select Juz 1", { exact: true }).first().click();
  await expect(page.getByText("1 Juz selected")).toBeVisible();

  await page.getByRole("button", { name: "Claim" }).click();
  await page.getByLabel("Your Name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Claim Juz" }).click();

  await expect(page.getByRole("button", { name: "Go to My Juz" })).toBeVisible();
  await page.getByRole("button", { name: "Go to My Juz" }).click();

  const myJuzTab = page.getByRole("tab", { name: /My Juz \(1\)/ });
  await expect(myJuzTab).toBeVisible();
  await expect(myJuzTab).toHaveAttribute("data-state", "active");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter"))
    .toBe("mine");

  await page.getByRole("button", { name: "Unclaim" }).click();
  await expect(page.getByText("No My Juz in this khatm")).toBeVisible();
});

test("global filter persists in URL across reload", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);
  const allTab = page.getByRole("tab", { name: /All \(\d+\)/ });
  await allTab.click();
  await expect(allTab).toHaveAttribute("data-state", "active", {
    timeout: 500,
  });

  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter"))
    .toBe("all");
  await expect(page.getByText("Updating...", { exact: true })).toHaveCount(0);

  await page.reload();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter"))
    .toBe("all");
  await expect(allTab).toHaveAttribute("data-state", "active");
});

test("filter state follows URL during browser back and forward", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}?filter=all`);
  await expect(page.getByRole("tab", { name: /All \(\d+\)/ })).toHaveAttribute(
    "data-state",
    "active"
  );

  await page.goto(`/s/${smokeShortCode}?filter=mine`);
  await expect(
    page.getByRole("tab", { name: /My Juz \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");

  await page.goBack();
  await expect(page.getByRole("tab", { name: /All \(\d+\)/ })).toHaveAttribute(
    "data-state",
    "active"
  );

  await page.goForward();
  await expect(
    page.getByRole("tab", { name: /My Juz \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");
});

test("invalid filter query falls back to available view", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}?filter=invalid`);
  await expect(
    page.getByRole("tab", { name: /Available \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");
});

test("claimed tiles in grid do not mark juz as read", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);
  await page.getByTitle("Tap to select Juz 1", { exact: true }).first().click();
  await page.getByRole("button", { name: "Claim" }).click();
  await page.getByLabel("Your Name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Claim Juz" }).click();

  await expect(page.getByRole("button", { name: "Go to My Juz" })).toBeVisible();

  await page.getByRole("tab", { name: /All \(\d+\)/ }).click();
  await page.getByTitle(/Juz 1 .*Smoke/).first().click();

  await page.getByRole("tab", { name: /My Juz \(1\)/ }).click();
  await expect(page.getByRole("button", { name: "Mark Read" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);

  await page.getByRole("button", { name: "Unclaim" }).click();
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

test("archived circles block claim interactions", async ({ page }) => {
  await page.goto(`/s/${archivedShortCode}`);
  await expect(
    page.getByRole("heading", { name: "E2E Archived Circle" })
  ).toBeVisible();
  await page.getByTitle("Juz 1", { exact: true }).first().click();
  await expect(page.getByText("1 Juz selected")).toHaveCount(0);
});
