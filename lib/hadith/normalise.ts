import type { HadithDocument, HadithLocale, TextBlock, Topic } from "./types";
// @ts-expect-error Explicit .ts extension is required by the Node 24 import/validation CLI.
import { assertHadithId, assertLocale } from "./paths.ts";

const fields = { title: "title", text: "hadith_text", explanation: "explanation", benefits: "benefits", grade: "grade", attribution: "takhrij", wordMeanings: "word_meanings" } as const;
function block(raw: Record<string, string | null>, suffix = ""): TextBlock {
  return Object.fromEntries(Object.entries(fields).map(([key, source]) => [key, raw[source + suffix] ?? ""])) as TextBlock;
}
export function mapDocument(raw: Record<string, string | null>, locale: HadithLocale, editionVersion: string): HadithDocument {
  assertLocale(locale);
  const id = raw.id ?? "";
  assertHadithId(id);
  for (const value of Object.values(raw)) if (value !== null && typeof value !== "string") throw new Error(`Non-string raw field in ${id}`);
  if (!raw.title || !raw.hadith_text) throw new Error(`Missing text in ${locale}/${id}`);
  if (locale !== "ar" && !raw.hadith_text_ar) throw new Error(`Missing paired Arabic in ${locale}/${id}`);
  return { id, locale, editionVersion, sourceUrl: `https://hadeethenc.com/${locale}/browse/hadith/${id}`, text: block(raw), arabic: locale === "ar" ? null : block(raw, "_ar"), raw: { ...raw } };
}
export function mapRows(rows: Record<string, string | null>[], locale: HadithLocale, version: string): HadithDocument[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const document = mapDocument(row, locale, version);
    if (seen.has(document.id)) throw new Error(`Duplicate ID ${document.id}`);
    seen.add(document.id);
    return document;
  });
}
/** Taxonomy is membership only: titles/text of hadiths always come from the workbook. */
export function retainTopics(topics: Topic[], allIds: string[]) {
  const exported = new Set(allIds);
  const mapped = new Set<string>();
  const apiOnlyIds = new Set<string>();
  const topicIds = new Set<string>();
  const retained = topics.map((topic) => {
    assertHadithId(topic.id);
    if (topicIds.has(topic.id)) throw new Error(`Duplicate topic ${topic.id}`);
    topicIds.add(topic.id);
    const ids = [...new Set(topic.ids)].filter((id) => {
      assertHadithId(id);
      if (!exported.has(id)) { apiOnlyIds.add(id); return false; }
      mapped.add(id);
      return true;
    });
    return { ...topic, ids };
  });
  return { topics: retained, apiOnlyIds: [...apiOnlyIds], unmappedIds: allIds.filter((id) => !mapped.has(id)) };
}
