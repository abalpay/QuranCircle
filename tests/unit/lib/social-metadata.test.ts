import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site-url", () => ({
  toAbsoluteUrl: (path: string) => `https://www.qurancircle.io${path}`,
}));

import { socialMetadata } from "@/lib/social-metadata";

describe("socialMetadata (#104)", () => {
  const base = { title: "Browse", description: "Public circles", url: "https://www.qurancircle.io/browse" };

  it.each([
    ["en", "en_US"],
    ["tr", "tr_TR"],
    ["ar", "ar_AR"],
  ] as const)("%s: carries og:locale, og:site_name, the brand image and the large card", (locale, ogLocale) => {
    const { openGraph, twitter } = socialMetadata({ locale, ...base });
    expect(openGraph).toMatchObject({
      type: "website",
      locale: ogLocale,
      siteName: "QuranCircle",
      title: "Browse",
      description: "Public circles",
      url: base.url,
      images: [{ url: "https://www.qurancircle.io/opengraph-image", width: 1200, height: 630, alt: "QuranCircle" }],
    });
    expect(twitter).toMatchObject({
      card: "summary_large_image",
      title: "Browse",
      description: "Public circles",
      images: [{ url: "https://www.qurancircle.io/opengraph-image" }],
    });
  });

  it("lets a page set its own image alt, article type and twitter wording", () => {
    const { openGraph, twitter } = socialMetadata({
      locale: "en",
      ...base,
      type: "article",
      imageAlt: "Guide",
      twitterTitle: "T",
      twitterDescription: "D",
    });
    expect(openGraph).toMatchObject({ type: "article", images: [{ alt: "Guide" }] });
    expect(twitter).toMatchObject({ title: "T", description: "D" });
  });
});
