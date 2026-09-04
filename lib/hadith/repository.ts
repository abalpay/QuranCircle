import "next/dist/compiled/server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertHadithId, assertLocale, HADITH_LOCALES } from "./paths";
import { mapDocument } from "./normalise";
import type { HadithDocument, HadithIndex, HadithLocale, Manifest, ReaderResult, Topic } from "./types";

export const HADITH_PAGE_SIZE = 20;
type RepositoryOptions = { root?: string; readJson?: (filename: string) => Promise<unknown> };
export function createHadithRepository({ root = path.join(process.cwd(), "data/hadith"), readJson = async (filename) => JSON.parse(await readFile(filename, "utf8")) }: RepositoryOptions = {}) {
  let manifest: Promise<Manifest> | undefined;
  let index: Promise<HadithIndex> | undefined;
  function getManifest(): Promise<Manifest> {
    return manifest ??= readJson(path.join(root, "manifest.json")).then((value) => value as Manifest).catch((error) => {
      manifest = undefined;
      throw error;
    });
  }
  function getIndex(): Promise<HadithIndex> {
    return index ??= readJson(path.join(root, "index.json")).then((value) => value as HadithIndex).catch((error) => {
      index = undefined;
      throw error;
    });
  }
  async function getTopics(locale: HadithLocale): Promise<Topic[]> {
    assertLocale(locale);
    return (await getIndex())[locale].topics;
  }
  async function getTopicPage(locale: HadithLocale, topicId: string, requestedPage: number) {
    assertLocale(locale);
    const local = (await getIndex())[locale];
    const topic = topicId === "all" ? { id: "all", title: "", ids: local.allIds } : local.topics.find((item) => item.id === topicId);
    if (!topic) return null;
    const totalItems = topic.ids.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / HADITH_PAGE_SIZE));
    const page = Math.max(1, Math.min(totalPages, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
    const items = topic.ids.slice((page - 1) * HADITH_PAGE_SIZE, page * HADITH_PAGE_SIZE).map((id) => {
      if (!local.entries[id]) throw new Error(`Corrupt hadith index: ${locale}/${id}`);
      return local.entries[id];
    });
    return { topic, items, page, totalPages, totalItems };
  }
  async function getReader(locale: HadithLocale, id: string, topicId?: string): Promise<ReaderResult> {
    assertLocale(locale);
    assertHadithId(id);
    const all = await getIndex();
    const locales = HADITH_LOCALES.filter((language) => Object.hasOwn(all[language].entries, id));
    if (!locales.length) return { kind: "missing" };
    if (!locales.includes(locale)) return { kind: "unavailable", locales };
    const edition = (await getManifest()).editions[locale];
    const document = await readJson(path.join(root, locale, `${id}.json`)) as HadithDocument;
    try {
      const expected = mapDocument(document.raw, locale, edition.version);
      if (JSON.stringify(document) !== JSON.stringify(expected) || document.id !== id) throw new Error("Document mismatch");
    } catch (cause) { throw new Error(`Corrupt indexed hadith document: ${locale}/${id}`, { cause }); }
    const local = all[locale];
    const topic = local.topics.find((item) => item.id === topicId && item.ids.includes(id));
    const ids = topic?.ids ?? local.allIds;
    const offset = ids.indexOf(id);
    if (offset < 0) throw new Error(`Corrupt hadith navigation index: ${locale}/${id}`);
    return { kind: "found", document, edition, locales, previousId: ids[offset - 1] ?? null, nextId: ids[offset + 1] ?? null, topicId: topic?.id ?? "all", returnPage: Math.floor(offset / HADITH_PAGE_SIZE) + 1 };
  }
  return { getManifest, getIndex, getTopics, getTopicPage, getReader };
}
export const { getManifest, getIndex, getTopics, getTopicPage, getReader } = createHadithRepository();
