import { expect, test } from "@playwright/test";

test.describe("Arabic locale routing and direction", () => {
  test.use({ locale: "ar-SA", viewport: { width: 390, height: 844 } });

  test("detects Arabic, renders RTL, and keeps navigation localized", async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.goto("/");

    await expect.poll(() => new URL(page.url()).pathname).toBe("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /أتموا ختمة.*القرآن جماعةً/i,
      }),
    ).toBeVisible();

    await page.getByRole("link", { name: "تصفح", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/ar/browse");
    await expect(
      page.getByRole("heading", { name: /تصفح ختمات المجتمع/ }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "تسجيل الدخول", exact: true })
      .click();
    await page.getByRole("combobox", { name: "اللغة" }).click();
    await page.getByRole("option", { name: "English" }).click();

    await expect.poll(() => new URL(page.url()).pathname).toBe("/browse");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("an explicit saved preference wins over browser detection", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "tr",
        url: test.info().project.use.baseURL as string,
      },
    ]);

    await page.goto("/");

    await expect.poll(() => new URL(page.url()).pathname).toBe("/tr");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
});
