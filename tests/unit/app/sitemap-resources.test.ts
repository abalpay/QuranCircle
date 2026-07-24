import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://www.qurancircle.io",
}));

import sitemap from "@/app/sitemap";

describe("resource sitemap entries", () => {
  it("includes the focused WhatsApp and Ramadan guides", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(
      "https://www.qurancircle.io/group-khatm-whatsapp",
    );
    expect(urls).toContain(
      "https://www.qurancircle.io/ramadan-group-khatm",
    );
  });

  it("does not expose individual public circles for indexing", async () => {
    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.includes("/s/"))).toBe(false);
  });
});
