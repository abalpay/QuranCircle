# Impeccable quality bar (finish reviewer checklist)

Apply to every UI stream (D22). Evidence: before/after PNGs from
`npm run capture:pages -- <label> <pages>` at 390px and 1440px, English and Arabic.
Pass only if every box is ticked for each touched page, or a waiver is written down.

1. **Overflow and clipping.** No horizontal scroll at 390px (`scrollWidth <= clientWidth`).
   No clipped text, buttons or dialogs; dialogs scroll inside the viewport. Fixed
   bottom nav / floating claim bar never covers the last content or form fields
   (check with the page scrolled to the bottom and with the keyboard open).
2. **Long and mixed names.** View the DSGLONG, DSGARABIC and DSGPART circles. 200-char
   title wraps to at most three lines, then truncates or scales; 100-char claimer name
   truncates with ellipsis and is readable in full on tap or title. Latin inside Arabic
   and Arabic inside Latin keep correct order and punctuation (`<bdi>`/`dir="auto"`).
3. **RTL mirroring.** `/ar` is checked on its own screenshot, not assumed. Logical
   CSS properties only; directional icons mirror, check marks and the brand mark do not;
   progress fills from inline start; no `left/right/ml/mr` utilities left in touched files.
4. **Translation completeness.** No English left on `/ar`, no placeholder or example
   text out of locale (e.g. "Ramadan 2025"), keys present in en, tr and ar.
5. **Contrast.** Body text 4.5:1, large text and UI borders 3:1, including gold on green,
   muted text on parchment and text over pattern/gradient backgrounds. No information
   conveyed by colour alone.
6. **Tap targets.** Every interactive element at least 44x44px at 390px (icon buttons,
   tabs, language links, footer links), with 8px between neighbours. Visible focus ring.
7. **Status colour meaning.** Available / Reading / Done / Completed / Archived use the
   same colour, icon and word on every page (direction.md). Badges must be true: a
   completed or archived circle must not read "Open for claims".
8. **Empty, loading, error states.** Each touched view has all three, in both locales:
   empty circle, 0 results in Browse/My Circles, skeleton or `loading.tsx` without layout
   jump, failed action toast with a next step, not-found page for bad short codes.
9. **Typography and spacing.** No text below 12px, line length under ~75 characters,
   consistent spacing scale, one card level (no cards in cards), no more than three lines
   of title on mobile.
10. **Motion and tone.** Respects `prefers-reduced-motion`; no confetti, photos, candles,
    likes or social-proof counts on family-facing pages (D16); copy is plain and non-urgent.
11. **Desktop (1440px).** Layout uses the width deliberately: reading column capped,
    no stretched buttons, no empty half-screens, header and footer aligned to content width.
12. **Regressions.** `npm run lint`, `npm run test:unit` pass; existing E2E selectors
    (English text) still match.

Reviewer output: pass/fail per item with the screenshot filenames that prove it.
