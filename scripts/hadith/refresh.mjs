import { createHash } from "node:crypto";
import { mkdir, writeFile, copyFile, readdir, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapRows, retainTopics } from "../../lib/hadith/normalise.ts";
import { assertOfficialUrl, HADITH_LOCALES } from "../../lib/hadith/paths.ts";
import { validateDataset } from "./validate.ts";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const limit = { xlsx: 25 * 1024 * 1024, api: 5 * 1024 * 1024 };
/** Every redirect is checked before requesting it. At most two locale workers call this. */
export async function fetchOfficial(url, maximum, fetcher = fetch) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let current = url;
      const signal = AbortSignal.timeout(30_000);
      for (let redirects = 0; redirects <= 5; redirects++) {
        assertOfficialUrl(current);
        const response = await fetcher(current, { redirect: "manual", signal });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel();
          if (redirects === 5 || !response.headers.get("location")) throw new Error("Redirect limit/missing location");
          current = new URL(response.headers.get("location"), current).href;
          continue;
        }
        if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}: ${current}`); }
        if (Number(response.headers.get("content-length")) > maximum) { await response.body?.cancel(); throw new Error("Source exceeds byte limit"); }
        const chunks = [];
        let bytes = 0;
        for await (const chunk of response.body) {
          bytes += chunk.length;
          if (bytes > maximum) throw new Error("Source exceeds byte limit");
          chunks.push(chunk);
        }
        return { buffer: Buffer.concat(chunks), url: current, retrievedAt: new Date().toISOString() };
      }
    } catch (error) { lastError = error; }
  }
  throw lastError;
}
const json = (value) => JSON.stringify(value) + "\n";
async function save(filename, value) { await writeFile(filename, json(value)); }

export function checkPagination(value, page, previous) {
  const meta = value?.meta;
  if (!Array.isArray(value?.data) || !meta) throw new Error("Invalid API list");
  const current = Number(meta.current_page), last = Number(meta.last_page), total = Number(meta.total_items), perPage = Number(meta.per_page);
  if (![current, last, total, perPage].every(Number.isSafeInteger) || current !== page || last < 1 || last > 1000 || total < 0 || perPage !== 100 || last !== Math.max(1, Math.ceil(total / perPage))) throw new Error("Inconsistent pagination");
  if (previous && (previous.last !== last || previous.total !== total || previous.perPage !== perPage)) throw new Error("Pagination changed during import");
  if (value.data.length !== Math.min(perPage, Math.max(0, total - (page - 1) * perPage))) throw new Error("Inconsistent page length");
  return { last, total, perPage };
}
async function taxonomy(locale, scratch) {
  const request = async (endpoint, name) => {
    const result = await fetchOfficial(`https://hadeethenc.com/api/v1/${endpoint}`, limit.api);
    await writeFile(path.join(scratch, `${locale}-${name}.json`), result.buffer);
    return JSON.parse(result.buffer.toString("utf8"));
  };
  const roots = await request(`categories/roots/?language=${locale}`, "roots");
  if (!Array.isArray(roots) || !roots.length) throw new Error("Invalid root categories");
  const topics = [];
  for (const root of roots) {
    if (typeof root.id !== "string" || !/^[0-9]+$/.test(root.id) || typeof root.title !== "string" || root.parent_id !== null) throw new Error("Invalid root category");
    const ids = [];
    let previous;
    for (let page = 1; ; page++) {
      const result = await request(`hadeeths/list/?language=${locale}&category_id=${root.id}&page=${page}&per_page=100`, `${root.id}-${page}`);
      previous = checkPagination(result, page, previous);
      for (const item of result.data) {
        if (typeof item.id !== "string" || !/^[0-9]+$/.test(item.id)) throw new Error("Invalid API ID");
        ids.push(item.id);
      }
      if (page === previous.last) break;
    }
    if (ids.length !== previous.total || Number(root.hadeeths_count) !== previous.total) throw new Error("Inconsistent taxonomy total");
    topics.push({ id: root.id, title: root.title, ids });
  }
  return topics;
}
async function importLocale(locale, staging, scratch) {
  const download = await fetchOfficial(`https://hadeethenc.com/en/browse/download/${locale}`, limit.xlsx);
  const version = new URL(download.url).pathname.match(new RegExp(`HadeethEnc\\.com_${locale}-v([0-9]+\\.[0-9]+\\.[0-9]+)\\.xlsx$`))?.[1];
  if (!version) throw new Error("Unversioned/incorrect edition download");
  const filename = path.join(scratch, `${locale}-${version}.xlsx`);
  await writeFile(filename, download.buffer);
  const extraction = spawnSync(process.env.HADITH_PYTHON || "python3", [path.join(project, "scripts/hadith/extract.py"), filename], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 });
  if (extraction.status !== 0) throw new Error(extraction.stderr || "Extractor failed");
  const extracted = JSON.parse(extraction.stdout);
  await save(path.join(scratch, `${locale}-extracted.json`), extracted);
  if (!extracted.notice.includes(version)) throw new Error("Workbook notice/version mismatch");
  // The publisher's notice is authoritative. HTTP Last-Modified is not a publication date.
  const publisherUpdatedAt = extracted.notice.match(/^# Last update: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) /m)?.[1];
  if (!publisherUpdatedAt) throw new Error(`Publisher date not found in ${locale} notice: ${extracted.notice}`);
  const sourceUrl = extracted.notice.match(/^# Source: (\S+)/m)?.[1];
  const checkUrl = extracted.notice.match(/^# Check for updates: (\S+)/m)?.[1];
  assertOfficialUrl(sourceUrl);
  assertOfficialUrl(checkUrl);
  if (sourceUrl !== `https://hadeethenc.com/${locale}` || checkUrl !== `https://hadeethenc.com/en/check/${locale}/v${version}`) throw new Error("Source notice URL/version mismatch");
  const edition = { locale, version, publisherUpdatedAt, notice: extracted.notice, sourceUrl, downloadUrl: download.url, checkUrl, sha256: createHash("sha256").update(download.buffer).digest("hex"), retrievedAt: download.retrievedAt };
  const documents = mapRows(extracted.rows, locale, version);
  const directory = path.join(staging, locale);
  await mkdir(directory);
  for (const document of documents) await save(path.join(directory, `${document.id}.json`), document);
  const allIds = documents.map((document) => document.id);
  const membership = retainTopics(await taxonomy(locale, scratch), allIds);
  return { edition, documents, allIds, ...membership };
}
async function copyTree(source, target) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isDirectory()) await copyTree(from, to); else await copyFile(from, to);
  }
}
export async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && args[0] !== "--promote-local-preview")) throw new Error("Usage: npm run hadith:import -- [--promote-local-preview]");
  const runId = new Date().toISOString().replaceAll(":", "-");
  const staging = path.join(project, ".hadith-staging", runId);
  const scratch = path.join(project, ".hadith-imports", runId);
  await mkdir(staging, { recursive: true });
  await mkdir(scratch, { recursive: true });
  const imported = {};
  const queue = [...HADITH_LOCALES];
  await Promise.all([0, 1].map(async () => {
    while (queue.length) {
      const locale = queue.shift();
      imported[locale] = await importLocale(locale, staging, scratch);
      console.log(`${locale}: ${imported[locale].documents.length} documents, v${imported[locale].edition.version}`);
    }
  }));
  const manifest = { schemaVersion: 1, editions: {}, taxonomyRetrievedAt: new Date().toISOString(), importedCounts: {} };
  const index = {}, report = {};
  for (const locale of HADITH_LOCALES) {
    const result = imported[locale];
    manifest.editions[locale] = result.edition;
    manifest.importedCounts[locale] = result.documents.length;
    index[locale] = { entries: Object.fromEntries(result.documents.map((d) => [d.id, { id: d.id, title: d.text.title, locales: HADITH_LOCALES.filter((language) => imported[language].allIds.includes(d.id)) }])), topics: result.topics, allIds: result.allIds };
    report[locale] = { apiOnlyIds: result.apiOnlyIds, unmappedIds: result.unmappedIds };
  }
  await save(path.join(staging, "manifest.json"), manifest);
  await save(path.join(staging, "index.json"), index);
  await save(path.join(staging, "import-report.json"), report);
  await validateDataset(staging, scratch);
  if (args.includes("--promote-local-preview")) {
    const target = path.join(project, "data/hadith");
    try { await access(path.join(target, "manifest.json")); throw new Error("Existing corpus will not be overwritten. Review staged diff and promote manually."); } catch (error) { if (error.code !== "ENOENT") throw error; }
    await copyTree(staging, target);
    console.log("Initial validated snapshot promoted for UNREVIEWED LOCAL PREVIEW only.");
  }
  console.log(`Validated staging: ${staging}\nSources retained: ${scratch}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
