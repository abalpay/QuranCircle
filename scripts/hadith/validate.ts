import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
// @ts-expect-error Node 24 runs this CLI directly with native type stripping.
import { mapDocument, retainTopics } from "../../lib/hadith/normalise.ts";
// @ts-expect-error Node 24 runs this CLI directly with native type stripping.
import { assertOfficialUrl, assertHadithId, HADITH_LOCALES } from "../../lib/hadith/paths.ts";
import type { HadithDocument, HadithIndex, Manifest, Topic } from "../../lib/hadith/types";

const parse = async (filename: string) => JSON.parse(await readFile(filename, "utf8"));
export async function validateDataset(root: string, scratch?: string) {
  const manifest: Manifest = await parse(path.join(root, "manifest.json"));
  const index: HadithIndex = await parse(path.join(root, "index.json"));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(manifest.taxonomyRetrievedAt)));
  const mismatches = await parse(path.join(root, "import-report.json"));
  let documentCount = 0;
  for (const locale of HADITH_LOCALES) {
    const edition = manifest.editions[locale];
    assert.equal(edition.locale, locale);
    assert.match(edition.version, /^\d+\.\d+\.\d+$/);
    assert.ok(edition.notice.includes(edition.version));
    assert.ok(edition.notice.includes(edition.publisherUpdatedAt));
    assert.match(edition.publisherUpdatedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(edition.retrievedAt)));
    assert.match(edition.sha256, /^[a-f0-9]{64}$/);
    [edition.sourceUrl, edition.downloadUrl, edition.checkUrl].forEach(assertOfficialUrl);
    assert.equal(edition.sourceUrl, `https://hadeethenc.com/${locale}`);
    assert.equal(edition.checkUrl, `https://hadeethenc.com/en/check/${locale}/v${edition.version}`);
    assert.ok(edition.downloadUrl.endsWith(`HadeethEnc.com_${locale}-v${edition.version}.xlsx`));
    const local = index[locale];
    assert.ok(local.allIds.length > 0);
    local.allIds.forEach(assertHadithId);
    assert.equal(new Set(local.allIds).size, local.allIds.length, "Duplicate allIds");
    assert.equal(local.allIds.length, manifest.importedCounts[locale]);
    assert.deepEqual(Object.keys(local.entries).sort(), [...local.allIds].sort());
    const filenames = await readdir(path.join(root, locale));
    assert.deepEqual(filenames.sort(), local.allIds.map((id) => `${id}.json`).sort());
    const topicIds = new Set<string>();
    for (const topic of local.topics) {
      assertHadithId(topic.id);
      assert.ok(!topicIds.has(topic.id));
      topicIds.add(topic.id);
      assert.equal(typeof topic.title, "string");
      assert.equal(new Set(topic.ids).size, topic.ids.length);
      for (const id of topic.ids) assert.ok(Object.hasOwn(local.entries, id), "API-only ID leaked into topics");
    }
    let sourceRows: Map<string, Record<string, string | null>> | undefined;
    if (scratch) {
      const workbook = await readFile(path.join(scratch, `${locale}-${edition.version}.xlsx`));
      assert.equal(createHash("sha256").update(workbook).digest("hex"), edition.sha256);
      const extraction = spawnSync(process.env.HADITH_PYTHON || "python3", [fileURLToPath(new URL("./extract.py", import.meta.url)), path.join(scratch, `${locale}-${edition.version}.xlsx`)], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 });
      assert.equal(extraction.status, 0, extraction.stderr);
      const extracted = JSON.parse(extraction.stdout);
      assert.deepEqual(extracted, await parse(path.join(scratch, `${locale}-extracted.json`)), "Retained extraction differs from workbook");
      assert.equal(extracted.notice, edition.notice);
      assert.deepEqual(extracted.rows.map((row: { id: string }) => row.id), local.allIds, "Workbook order differs");
      sourceRows = new Map(extracted.rows.map((row: Record<string, string | null>) => [row.id, row]));
      const roots = await parse(path.join(scratch, `${locale}-roots.json`));
      const sourceTopics: Topic[] = [];
      for (const topic of roots) {
        const ids: string[] = [];
        let last = 1;
        for (let page = 1; page <= last; page++) {
          const list = await parse(path.join(scratch, `${locale}-${topic.id}-${page}.json`));
          last = Number(list.meta.last_page);
          ids.push(...list.data.map((item: { id: string }) => item.id));
        }
        sourceTopics.push({ id: topic.id, title: topic.title, ids });
      }
      const retained = retainTopics(sourceTopics, local.allIds);
      assert.deepEqual(local.topics, retained.topics);
      assert.deepEqual(mismatches[locale], { apiOnlyIds: retained.apiOnlyIds, unmappedIds: retained.unmappedIds });
    }
    for (const id of local.allIds) {
      const document: HadithDocument = await parse(path.join(root, locale, `${id}.json`));
      assert.equal(document.id, id);
      assert.deepEqual(document, mapDocument(document.raw, locale, edition.version));
      assertOfficialUrl(document.sourceUrl);
      if (sourceRows) assert.deepEqual(document.raw, sourceRows.get(id), `Source mismatch ${locale}/${id}`);
      assert.deepEqual(local.entries[id], { id, title: document.text.title, locales: HADITH_LOCALES.filter((language) => Object.hasOwn(index[language].entries, id)) });
      documentCount++;
    }
    console.log(`Validated ${locale}: ${local.allIds.length} documents; ${local.topics.length} topics; ${mismatches[locale].apiOnlyIds.length} API-only; ${mismatches[locale].unmappedIds.length} unmapped`);
  }
  console.log(`Validated ${documentCount} documents${scratch ? " against retained source extractions and SHA256" : " (use a scratch path for original-source comparison)"}.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await validateDataset(path.resolve(process.argv[2] || "data/hadith"), process.argv[3] && path.resolve(process.argv[3]));
}
