import { describe, expect, it, vi } from "vitest";
vi.mock("next/dist/compiled/server-only", () => ({}));
import { mapDocument, mapRows, retainTopics } from "@/lib/hadith/normalise";
import { hadithPath, assertLocale, assertOfficialUrl } from "@/lib/hadith/paths";
import { createHadithRepository } from "@/lib/hadith/repository";
import { isHadithEnabled } from "@/lib/hadith/feature";
import type { HadithIndex, Manifest } from "@/lib/hadith/types";

const row = { id: "123", title: "  Title\n", hadith_text: " [Text] ﷲ\n", explanation: null, hadith_text_ar: "نَصٌّ ", title_ar: "عنوان", unknown: " preserve " };
describe("lossless source mapping", () => {
  it("preserves raw values, whitespace and paired Arabic from this edition", () => {
    const d = mapDocument(row, "en", "1.2.0");
    expect(d.raw).toEqual(row);
    expect(d.text.title).toBe(row.title);
    expect(d.text.text).toBe(row.hadith_text);
    expect(d.text.explanation).toBe("");
    expect(d.arabic?.text).toBe(row.hadith_text_ar);
    expect(mapDocument(row, "ar", "1.2.0").arabic).toBeNull();
  });
  it("rejects duplicate IDs and missing source text or Arabic pairing", () => {
    expect(() => mapRows([row, row], "en", "1.2.0")).toThrow(/duplicate/i);
    expect(() => mapDocument({ ...row, hadith_text: null }, "en", "1")).toThrow();
    expect(() => mapDocument({ ...row, hadith_text_ar: null }, "en", "1")).toThrow();
  });
  it("filters API-only IDs, deduplicates and keeps source API order", () => {
    expect(retainTopics([{ id: "1", title: "Topic", ids: ["123", "999", "123", "124"] }], ["124", "123"]))
      .toEqual({ topics: [{ id: "1", title: "Topic", ids: ["123", "124"] }], apiOnlyIds: ["999"], unmappedIds: [] });
  });
});
describe("source and path validation", () => {
  it("enables only with the exact server flag true", () => {
    for (const value of ["false", "1", "TRUE", ""]) {
      vi.stubEnv("HADITH_READER_ENABLED", value);
      expect(isHadithEnabled()).toBe(false);
    }
    vi.stubEnv("HADITH_READER_ENABLED", "true");
    expect(isHadithEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });
  it.each(["../1", "1/2", "-1", "1.2", "", " 123", "%31"])("rejects ID %s", (id) => expect(() => hadithPath(id)).toThrow());
  it("validates locale and exact official HTTPS origin", () => {
    expect(hadithPath("123")).toBe("/hadith/123");
    expect(() => assertLocale("fr")).toThrow();
    for (const url of ["http://hadeethenc.com/en", "https://hadeethenc.com.evil.org/", "https://user@hadeethenc.com/", "https://hadeethenc.com:8443/"]) expect(() => assertOfficialUrl(url)).toThrow();
    expect(() => assertOfficialUrl("https://hadeethenc.com/en/browse/hadith/123")).not.toThrow();
  });
});

function fixture() {
  const ids = Array.from({ length: 21 }, (_, i) => String(i + 1));
  const entries = Object.fromEntries(ids.map((id) => [id, { id, title: id, locales: ["en"] }]));
  const index = { en: { entries, allIds: ids, topics: [{ id: "1", title: "Topic", ids }] }, tr: { entries: {}, allIds: [], topics: [] }, ar: { entries: {}, allIds: [], topics: [] } } as HadithIndex;
  const manifest = { editions: { en: { locale: "en", version: "1" } } } as Manifest;
  const readJson = vi.fn(async (file: string) => {
    if (file.endsWith("manifest.json")) return manifest;
    if (file.endsWith("index.json")) return index;
    return mapDocument({ ...row, id: file.split("/").at(-1)!.replace(".json", "") }, "en", "1");
  });
  return { repo: createHadithRepository({ root: "/fixture", readJson }), readJson };
}
describe("local repository", () => {
  it("paginates 20 entries and clamps invalid/out-of-range pages", async () => {
    const { repo } = fixture();
    expect((await repo.getTopicPage("en", "1", 0))?.items).toHaveLength(20);
    expect((await repo.getTopicPage("en", "1", 99))?.page).toBe(2);
    expect((await repo.getTopicPage("en", "1", 2))?.items).toHaveLength(1);
    expect(await repo.getTopicPage("en", "unknown", 1)).toBeNull();
  });
  it("distinguishes unavailable translations from globally missing IDs", async () => {
    const { repo } = fixture();
    expect(await repo.getReader("tr", "1")).toEqual({ kind: "unavailable", locales: ["en"] });
    expect(await repo.getReader("en", "999")).toEqual({ kind: "missing" });
  });
  it("falls back to all context, calculates return page and reads only requested documents", async () => {
    const { repo, readJson } = fixture();
    expect(await repo.getReader("en", "21", "bad")).toMatchObject({ kind: "found", previousId: "20", nextId: null, topicId: "all", returnPage: 2 });
    await repo.getReader("en", "1", "1");
    expect(readJson.mock.calls.filter(([p]) => p.endsWith("index.json"))).toHaveLength(1);
    expect(readJson.mock.calls.filter(([p]) => p.includes("/en/"))).toHaveLength(2);
  });
  it("throws operational errors for corrupt/missing indexed files", async () => {
    const { repo, readJson } = fixture();
    await repo.getIndex();
    await repo.getManifest();
    readJson.mockResolvedValueOnce({ broken: true } as never);
    await expect(repo.getReader("en", "1")).rejects.toThrow(/corrupt/i);
    readJson.mockRejectedValueOnce(new Error("ENOENT"));
    await expect(repo.getReader("en", "1")).rejects.toThrow("ENOENT");
  });
});
