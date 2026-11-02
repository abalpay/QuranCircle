import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/events", () => ({
  getEventByShortCode: vi.fn(async () => ({
    name: "Family Ramadan Khatm",
    description: "A shared family Khatm circle",
    created_at: "2026-07-01T00:00:00.000Z",
    khatms: [],
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

  // #103: the image route lives under [locale] and proxy.ts does not rewrite *opengraph-image,
  // so the advertised URL must carry the locale segment, English included.
  it.each(["en", "tr", "ar"] as const)("advertises an og:image URL that includes the %s locale segment", async (locale) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale, shortCode: "family-khatm" }),
    });
    const url = (metadata.openGraph?.images as { url: string }[])[0].url;
    expect(url).toMatch(
      new RegExp(`^https://www\\.qurancircle\\.io/${locale}/s/family-khatm/opengraph-image\\?v=[0-9a-z]+$`)
    );
    expect((metadata.twitter?.images as { url: string }[])[0].url).toBe(url);
  });

  it("changes the image version and description when the circle completes, fills or is archived", async () => {
    const { getEventByShortCode } = await import("@/lib/actions/events");
    const run = async (event: object) => {
      vi.mocked(getEventByShortCode).mockResolvedValueOnce({
        name: "Done",
        description: "own words",
        created_at: "2026-07-01T00:00:00.000Z",
        ...event,
      } as never);
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: "en", shortCode: "family-khatm" }),
      });
      return {
        version: (metadata.openGraph?.images as { url: string }[])[0].url.split("?v=")[1],
        description: metadata.openGraph?.description,
      };
    };
    const open = await run({ khatms: [{ khatm_number: 1, completed_at: null, claimed_count: 4 }] });
    const full = await run({ khatms: [{ khatm_number: 1, completed_at: null, claimed_count: 30 }] });
    const done = await run({ khatms: [{ khatm_number: 1, completed_at: "2026-11-01T00:00:00Z", claimed_count: 30 }] });
    const archived = await run({ is_archived: true, khatms: [{ khatm_number: 1, completed_at: null, claimed_count: 4 }] });
    expect(open.description).toBe("own words");
    expect(new Set([open.version, full.version, done.version, archived.version]).size).toBe(4);
    expect(new Set([open.description, full.description, done.description, archived.description]).size).toBe(4);
  });
});
