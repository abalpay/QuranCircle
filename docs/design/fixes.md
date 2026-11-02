# Fix list (baseline audit)

Source: `captures/baseline` (160 PNGs; 390/1440, en/ar). Priority P1 = broken or
wrong for a family arriving at a circle, P2 = clear quality gap, P3 = polish.
Tag = wave issue that touches the page: #79 reader view, #80 organizer completes,
#81 completion moment, #83 footer/home stat, #89 add-email prompt + create flow,
#92 homepage + circle header (wave 2), #97 guides, `polish` = no stream touches it.
Validated and extended on 2026-11-02 by an Impeccable critique (independent design
review + detector, desktop overlay on /, /ar, two circles and /browse). Items 37–52
are from that critique.

## Circle page (`/s/[code]`)
1. P1 #92 Title has no cap: a 150-char name takes 9 lines at 390px and pushes progress and grid below the fold. Cap at 3 lines, scale type, keep full text in tooltip/"more".
2. P1 #81 Completed khatm looks like any other and the header still says "Public circle / Open for claims" and the filter shows "Available (0)". Needs a completed state (green, "Khatm 1 complete"), badge hidden.
3. P1 #79 No visible "your Juz" block at the top; reader must open the "My Juz" tab. (Reader own-Juz fixture: DSGREADER.)
4. P2 #92 Two badges ("Public circle", "Open for claims") stack above the title and crowd it; collapse into one quiet line under the dua.
5. P2 #92 Progress card repeats card-in-card; "Progress Tracker 53%" should read "N of 30 claimed" with Done as a quiet secondary line (D8). The collapse chevron is already 44px; its placement is the problem.
6. P2 #79 Juz tiles: claimer names at about 10px, orange on cream, truncated ("Muham..."); raise to 12px, neutral text, show full name on tap.
7. P2 #80 Organizer controls are a lone gear icon (40px) beside Share; give it a labelled button and 44px target.
8. P2 #92 Arabic: Latin title and dua render in Naskh bold with the full stop on the wrong side ("Paradise." leading). Wrap user text in `<bdi>`.
9. P3 #89 Floating claim bar and bottom nav both fixed on mobile; verify they never overlap the last row (full-page captures show the bottom nav mid-page, which is a screenshot artifact of fixed positioning).
10. P3 #92 Archived and multi-khatm ("load older") states: check hierarchy once #81 lands (fixtures DSGARCH, DSGMULTI).

## Homepage (`/`)
11. P1 #92 Hero is generic ("Complete a group Qur'an Khatm, together") with an interactive tracker preview; D2/D16 call for "a khatm for someone you love". See TASTE CALL 3.
12. P2 #83 Stats strip ("9+ circles created", "15+ khatms active now") is social proof and sits straight under the hero; replace per #83.
13. P2 #92 Page is about 4100px long at desktop with seven sections (spreadsheet comparison, how it works, quote, guide cards, CTA). Cut the "usual way vs QuranCircle way" block and one guide section.
14. P3 #92 Tagline "READ TOGETHER" (gold on dark green, about 9px, wide tracking) fails contrast and size; header at 390px is fine otherwise.

## Create flow and dialogs
15. P1 #89 Arabic register is machine-translated across the app, not just Cancel: `يلغي` ("he cancels") → `إلغاء`, `يشارك` ("he shares") → `مشاركة`, `مطالبات` (legal/financial claims) and `مرشحات` need human wording (ar.json ~85, 256, 306, 319). Placeholder "Ramadan 2025" in English on /ar and not memorial-first (suggest "Khatm for ..."). Native Arabic review (#77 Q3).
16. P2 #89 Create dialog fields have no helper copy for the memorial case (dua field is "Description (optional)"); rename to dua/intention per D16.
17. P2 #89 Public toggle copy is dense at 390px; keep wording, add spacing, 44px switch.
18. P3 #89 Auth dialog and claim dialog: not individually reviewed beyond overflow; verify in the #89 finish review.

## Browse (`/browse`)
19. P2 #92 Cards for 100% claimed circles show an "Open" chip; state the true status. Ramadan card with no description leaves a blank block; collapse it.
20. P3 polish Intro card ("30 JUZ ... one shared reading") is decorative and takes a full screen at 390px; shorten.
21. P3 polish Search field has no clear button in `/ar` check; verify RTL icon position.

## My Circles (`/my-circles`)
22. P2 #89 Each card says "You: 0 claimed - 0 read" for organizers; hide when 0. Roles chips (Creator, Public) are low contrast.
23. P2 polish Header stat pair ("8 active, 1 archived") duplicates the tabs below it.
24. P3 #89 Anonymous-creator state (per #89) needs its own empty/explainer screen; see `my-circles-signed-out`.

