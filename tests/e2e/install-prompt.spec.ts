import { devices, expect, test, type Page } from "@playwright/test";

const smokeShortCode = process.env.E2E_SMOKE_SHORT_CODE ?? "E2ESMOKE1";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const INSTALL_KEYS = [
  "qc_install_prompt_dismissed_v1",
  "qc_install_prompt_installed_manual_v1",
  "qc_install_prompt_claim_surface_seen_v1",
  "qc_install_prompt_home_snooze_until_v1",
  "qc_install_prompt_reset_for_pill_v1",
] as const;
const INSTALL_KEYS_RESET_GUARD = "qc_install_prompt_test_keys_cleared_v1";
const INSTALL_PROMPT_TEST_NOW_KEY = "qc_install_prompt_mock_now_v1";

async function setMockNow(page: Page, now: number) {
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, String(value));
    },
    { key: INSTALL_PROMPT_TEST_NOW_KEY, value: now }
  );
}

test.use({ ...devices["iPhone 13"] });

test.describe("install prompt", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({
        keys,
        guardKey,
        nowKey,
      }: {
        keys: readonly string[];
        guardKey: string;
        nowKey: string;
      }) => {
        const nativeNow = Date.now.bind(Date);
        Object.defineProperty(Date, "now", {
          configurable: true,
          value: () => {
            const value = window.localStorage.getItem(nowKey);
            const parsed = value ? Number(value) : Number.NaN;
            return Number.isFinite(parsed) ? parsed : nativeNow();
          },
        });

        if (window.sessionStorage.getItem(guardKey) === "1") {
          return;
        }
        for (const key of keys) {
          window.localStorage.removeItem(key);
        }
        window.sessionStorage.setItem(guardKey, "1");
      },
      {
        keys: INSTALL_KEYS,
        guardKey: INSTALL_KEYS_RESET_GUARD,
        nowKey: INSTALL_PROMPT_TEST_NOW_KEY,
      }
    );
  });

  test("shows install pill on mobile home without auto-opening sheet", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "Open install instructions" })
    ).toBeVisible();
    await expect(page.getByText("Add to Home Screen", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
  });

  test("opens install sheet when pill is tapped", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Open install instructions" }).click();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Not now" })).toBeVisible();
  });

  test("home snooze persists across reload", async ({ page }) => {
    const baseNow = 1_700_000_000_000;

    await page.goto("/");
    await setMockNow(page, baseNow);

    await page.getByRole("button", { name: "Open install instructions" }).click();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open install instructions" })
    ).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open install instructions" })
    ).toHaveCount(0);
  });

  test("home pill returns after snooze expires", async ({ page }) => {
    const baseNow = 1_700_000_000_000;

    await page.goto("/");
    await setMockNow(page, baseNow);

    await page.getByRole("button", { name: "Open install instructions" }).click();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(
      page.getByRole("button", { name: "Open install instructions" })
    ).toHaveCount(0);

    await setMockNow(page, baseNow + 8 * DAY_IN_MS);
    await page.reload();

    await expect(
      page.getByRole("button", { name: "Open install instructions" })
    ).toBeVisible();
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
    await page.getByRole("button", { name: "Open install instructions" }).click();

    await expect(page.getByText("iPhone & iPad Steps")).toBeVisible();
    await expect(page.getByText("Add to Home", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "I Added It" }).click();
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open install instructions" })
    ).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Open install instructions" })
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
      page.getByRole("button", { name: "Open install instructions" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);
  });

  test("does not block mobile nav actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "Open install instructions" })
    ).toBeVisible();

    await page.locator("nav").getByRole("link", { name: "Browse" }).click();

    await expect(page).toHaveURL(/\/browse$/);
    await expect(
      page.getByRole("heading", { name: /Browse Community Khatms/i })
    ).toBeVisible();
  });

  test("home snooze synchronizes across tabs via storage events", async ({
    page,
    context,
  }) => {
    const secondPage = await context.newPage();
    await page.goto("/");
    await secondPage.goto("/");

    await expect(
      secondPage.getByRole("button", { name: "Open install instructions" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Open install instructions" }).click();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(
      secondPage.getByRole("button", { name: "Open install instructions" })
    ).toHaveCount(0);
    await expect(
      secondPage.getByRole("heading", { name: "Install QuranCircle" })
    ).toHaveCount(0);

    await secondPage.close();
  });
});
