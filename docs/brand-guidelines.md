# QuranCircle Brand Mark

## Core idea

The Folded Circle mark combines three ideas:

- The antique-gold outer circle represents one collective Khatm.
- Two folded page planes represent readers contributing separate portions.
- The continuation stroke turns the circle into a `Q`, making the symbol specific to QuranCircle.

The mark is intentionally flat. Its isometric quality comes from the relationship between the two folded planes, not from shadows, gradients, or simulated materials.

## Palette

| Role | Hex | Use |
| --- | --- | --- |
| Sanctuary green | `#0d332a` | App and icon backgrounds |
| Deep green | `#17473b` | Mark on light backgrounds |
| Parchment | `#f6eedc` | Left plane on dark backgrounds |
| Sage | `#8fa78e` | Secondary plane |
| Antique gold | `#c6a15b` | Circle and restrained accents |

## Source assets

- `public/brand/qurancircle-mark-on-dark.svg`
- `public/brand/qurancircle-mark-on-light.svg`
- `public/brand/qurancircle-mark-monochrome-light.svg`
- `public/brand/qurancircle-mark-monochrome-dark.svg`
- `components/brand-mark.tsx`

Raster and favicon outputs are generated from the SVG source:

```bash
node scripts/generate-brand-assets.mjs
```

## Generated assets

- `qurancircle-icon-180.png` — Apple-scale static output
- `qurancircle-icon-192.png` — PWA icon
- `qurancircle-icon-512.png` — PWA and structured-data logo
- `qurancircle-maskable-512.png` — maskable PWA icon with expanded safe area
- `app/favicon.ico` — 16, 32, and 48 px favicon
- `public/quran-icon.png` — backward-compatible legacy URL

## Usage

- Use `on-dark` in the header, footer, dark social cards, and sanctuary-green surfaces.
- Use `on-light` on parchment, white, or pale neutral surfaces.
- Use monochrome variants only when color reproduction is unavailable.
- Keep clear space around the mark equal to at least one fifth of its diameter.
- Minimum normal digital size is 24 px. Use the generated favicon below that size.
- Preserve the original aspect ratio and palette.

Do not add shadows, gradients, outlines, rotations, calligraphy, or extra religious symbols. Do not place the mark inside an additional circular badge; the gold circle is already part of the symbol.

## Product rollout

The mark is used by the header, footer, dynamic Next.js icon routes, favicon, Apple icon, PWA manifest, structured-data organization logos, default Open Graph image, and event-specific Open Graph images.
