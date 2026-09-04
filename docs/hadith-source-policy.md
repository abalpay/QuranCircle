# HadeethEnc source policy and local import runbook

## Status and source obligations

This is **unreviewed local-preview material**, not an approved religious-content release. Automated validation establishes byte/field fidelity and structural consistency, not scholarly correctness. HadeethEnc corpus text, translations, explanations, grades, benefits and source metadata are excluded from the repository's code licence; the publisher's conditions govern them.

Review the original [HadeethEnc Terms and Policies](https://hadeethenc.com/en/home) (download-section modal; inspected 2026-09-04) before any publication. Their seven conditions require unchanged content; clear publisher/source attribution; edition version identification; retained transcript information; reporting translation concerns to HadeethEnc; adoption of updated source editions; and exclusion of inappropriate advertising. The original terms remain authoritative. Every reader must show HadeethEnc attribution, exact edition version and accessible complete original notice. Do not infer reference numbers, translate, rewrite, regrade, or substitute API content.

Before publication, a human must review the current publisher terms, original notices, all changed religious text and Arabic pairing, source links, required update ownership and the intended presentation. Record that approval separately; this branch grants none. A known publisher correction must not be concealed by reverting to a superseded incorrect edition. Disable affected content pending review if necessary. Reporting concerns to the publisher requires separate human authorization; this tool does not send messages.

## Source and storage model

Use only `https://hadeethenc.com/en/browse/download/{en|tr|ar}` and its allowlisted HTTPS versioned redirects for text. All workbook columns are retained in `raw`, with no trimming/normalization. Row 1 is the complete publisher notice, row 2 the headers and subsequent rows the content. Formula cells, duplicate headers/IDs, unsafe IDs, unsupported locales and missing required text are rejected. Translation Arabic comes exclusively from that translation's workbook. Null optional fields display as empty strings; raw null remains null.

The root-category and paginated list APIs enrich membership only. Lists are deduplicated in source order and filtered against each locale's export IDs. Export-only records stay in All; `import-report.json` lists every mismatch. There are 20 entries per reader list page. No API text enters the corpus, and the application/browser performs no runtime source requests.

The manifest contains original source/check URLs, final versioned download URLs, SHA256, exact publisher timestamp (no timezone is invented), retrieval dates and notice. JSON is versioned in Git under `data/hadith`; real XLSX, raw API responses and extraction intermediates remain ignored under `.hadith-imports/<timestamp>`. Candidates remain ignored under `.hadith-staging/<timestamp>`. Keep scratch when reviewing or reproducing a snapshot.

## Import and validate locally

Use Node 24 and Python with `openpyxl==3.1.5`. Dependencies are pinned in `scripts/hadith/requirements.txt`; use an isolated Python environment or the provided workspace runtime. Set `HADITH_PYTHON` to that interpreter if it is not `python3`. The extractor only reads the XLSX (`read_only=True`, `data_only=False`) and emits JSON.

```sh
# Generates and validates a new ignored candidate; does not alter checked-in data.
npm run hadith:import

# Initial snapshot only: explicitly promotes validated, UNREVIEWED local-preview data.
# Refuses if data/hadith/manifest.json already exists.
npm run hadith:import -- --promote-local-preview

# Validate the committed snapshot structurally and compare every document to its raw map.
npm run hadith:validate

# Strong source comparison: re-extract original XLSX, verify SHA256, compare all fields/order,
# then reconcile topic membership against retained API responses.
npm run hadith:validate -- data/hadith .hadith-imports/<timestamp>

npm run test:unit -- tests/unit/lib/hadith
python3 -B -m unittest discover -s tests/unit/lib/hadith -p 'test_*.py' -v
npx tsc --noEmit
```

Network imports allow at most two concurrent requests, five allowlisted redirects, three attempts with 30-second per-attempt timeout, 25 MiB per workbook and 5 MiB per API response. Pagination inconsistencies fail the import. A failed import leaves its ignored scratch/candidate for diagnosis and never promotes it.

For later editions, review the complete candidate diff (including removals, raw fields, notice, versions, SHA256 and topic mismatch report) and source terms manually. There is no automatic overwrite path or scheduled publication. After explicit review, the maintainer can replace the relevant versioned snapshot in a reviewed change, rerun validation against its retained scratch and record approval. Never call an old incorrect edition a safe rollback.

## Disable and preview

`HADITH_READER_ENABLED` is server-only and defaults off. Only the exact string `true` enables it. Set it to `false` (or remove it) and restart the server to disable the reader. Never expose this flag as a public client variable. Follow [the local preview guide](hadith-preview.md); no production credentials, merge, deployment or workflow is needed.

Only Hadith route output traces include the corpus. The server caches the manifest/index, then reads the requested document. Missing indexed files and malformed documents are operational errors, not silently empty content. The current corpus is about 65.3 MiB of JSON (82 MiB filesystem allocation); verify deployment limits separately before any future release.
