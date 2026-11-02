# Design direction

Basis: D2 (families at a death or serious illness first), D16 (a khatm page that
stays, Quran-first, no photos/candles/likes), D22 (Impeccable bar). Baseline
captures: 160 PNGs (`npm run capture:pages -- baseline all`, saved outside the repo).
Validated by an Impeccable critique on 2026-11-02 (independent design review +
detector): circle page 19/40, homepage 20/32. Verdict: the palette, serif name and
30-tile grid are authored for this product; the structure around them is a generic
tracker/landing template, and the D16 product (a person, a dua, a record that
stays) is missing.

Points marked **TASTE CALL** are for the owner to approve. Each has a
recommendation and one alternative; nothing here is decided until approved.

## Tone
A quiet room, not a product. The person arriving is grieving or worried and was
sent a link by family. Plain sentences, no exclamation marks, no gamification
language ("streak", "leaderboard"), no urgency. Name of the person and the dua
come first; the product comes second. Copy describes the practice ("a khatm for
Maryam") and takes no theological position on reward transfer.

## Typography
- Keep Cormorant Garamond (display) + Manrope (UI); Noto Naskh Arabic for Arabic.
- Circle title: one to three lines, then shrink (never more than 3 lines at 390px).
  The long-name fixture currently runs 9 lines and pushes progress off screen.
- Body 16px minimum, 1.6 line height (1.8 Arabic). Labels never below 12px; the
  10px juz-grid names and the tracking-wide "READ TOGETHER" tagline are too small.
- Choose the face by the script of the text, not the locale: a Latin circle title
  stays Cormorant under /ar, an Arabic title gets Naskh under /en. Every piece of
  user text (title, dua, names) gets `dir="auto"`; mixed fragments get `<bdi>`.
- Numbers in the grid and counts use lining, tabular figures (Cormorant's old-style
  "1" reads as "I").
- **TASTE CALL 1, title face for Arabic circles.** Recommend Noto Naskh at
  medium weight (500–600; regular is too thin at 44px on low-end Android).
  Alternative: keep bold for hierarchy.

## Colour
Keep the sanctuary palette (green `#0d332a`/`#17473b`, parchment, sage, antique
gold `#c6a15b`). Gold is an accent, never a state colour. Status colour meaning
(must be identical everywhere, always paired with an icon or word, never colour only):
Available = neutral/ghost, Reading = gold/amber, Done = green with check.
Destructive = red only for delete/archive confirmations. Completed khatm = green
filled, not a new colour.
- Gold is for ornament and large display only. Gold *text* fails on parchment
  today (`#a38343` 3.3–3.5:1; footer tagline 2.9:1); text needs a darker gold token
  at 4.5:1 or ink.
- Tile state is shown by a full-tile tint plus icon/word, not a 3px coloured top
  border on a rounded tile.
- **TASTE CALL 2, amber for "Reading".** Recommend keeping amber but desaturating
  and dropping the orange name text (it reads as warning). Alternative: sage for
  Reading so amber is free for attention-only moments.

## Spacing and shape
8px base grid. 24px between page sections on mobile, 40-64px on desktop. Cards:
one level only, no nested cards (circle page has card-in-card today). One soft
shadow, no glow. Content width 80rem for marketing, 44rem reading column for
circle page text at desktop so lines stay under ~70 characters.
Tap targets at least 44x44px (juz tiles are 56px wide, fine; icon buttons 40px, not).

## Page hierarchy for the circle page (D8, D16)
1. Name of the person + dua (dua in ink at 16–17px, not muted small print).
2. Your Juz / one primary action. 3. "N of 30
claimed" (Done as quiet secondary line). 4. Grid. 5. Earlier khatms. 6. The
invitation to start a khatm for someone you love (below, never above, the dua).
Badges ("Public circle", "Open for claims") are demoted to one quiet line and
hidden when untrue (a completed khatm must not say "Open for claims").
- **TASTE CALL 3, homepage lead.** Recommend memorial-first hero ("A khatm for
  someone you love" with a name-and-dua sample) per D16; keep Ramadan as a guide.
  Alternative: keep the generic "group Khatm tracker" hero and add a memorial
  strip below it.
- **TASTE CALL 4, completion moment (#81) tone.** Recommend stillness: the
  name, a short du'a line, "Khatm 1 complete", the next-step invitation; no
  confetti, no motion. Alternative: one slow fade-in of a gold ring around the
  completed count.
- **TASTE CALL 5, decorative pattern.** Recommend (revised after critique):
  keep the geometric star pattern in the footer only, as one of the few authored
  identity marks; remove it and the gradient glow from behind the circle title,
  dua and cards. Alternative: remove it everywhere.

## RTL rules
- Use logical properties only (`ps/pe/ms/me/start/end`, `text-start`), never
  `left/right`, `ml/mr`, `pl/pr`. Icons that imply direction (arrows, chevrons,
  external-link) mirror; brand mark, check, clock, numerals do not.
- The juz grid reads right-to-left (Juz 1 at the top right) as now; keep.
- Western digits in UI chrome are acceptable; do not mix digit systems in one view.
- Progress bar fills from the inline start.
- Trailing punctuation of Latin text inside Arabic sentences is wrapped in `<bdi>`
  (current "Paradise." renders with the full stop at the wrong end).
- Every string is translated: Arabic must not show English placeholders or
  nonsense verbs (cancel is currently `يلغي`; it should be `إلغاء`).

## What "quiet and dignified" means, concretely
- One primary button per screen. No more than two type sizes of emphasis per card.
- No autoplay, no looping animation; transitions at most 150-200ms, honour
  `prefers-reduced-motion`.
- No counts of people as social proof on pages families see (circle page, completion).
- No banners, popups or install prompts over a circle page on first visit.
- Empty states say what happens next in one sentence. Errors are plain and
  non-blaming, never red walls.
- Photos, candles, likes, comments, "walls": not now and not later (D16).
- The grid is a register of who read, not just a tracker: Done tiles keep the
  reader's name; a completed khatm reads as a record ("Khatm 1 · completed
  2 Nov · 30 readers"), never as "Open for claims".
- The end of a visit is the part people remember: after claiming, a quiet
  confirmation ("Juz 17 is yours · Open on Quran.com"); no install sheet or other
  product prompt at that moment.
