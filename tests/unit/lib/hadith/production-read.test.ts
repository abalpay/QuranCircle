import { describe, expect, it, vi } from "vitest";
vi.mock("next/dist/compiled/server-only", () => ({}));
vi.mock("node:fs/promises", () => {
  const readFile = vi.fn(async () => "{}");
  return { readFile, default: { readFile } };
});
import { readFile } from "node:fs/promises";
import { readHadithJson } from "@/lib/hadith/production-read";
import path from "node:path";

describe("production corpus adapter", () => {
  it.each(["manifest.json", "index.json", "en/4560.json", "tr/4560.json", "ar/4560.json"])("reads only the corpus-relative %s", async filename => {
    await expect(readHadithJson(filename)).resolves.toEqual({});
    expect(readFile).toHaveBeenLastCalledWith(path.join(process.cwd(), "data/hadith", filename), "utf8");
  });
  it.each(["../package-lock.json", "components.json", "tsconfig.json", "vercel.json", "/en/4560.json", "en/../../package.json", "fr/4560.json", "en/1.json/extra", "en\\4560.json"])("rejects non-corpus path %s before IO", async filename => {
    vi.mocked(readFile).mockClear();
    await expect(readHadithJson(filename)).rejects.toThrow("Invalid hadith data path");
    expect(readFile).not.toHaveBeenCalled();
  });
});
