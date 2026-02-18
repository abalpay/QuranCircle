import { expect, test, type Page } from "@playwright/test";

const smokeShortCode = process.env.E2E_SMOKE_SHORT_CODE ?? "E2ESMOKE1";
const archivedShortCode = process.env.E2E_ARCHIVED_SHORT_CODE ?? "E2EARCH1";

test.describe.configure({ mode: "serial" });

test.use({ viewport: { width: 390, height: 844 } });

async function dismissInstallPromptIfVisible(page: Page) {
  const notNowButton = page.getByRole("button", { name: "Not now" });
  const promptVisible = await notNowButton.isVisible().catch(() => false);
  if (!promptVisible) return;

  await notNowButton.click();
  await expect(
    page.getByRole("heading", {
      name: /Install QuranCircle|Keep your circle one tap away/,
    })
  ).toHaveCount(0);
}

test("home, browse, and my circles pages load without forced sign-in", async ({ page }) => {
  const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });

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
  await mobileNav.getByRole("link", { name: "Home" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");

  await mobileNav.getByRole("link", { name: "My Circles", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/my-circles");

  await mobileNav.getByRole("link", { name: "Browse", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/browse");
});

test("anonymous user can claim and unclaim a juz", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);
  await expect(
    page.getByRole("heading", { name: "E2E Smoke Circle" })
  ).toBeVisible();

  await expect(
    page.getByRole("tab", { name: /All \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");

  const selectableJuz = page.locator('[title^="Tap to select Juz"]').first();
  await expect(selectableJuz).toBeVisible();
  const selectableTitle = await selectableJuz.getAttribute("title");
  const selectedJuzNumber = Number(selectableTitle?.match(/Juz (\d+)/)?.[1] ?? 0);
  expect(selectedJuzNumber).toBeGreaterThan(0);
  await selectableJuz.click();
  await expect(page.getByText("1 Juz selected")).toBeVisible();

  await page.getByRole("button", { name: "Claim" }).click();
  await page.getByLabel("Your Name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Claim Juz" }).click();

  await expect(page.getByRole("tab", { name: /All \(\d+\)/ })).toHaveAttribute(
    "data-state",
    "active"
  );
  await expect(page.getByTitle(new RegExp(`Juz ${selectedJuzNumber} .*Smoke`)).first()).toBeVisible();

  await expect(page.getByRole("button", { name: "Go to My Juz" })).toBeVisible();
  await page.getByRole("button", { name: "Go to My Juz" }).click();

  const myJuzTab = page.getByRole("tab", { name: /My Juz \(1\)/ });
  await expect(myJuzTab).toBeVisible();
  await expect(myJuzTab).toHaveAttribute("data-state", "active");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter"))
    .toBe("mine");

  const quranLink = page.getByRole("link", {
    name: new RegExp(
      `Open Juz ${selectedJuzNumber} on Quran\\.com \\(opens in new tab\\)`
    ),
  });
  await expect(quranLink).toBeVisible();
  await expect(quranLink).toHaveAttribute(
    "href",
    `https://quran.com/juz/${selectedJuzNumber}`
  );
  await expect(quranLink).toHaveAttribute("target", "_blank");

  await dismissInstallPromptIfVisible(page);
  await page.getByRole("button", { name: "Unclaim" }).click();
  await expect(page.getByText("No My Juz in this khatm")).toBeVisible();
});

test("my juz onboarding CTA is not repeated after it has been seen", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);

  await page.getByTitle(/^Tap to select Juz \d+$/).first().click();
  await page.getByRole("button", { name: "Claim" }).click();
  await page.getByLabel("Your Name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Claim Juz" }).click();

  await dismissInstallPromptIfVisible(page);
  await expect(page.getByRole("button", { name: "Go to My Juz" })).toBeVisible();
  await page.getByRole("button", { name: "Go to My Juz" }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter"))
    .toBe("mine");
  await dismissInstallPromptIfVisible(page);
  await page.getByRole("button", { name: "Unclaim" }).click();

  await page.getByRole("tab", { name: /All \(\d+\)/ }).click();
  await page.getByTitle(/^Tap to select Juz \d+$/).first().click();
  await page.getByRole("button", { name: "Claim" }).click();
  await page.getByLabel("Your Name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Claim Juz" }).click();

  await dismissInstallPromptIfVisible(page);
  await expect(page.getByRole("button", { name: "Go to My Juz" })).toHaveCount(0);

  await page.getByRole("tab", { name: /My Juz \(1\)/ }).click();
  await dismissInstallPromptIfVisible(page);
  await page.getByRole("button", { name: "Unclaim" }).click();
});

test("global filter persists in URL across reload", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);
  const availableTab = page.getByRole("tab", { name: /Available \(\d+\)/ });
  await availableTab.click();
  await expect(availableTab).toHaveAttribute("data-state", "active", {
    timeout: 500,
  });

  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter"))
    .toBe("available");
  await expect(page.getByText("Updating...", { exact: true })).toHaveCount(0);

  await page.reload();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("filter"))
    .toBe("available");
  await expect(availableTab).toHaveAttribute("data-state", "active");
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

test("invalid filter query falls back to all view", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}?filter=invalid`);
  await expect(
    page.getByRole("tab", { name: /All \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");
});

test("non-creators ignore creator mineView query", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}?filter=mine&mineView=creator`);
  await expect(
    page.getByRole("tab", { name: /My Juz \(\d+\)/ })
  ).toHaveAttribute("data-state", "active");
  await expect(page.getByRole("tab", { name: /^Creator Queue/ })).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mineView"))
    .toBeNull();
});

test("claimed tiles in grid do not mark juz as read", async ({ page }) => {
  await page.goto(`/s/${smokeShortCode}`);
  const selectableJuz = page.locator('[title^="Tap to select Juz"]').first();
  await expect(selectableJuz).toBeVisible();
  const selectableTitle = await selectableJuz.getAttribute("title");
  const selectedJuzNumber = Number(selectableTitle?.match(/Juz (\d+)/)?.[1] ?? 0);
  expect(selectedJuzNumber).toBeGreaterThan(0);
  await selectableJuz.click();
  await page.getByRole("button", { name: "Claim" }).click();
  await page.getByLabel("Your Name").fill("Smoke Tester");
  await page.getByRole("button", { name: "Claim Juz" }).click();

  await dismissInstallPromptIfVisible(page);
  await expect(page.getByRole("button", { name: "Go to My Juz" })).toBeVisible();

  await page.getByRole("tab", { name: /All \(\d+\)/ }).click();
  await page
    .getByTitle(new RegExp(`Juz ${selectedJuzNumber} .*Smoke`))
    .first()
    .click();

  await page.getByRole("tab", { name: /My Juz \(1\)/ }).click();
  await dismissInstallPromptIfVisible(page);
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
