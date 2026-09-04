import { expect, test } from "@playwright/test";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const HTML_LIMITED_BOT_USER_AGENT = "facebookexternalhit/1.1";

const imageAssets = [
  { path: "/opengraph-image", width: 1200, height: 630 },
  { path: "/icon", width: 32, height: 32 },
  { path: "/apple-icon", width: 180, height: 180 },
] as const;

const locales = [
  { path: "/", lang: "en", dir: "ltr" },
  { path: "/tr", lang: "tr", dir: "ltr" },
  { path: "/ar", lang: "ar", dir: "rtl" },
] as const;

test.describe("metadata assets", () => {
  test.use({ userAgent: HTML_LIMITED_BOT_USER_AGENT });

  for (const asset of imageAssets) {
    test(`${asset.path} returns the expected PNG`, async ({ request }) => {
      const response = await request.get(asset.path);

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toMatch(/^image\/png(?:;|$)/);

      const body = await response.body();
      expect(body.subarray(0, 8)).toEqual(PNG_SIGNATURE);
      expect(body.readUInt32BE(16)).toBe(asset.width);
      expect(body.readUInt32BE(20)).toBe(asset.height);
    });
  }

  test("publishes canonical and social metadata for each public locale", async ({
    page,
  }, testInfo) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (testInfo.project.use.baseURL as string);
    const expectedOrigin = new URL(baseUrl).origin;
    for (const locale of locales) {
      const response = await page.goto(locale.path, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);

      await expect(page.locator("html")).toHaveAttribute("lang", locale.lang);
      await expect(page.locator("html")).toHaveAttribute("dir", locale.dir);

      const canonical = await page
        .locator('head link[rel="canonical"]')
        .getAttribute("href");
      const openGraphImage = await page
        .locator('head meta[property="og:image"]')
        .getAttribute("content");
      const twitterImage = await page
        .locator('head meta[name="twitter:image"]')
        .getAttribute("content");

      expect(canonical).not.toBeNull();
      expect(openGraphImage).not.toBeNull();
      expect(twitterImage).not.toBeNull();

      expect(new URL(canonical as string).pathname).toBe(locale.path);

      for (const metadataUrl of [canonical, openGraphImage, twitterImage]) {
        expect(new URL(metadataUrl as string).origin).toBe(expectedOrigin);
      }

      expect(new URL(openGraphImage as string).pathname).toBe(
        "/opengraph-image",
      );
      expect(new URL(twitterImage as string).pathname).toBe(
        "/opengraph-image",
      );
    }
  });

  test("does not emit a fallback localhost origin for root not-found metadata", async ({
    page,
  }, testInfo) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (testInfo.project.use.baseURL as string);
    const expectedOrigin = new URL(baseUrl).origin;
    const response = await page.goto("/metadata-route-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);

    const metadataUrls = await page.locator("head [href], head [content]").evaluateAll(
      (elements) =>
        elements
          .flatMap((element) => [
            element.getAttribute("href"),
            element.getAttribute("content"),
          ])
          .filter((value): value is string => value !== null),
    );

    for (const metadataUrl of metadataUrls) {
      const url = URL.parse(metadataUrl);
      expect(
        url?.hostname === "localhost" && url.origin !== expectedOrigin,
      ).toBe(false);
    }
  });
});
