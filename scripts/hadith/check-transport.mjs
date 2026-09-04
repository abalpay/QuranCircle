import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Run against an owned production server with an explicit runtime feature flag.
const enabled = process.argv[2];
assert.ok(["true", "false"].includes(enabled), "Usage: node scripts/hadith/check-transport.mjs true|false [origin]");
const origin = process.argv[3] ?? "http://localhost:3003";
const manifest = JSON.parse(await readFile("data/hadith/manifest.json", "utf8"));
const htmlEscape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const representations = value => [value, htmlEscape(value), JSON.stringify(value).slice(1, -1), JSON.stringify(JSON.stringify(value).slice(1, -1)).slice(1, -1)];
for (const locale of ["en", "tr", "ar"]) {
  const document = JSON.parse(await readFile(`data/hadith/${locale}/4560.json`, "utf8"));
  for (const route of ["4560", "sources"]) {
    const sentinels = route === "sources" ? Object.values(manifest.editions).map(edition => edition.notice) : [document.text.title, document.text.text, document.text.explanation, manifest.editions[locale].notice];
    assert.ok(sentinels.every(value => typeof value === "string" && value.length > 10));
    for (const transport of ["html", "rsc"]) {
      const pathname = `${locale === "en" ? "" : `/${locale}`}/hadith/${route}`;
      const response = await fetch(`${origin}${pathname}`, { headers: transport === "rsc" ? { RSC: "1" } : {}, signal: AbortSignal.timeout(30000) });
      const body = await response.text(); // Consume the entire streamed payload, including trailing RSC chunks.
      assert.match(response.headers.get("content-type") ?? "", transport === "rsc" ? /text\/x-component/ : /text\/html/);
      if (enabled === "true") assert.equal(response.status, 200);
      for (const source of sentinels) {
        // Source-preserving paragraph elements interrupt contiguous HTML/RSC strings.
        // Check every distinctive source line; DOM tests separately verify exact full text/order.
        const parts = (source.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? []).filter(part => part.trim().length > 10);
        assert.ok(parts.length, "Source sentinel must contain a distinctive line");
        for (const part of parts) {
          const present = representations(part).some(value => body.includes(value));
          assert.equal(present, enabled === "true", `${pathname} ${transport}: source ${enabled === "true" ? "missing" : "leaked"}`);
        }
      }
      console.log(JSON.stringify({ enabled, pathname, transport, status: response.status, bytes: Buffer.byteLength(body), sourceAssertions: sentinels.length }));
    }
  }
}
