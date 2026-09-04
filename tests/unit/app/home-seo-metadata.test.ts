import { describe, expect, it, vi } from "vitest";
import type { AppLocale } from "@/i18n/routing";
import { BRAND_SOCIAL_IMAGE_PATH } from "@/lib/brand";
import { toAbsoluteUrl } from "@/lib/site-url";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async ({
      locale,
      namespace,
    }: {
      locale: AppLocale;
      namespace: string;
    }) => {
      const messages =
        locale === "tr"
          ? (await import("@/messages/tr.json")).default
          : locale === "ar"
            ? (await import("@/messages/ar.json")).default
            : (await import("@/messages/en.json")).default;
      const namespaceMessages = messages[
        namespace as keyof typeof messages
      ] as Record<string, string>;

      return (key: string) => namespaceMessages[key];
    },
  ),
  setRequestLocale: vi.fn(),
}));

import { generateMetadata } from "@/app/[locale]/page";

describe("home SEO metadata", () => {
  it("targets the online group Quran Khatm tracker intent", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(metadata.title).toBe(
      "Online Group Quran Khatm Tracker (Free) | QuranCircle",
    );
    expect(metadata.description).toContain("free online group Quran Khatm");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        "online Khatm app",
        "Quran completion tracker",
        "group Khatam tracker",
      ]),
    );
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("keeps the primary intent localized", async () => {
    const [english, turkish, arabic] = await Promise.all([
      generateMetadata({ params: Promise.resolve({ locale: "en" }) }),
      generateMetadata({ params: Promise.resolve({ locale: "tr" }) }),
      generateMetadata({ params: Promise.resolve({ locale: "ar" }) }),
    ]);

    expect(turkish.title).toContain("Online Grup Hatim");
    expect(arabic.title).toContain("عبر الإنترنت");

    for (const metadata of [english, turkish, arabic]) {
      expect(metadata.openGraph?.images).toEqual([
        {
          url: toAbsoluteUrl(BRAND_SOCIAL_IMAGE_PATH),
          width: 1200,
          height: 630,
          alt: "QuranCircle",
        },
      ]);
    }
  });
});
