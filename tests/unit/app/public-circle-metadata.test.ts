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

import { generateMetadata } from "@/app/s/[shortCode]/page";

describe("public circle metadata", () => {
  it("allows crawling links without indexing the individual circle", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ shortCode: "family-khatm" }),
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
});