## Not found and errors
25. P1 polish `/s/<unknown>` (both locales) renders a bare unstyled "Not Found" in default serif font with no header, footer, or way home. Add a styled not-found for the circle route (the generic `not-found.tsx` is styled; the circle route bypasses it).
26. P3 polish `error.tsx` and `loading.tsx`: confirm Arabic strings and layout-shift-free skeletons.

## Account, reset password
27. P2 polish Account page: long single column at desktop with form widths up to 80rem; cap to a 40rem column.
28. P3 polish Reset-password: signed-out visit shows a form with no explanation of an expired link.

## Static pages (about, contact, terms, privacy)
29. P2 polish Long-form text uses full 80rem width at desktop (line length over 120 characters); cap prose at 44rem.
30. P3 polish Verify Turkish/Arabic legal text is fully translated; headings need `scroll-margin` for anchors.

## Guides (`/group-khatm-whatsapp`, `/khatm-coordination`, `/ramadan-group-khatm`)
31. P2 #97 Ramadan-led framing; add a memorial/shifa guide and reframe the other two ("a khatm for someone") per D2.
32. P3 #97 Check CTA block reuse and consistent card height on the home guide row.

## Header, footer, global
33. P2 #83 Footer: link groups are a single wrapped row at 390px and 1440px with 44px targets missing on language links ("Turkce", Arabic label about 14px); restructure as columns.
34. P2 polish Fixed mobile bottom nav label for the signed-in user truncates ("Design Orga..."); show "Account".
35. P3 polish Body background uses radial gradients plus a footer star pattern; remove per TASTE CALL 5.
36. P3 polish Skip-to-content link and visible focus ring: verify on all pages.

## Added by the Impeccable critique
37. P1 #81 A single-khatm circle never shows as completed: the "completed" flag is only true when a newer khatm exists (khatim-page-client.tsx ~1140). #78 adds `completed_at`; #81 must use it.
38. P1 #79/#81 Done tiles drop the reader's name (juz-card.tsx ~100 renders names only for `claimed`). Keep names on Done tiles: the grid is the register (D16).
39. P1 #79 A reader's own tiles are not marked; outline them with "You" (juz-card has no `isMine`).
40. P1 #79 Remove the install-app sheet from claim success (khatim-page-client.tsx ~490–496, ~1172); it interrupts the most important moment and cannot install inside the WhatsApp in-app browser.
41. P1 #79/#92 User text has no `dir="auto"`: an Arabic title under /en is left-aligned; names truncate at the wrong end (juz-card.tsx ~101). Font must follow script, not locale.
42. P2 #79 Claiming is a forced two-step (tap → floating bar → dialog). Tapping an available tile opens the name dialog directly, with "+ add another Juz" inside it.
43. P2 #79 Unclaim is red, one tap, no confirmation, beside Mark read (khatm-card.tsx ~318). Add a confirmation.
44. P2 #79 Claimed/read tiles are not accessible: `tabIndex -1`, no role, claimer only in `title` (juz-card.tsx ~64–76). Give them a role and an accessible name with the claimer.
45. P2 #79 Claimer names 10px amber-600/80 on cream fail contrast (2.5:1); 12px+ in ink.
46. P2 #92 Juz numbers use Cormorant old-style figures ("1" reads as "I"); `lining-nums tabular-nums` (juz-card.tsx ~88).
47. P2 #92 Gold text below 4.5:1 site-wide (header tagline 3.2:1, eyebrows `#a38343` 3.3–3.5:1, footer 2.9:1); add a text-safe gold token. Header/footer "Read together" tagline at 9–10px.
48. P2 #79 Filter counts mix scopes: "All (60)" counts across khatms while the grid shows one khatm (circle-full-org).
49. P2 #80 The organizer queue is two levels deep (My Juz → Creator queue, khatim-page-client.tsx ~1059); surface it in organizer view.
50. P2 polish Server error strings reach users raw in toasts (khatm-card.tsx ~189); map to plain, translated messages.
51. P3 polish `animate-pulse` on the my-Juz nudge ignores reduced motion (khatim-page-client.tsx ~1035).
52. P3 polish Dead CSS flagged by the detector: `.hero-sanctuary::before` grid background (globals.css ~359) and `.comparison-card-primary` side stripe (~846) are unused; delete.
Detector context: tile `border-top` accent on rounded tiles (30 per circle page) → replace per direction.md; hero product preview miniatures (8–10px, nested cards) are deliberate mock UI, judged acceptable if the hero is rebuilt in #92 anyway.

## Top ten (ordered)
2 + 37 (completion state), 38 (names stay), 40 (no install sheet after claim), 3 + 39 (your Juz), 1 (title cap), 15 + 41 (Arabic register, dir/script), 25 (circle not-found), 42 (one-step claim), 5 (claimed-first progress), 47 + 45 (contrast)

## Not checked
Dark mode, Turkish locale, WebKit rendering, keyboard-open dialog layout, real
screen-reader pass, tablet widths. The #78 `completion_source` column may not
exist yet; the capture script falls back to `completed_at` only.
