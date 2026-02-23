# SEO Audit Evidence Appendix - 2026-02-23

Audit timestamp (UTC): `2026-02-23T02:10:37Z`
Target: `https://www.qurancircle.io`

## 1) Redirect and Host Normalization

Command:
```bash
for u in https://qurancircle.io https://www.qurancircle.io http://qurancircle.io http://www.qurancircle.io; do
  curl -sS -o /dev/null -D - "$u" | sed -n '1,20p'
done
```

Observed:
- `https://qurancircle.io` -> `307` -> `https://www.qurancircle.io/`
- `https://www.qurancircle.io` -> `200`
- `http://qurancircle.io` -> `308` -> `https://qurancircle.io/`
- `http://www.qurancircle.io` -> `308` -> `https://www.qurancircle.io/`

## 2) Robots and Sitemap

Command:
```bash
curl -sSL -D - https://www.qurancircle.io/robots.txt -o -
curl -sSL -D - https://www.qurancircle.io/sitemap.xml -o -
```

`robots.txt` body:
```txt
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://qurancircle.io/sitemap.xml
```

`sitemap.xml` body (sample):
```xml
<loc>https://qurancircle.io</loc>
<loc>https://qurancircle.io/browse</loc>
```

## 3) Metadata Extraction on Scoped Pages

Command:
```bash
for p in / /browse /my-circles /account /reset-password; do
  html=$(curl -sSL "https://www.qurancircle.io$p")
  # extracted: title, description, canonical, robots, og:url, h1
  ...
done
```

Summary:
- `/`: title+description present, no canonical, no robots tag, `og:url=https://qurancircle.io`
- `/browse`: same title+description as home, no canonical, no robots tag, `og:url=https://qurancircle.io`
- `/my-circles`: custom title+description, no canonical, no robots tag
- `/account`: homepage title+description, no canonical, no robots tag
- `/reset-password`: homepage title+description, no canonical, no robots tag

## 4) Private/Account Route HTTP Status and Indexation

Command:
```bash
for p in /my-circles /account /reset-password; do
  curl -sS -o /dev/null -D - "https://www.qurancircle.io$p" | sed -n '1,25p'
done
```

Observed:
- All three routes return `HTTP/2 200`.
- No `X-Robots-Tag` header observed.
- No page-level `meta name="robots"` noindex on `/account` or `/reset-password`.

## 5) Invalid Dynamic Route Behavior

Commands:
```bash
curl -sS -o /dev/null -D - https://www.qurancircle.io/s/INVALID1 | sed -n '1,24p'
html=$(curl -sSL https://www.qurancircle.io/s/INVALID1)
```

Observed:
- HTTP status: `200`
- `<title>Circle Not Found - QuranCircle</title>`
- `<meta name="robots" content="noindex"/>`
- Stream includes `NEXT_HTTP_ERROR_FALLBACK;404`
- Control check: `/this-page-does-not-exist` returns proper `HTTP/2 404`

## 6) Sitemap Lastmod Volatility

Command:
```bash
curl -sSL https://www.qurancircle.io/sitemap.xml | rg '<lastmod>'
sleep 2
curl -sSL https://www.qurancircle.io/sitemap.xml | rg '<lastmod>'
```

Observed:
- First request static lastmod: `2026-02-23T02:14:18.938Z`
- Second request static lastmod: `2026-02-23T02:14:21.681Z`
- Static URL lastmod changes every request.

## 7) Trust/Legal Page Availability

Command:
```bash
for p in /privacy /terms /contact /about; do
  curl -sS -o /dev/null -w "%{http_code}\n" "https://www.qurancircle.io$p"
done
```

Observed:
- `/privacy` -> 404
- `/terms` -> 404
- `/contact` -> 404
- `/about` -> 404

## 8) Crawl Depth Snapshot (Unauthenticated)

Command:
```bash
# Node BFS crawl up to depth 3 from /
```

Observed graph:
- `/` [200] depth=0 links=4
- `/manifest.json` [200] depth=1 links=0
- `/my-circles` [200] depth=1 links=4
- `/browse` [200] depth=1 links=4

Discovered paths:
- `/`
- `/browse`
- `/manifest.json`
- `/my-circles`

## 9) Structured Data Check

Command:
```bash
for p in / /browse /my-circles; do
  html=$(curl -sSL "https://www.qurancircle.io$p")
  rg -qi 'application/ld\+json' <<< "$html"
done
```

Observed:
- No JSON-LD found on audited pages.

## 10) Lighthouse Results

Tool:
- `npx lighthouse 13.0.3`

Output artifacts:
- `/tmp/lh-home-mobile.json`
- `/tmp/lh-browse-mobile.json`
- `/tmp/lh-home-desktop.json`
- `/tmp/lh-browse-desktop.json`

Metrics extracted:

### Home `/`
- Mobile: Perf 86, SEO 100, FCP 0.96s, LCP 4.11s, TBT 21ms, CLS 0.00
- Desktop: Perf 98, SEO 100, FCP 0.31s, LCP 0.87s, TBT 0ms, CLS 0.00

### Browse `/browse`
- Mobile: Perf 88, SEO 100, FCP 0.97s, LCP 3.45s, TBT 2ms, CLS 0.11
- Desktop: Perf 98, SEO 100, FCP 0.30s, LCP 0.72s, TBT 0ms, CLS 0.03

Common opportunity flagged:
- `unused-javascript`: estimated savings ~126 KiB

## 11) Code-Level Traceability

Key files inspected:
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/layout.tsx:52`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/browse/page.tsx:1`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/robots.ts:4`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/sitemap.ts:5`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/lib/site-url.ts:5`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/account/page.tsx:98`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/reset-password/page.tsx:46`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/my-circles/page.tsx:4`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/app/s/[shortCode]/page.tsx:13`
- `/Users/ahmet/Documents/Alpaylabs/QuranCircle/components/footer.tsx:38`
