import { devices, expect, test } from "@playwright/test";

const smokeShortCode = process.env.E2E_SMOKE_SHORT_CODE ?? "E2ESMOKE1";

const INSTALL_KEYS = [
  "qc_install_prompt_dismissed_v1",
  "qc_install_prompt_installed_manual_v1",
  "qc_install_prompt_claim_surface_seen_v1",
] as const;

test.use({ ...devices["iPhone 13"] });

test.describe("install prompt", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((keys: readonly string[]) => {
      for (const key of keys) {
        window.localStorage.removeItem(key);
      }
    }, INSTALL_KEYS);
  });

  test("shows fallback install prompt on mobile home", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Not now" })).toBeVisible();
  });

  test("dismissal persists across reload", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Not now" }).click();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
  });

  test("appears after successful claim on circle page", async ({ page }) => {
    await page.goto(`/s/${smokeShortCode}`);

    await page.locator('[title^="Tap to select Juz"]').first().click();
    await page.getByRole("button", { name: "Claim", exact: true }).click();
    await page.getByLabel("Your Name").fill("Install Prompt Tester");
    await page.getByRole("button", { name: "Claim Juz" }).click();

    await expect(
      page.getByRole("heading", { name: "Keep your circle one tap away" })
    ).toBeVisible({ timeout: 8_000 });

    await page.getByRole("button", { name: "Not now" }).click();

    await page.getByRole("tab", { name: /My Juz \(1\)/ }).click();
    await page.getByRole("button", { name: "Unclaim" }).click();
  });

  test("shows iOS instructions with done action", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("iPhone & iPad Steps")).toBeVisible();
    await expect(page.getByText("Add to Home", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "I Added It" }).click();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
  });

  test("does not show when running in standalone mode", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "standalone", {
        configurable: true,
        get: () => true,
      });

      const standaloneQuery = "(display-mode: standalone)";
      window.matchMedia = ((query: string) => ({
        matches: query === standaloneQuery,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
  });

  test("does not block mobile nav actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toBeVisible();

    await page.locator("nav").getByRole("link", { name: "Browse" }).click();

    await expect(page).toHaveURL(/\/browse$/);
    await expect(
      page.getByRole("heading", { name: /Browse Community Khatms/i })
    ).toBeVisible();
  });
});
