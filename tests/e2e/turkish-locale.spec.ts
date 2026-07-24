import { expect, test } from "@playwright/test";

test.describe("Turkish locale routing", () => {
  test.use({ locale: "tr-TR", viewport: { width: 390, height: 844 } });

  test("detects Turkish, renders Turkish, and keeps navigation localized", async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.goto("/");

    await expect.poll(() => new URL(page.url()).pathname).toBe("/tr");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Grupça Kur'an'ı birlikte hatmedin/i,
      }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Göz At", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/tr/browse");
    await expect(
      page.getByRole("heading", { name: "Açık Hatim Halkalarını Keşfedin" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Giriş Yap", exact: true }).click();
    await page.getByRole("button", { name: "İngilizceye geç" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/browse");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { name: "Browse Community Khatms" }),
    ).toBeVisible();
  });

  test("an invalid locale cookie cannot prevent Turkish detection", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "invalid",
        url: test.info().project.use.baseURL as string,
      },
    ]);

    await page.goto("/");

    await expect.poll(() => new URL(page.url()).pathname).toBe("/tr");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  });
});
