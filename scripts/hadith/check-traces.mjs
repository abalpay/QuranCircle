import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename));
    else if (entry.name.endsWith(".nft.json")) files.push(filename);
  }
  return files;
}
const traces = (await walk(".next/server/app")).filter(file => file.includes("/hadith/") || file.endsWith("/hadith/page.js.nft.json"));
if (traces.length !== 5) throw new Error(`Expected five Hadith route traces, got ${traces.length}`);
const forbidden = new Set(["components.json", "package-lock.json", "tsconfig.json", "vercel.json"].map(file => path.resolve(file)));
const corpus = ["manifest.json", "index.json"];
for (const locale of ["en", "tr", "ar"]) {
  corpus.push(...(await readdir(`data/hadith/${locale}`)).filter(file => file.endsWith(".json")).map(file => `${locale}/${file}`));
}
for (const filename of traces) {
  const { files } = JSON.parse(await readFile(filename, "utf8"));
  const resolved = [...new Set(files.map(file => path.resolve(path.dirname(filename), file)))];
  for (const required of corpus) {
    if (!resolved.includes(path.resolve("data/hadith", required))) throw new Error(`${filename} missing ${required}`);
  }
  for (const file of resolved) {
    const relative = path.relative(process.cwd(), file);
    if (forbidden.has(file) || relative.startsWith(".superpowers/") || relative.startsWith(".env")) throw new Error(`${filename} contains unrelated file ${relative}`);
  }
  const bytes = (await Promise.all(resolved.map(async file => (await stat(file)).size))).reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ route: filename, files: resolved.length, corpusFiles: resolved.filter(file => file.startsWith(path.resolve("data/hadith") + path.sep)).length, MiB: +(bytes / 1024 / 1024).toFixed(2) }));
}
