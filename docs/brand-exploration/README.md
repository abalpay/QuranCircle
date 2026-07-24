# QuranCircle — Net-new Isometric Identity Exploration

This round treats the project as a full redesign. It does not inherit the current illustrated Qur'an icon, green-and-gold palette, or lettermark.

The SVGs are direction-finding marks built with production constraints already in mind: flat vector faces, no filters, no hairlines, strong silhouettes, compact view boxes, and geometry that can be optically simplified at favicon size.

## Concepts

1. **Continuum Q** — A continuous, faceted loop becomes a `Q`. It communicates completion, return, and a circle without relying on a literal book. This is the most ownable brand direction.
2. **Common Space** — Three planes converge around one circular opening. It represents many participants sharing one source of truth. This is the most architectural and isometric direction.
3. **Interlock** — Two folded ribbons complete each other. It represents shared responsibility and reciprocal participation. This is the warmest, most human direction.
4. **Thirtyfold** — Six modules form one loop; each module can conceptually stand for five Juz, making `6 × 5 = 30`. This is the strongest product-story direction.

## Production acceptance criteria

- The core mark reads at 16, 24, 32, 48, and 512 px.
- A one-color version has the same recognizability as the full-color version.
- No important meaning depends on gradients, shadows, transparency, or fine detail.
- The app icon stays inside the maskable-icon safe zone.
- Wordmark and symbol work independently.
- Horizontal, stacked, icon-only, and compact-header lockups are defined.
- Light, dark, monochrome, and high-contrast variants are supplied.
- The SVG source is accessible, optimized, and free of embedded raster imagery.
- The favicon receives a separately drawn optical variant instead of a naive scale-down.

## Rollout surfaces already identified

- Header and desktop footer
- Next.js dynamic icon and Apple touch icon
- Legacy `favicon.ico`
- PWA manifest icons, including maskable output
- Home and resource-page structured-data logos
- Default and event-specific Open Graph images
- Metadata image URLs and social previews

No product surface should be changed until one direction is selected and its small-size tests pass.

## App-aligned round

After reviewing the rendered landing page, the original multicolor exploration was rejected as too close to generic technology branding. The app-aligned ImageGen round instead derives its visual language from the product:

- Deep emerald sanctuary background
- Parchment progress-ledger surfaces
- Antique-gold rules and restrained sage accents
- Editorial serif typography
- Fine Islamic-geometric rosette details
- The 30-cell Juz completion grid

`generated-aligned/01-folded-circle.png` is the retained reference for the
selected direction. The discarded alternatives were either too detailed at
favicon size or too close to generic modular technology marks.

The selected image is an ideation reference. The production implementation is
the exact SVG geometry documented in `docs/brand-guidelines.md`.
