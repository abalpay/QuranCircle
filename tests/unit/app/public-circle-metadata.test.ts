import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/events", () => ({
  getEventByShortCode: vi.fn(async () => ({
    name: "Family Ramadan Khatm",
    description: "A shared family Khatm circle",
    created_at: "2026-07-01T00:00:00.000Z",
  })),
}));

vi.mock("@/lib/site-url", () => ({
  toAbsoluteUrl: (path: string) => `https://www.qurancircle.io${path}`,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));

import { generateMetadata } from "@/app/[locale]/s/[shortCode]/page";

describe("public circle metadata", () => {
  it("allows crawling links without indexing the individual circle", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en", shortCode: "family-khatm" }),
    });

    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
  });

  it("provides a complete localized social preview", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "tr", shortCode: "family-khatm" }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://www.qurancircle.io/tr/s/family-khatm"
    );
    expect(metadata.openGraph).toMatchObject({
      title: "Family Ramadan Khatm - QuranCircle",
      url: "https://www.qurancircle.io/tr/s/family-khatm",
      siteName: "QuranCircle",
      locale: "tr_TR",
      images: [
        {
          url: expect.stringContaining(
            "/tr/s/family-khatm/opengraph-image?v="
          ),
          width: 1200,
          height: 630,
          alt: "imageAlt",
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [
        {
          url: expect.stringContaining(
            "/tr/s/family-khatm/opengraph-image?v="
          ),
          alt: "imageAlt",
        },
      ],
    });
  });

  it("uses the Arabic path and Open Graph locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "ar", shortCode: "family-khatm" }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://www.qurancircle.io/ar/s/family-khatm",
    );
    expect(metadata.openGraph).toMatchObject({
      url: "https://www.qurancircle.io/ar/s/family-khatm",
      locale: "ar_AR",
    });
  });
});
