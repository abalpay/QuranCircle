import { describe, expect, it, vi } from "vitest";
import { checkPagination, fetchOfficial } from "../../../../scripts/hadith/refresh.mjs";

describe("bounded official downloads", () => {
  it("blocks an untrusted redirect before any request reaches that host", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request) => new Response(null, { status: 302, headers: { location: "https://evil.example/source.xlsx" } }));
    await expect(fetchOfficial("https://hadeethenc.com/en/browse/download/en", 100, fetcher)).rejects.toThrow(/official/i);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.every((call) => String(call[0]).startsWith("https://hadeethenc.com/"))).toBe(true);
  });
  it("bounds redirect chains and retries", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { location: "/again" } }));
    await expect(fetchOfficial("https://hadeethenc.com/start", 100, fetcher)).rejects.toThrow(/redirect/i);
    expect(fetcher).toHaveBeenCalledTimes(18);
  });
  it("enforces declared and streamed byte limits", async () => {
    const declared = vi.fn(async () => new Response("a", { headers: { "content-length": "101" } }));
    await expect(fetchOfficial("https://hadeethenc.com/source", 100, declared)).rejects.toThrow(/byte limit/);
    const streamed = vi.fn(async () => new Response("12345"));
    await expect(fetchOfficial("https://hadeethenc.com/source", 4, streamed)).rejects.toThrow(/byte limit/);
  });
  it("returns exact downloaded bytes and final official version URL", async () => {
    const fetcher = vi.fn(async () => new Response("unaltered\n"));
    const result = await fetchOfficial("https://hadeethenc.com/source", 100, fetcher);
    expect(result?.buffer.toString()).toBe("unaltered\n");
    expect(result?.url).toBe("https://hadeethenc.com/source");
  });
});
describe("API consistency", () => {
  const page = { data: [{ id: "1" }], meta: { current_page: "1", last_page: 1, total_items: 1, per_page: "100" } };
  it("accepts consistent pages", () => expect(checkPagination(page, 1, undefined)).toEqual({ last: 1, total: 1, perPage: 100 }));
  it("rejects changed totals, page numbers and incomplete pages", () => {
    expect(() => checkPagination(page, 2, undefined)).toThrow();
    expect(() => checkPagination(page, 1, { last: 1, total: 2, perPage: 100 })).toThrow();
    expect(() => checkPagination({ ...page, data: [] }, 1, undefined)).toThrow();
  });
});
