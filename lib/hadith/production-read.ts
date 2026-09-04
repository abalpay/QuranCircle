import "next/dist/compiled/server-only";
import { readFile } from "node:fs/promises";

/** Keep the literal corpus prefix at the IO boundary so Next traces only source data. */
export async function readHadithJson(filename: string): Promise<unknown> {
  if (!/^(?:manifest\.json|index\.json|(?:en|tr|ar)\/[0-9]+\.json)$/.test(filename)) {
    throw new Error("Invalid hadith data path");
  }
  // Each literal locale prefix also keeps the trace pattern below the broad-pattern threshold.
  if (filename === "manifest.json") return JSON.parse(await readFile(`${process.cwd()}/data/hadith/manifest.json`, "utf8"));
  if (filename === "index.json") return JSON.parse(await readFile(`${process.cwd()}/data/hadith/index.json`, "utf8"));
  const [locale, document] = filename.split("/");
  if (locale === "en") return JSON.parse(await readFile(`${process.cwd()}/data/hadith/en/${document}`, "utf8"));
  if (locale === "tr") return JSON.parse(await readFile(`${process.cwd()}/data/hadith/tr/${document}`, "utf8"));
  return JSON.parse(await readFile(`${process.cwd()}/data/hadith/ar/${document}`, "utf8"));
}
