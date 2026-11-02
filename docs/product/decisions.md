# Product Decisions

The rules QuranCircle is built on. Every feature must follow them; change a rule
here first, then change the code. Newest decisions are added at the bottom of
each section with the date.

## Purpose

**D1. QuranCircle is sadaqah jariyah, not a business.** (2026-11-02)
Free forever, no ads, no paywalls, no paid tiers. Work is prioritised by how much
Quran gets read and how many families are served per hour of effort.

**D2. We serve families at a death or a serious illness first.** (2026-11-02)
Evidence (31 Oct 2026): ~20 of 27 public circles were memorial (esaal-e-thawaab)
or healing (shifa) khatms; only one was for Ramadan. Copy, defaults and features
are designed for that moment. Ramadan and community khatms are supported, not
the pitch.

**D3. The circle page is the product and the marketing.** (2026-11-02)
Evidence (Oct 2026): ~97% of visits arrive by shared link with no referrer, ~90%
land on a circle page, search sends almost nothing. Anything that should reach
new people must live on the circle page.

**D16. Positioning: "the khatm for someone — a page that stays".** (2026-11-02)
A circle is a shared khatm page for someone the family loves (who has died or is
ill): their name, a dua, and the khatms completed for them over time. It is
re-shared on later memorial days. Quran-first: no photos, candles, likes or
"wall" features. Copy describes the practice ("a khatm for [name]") and never
takes a theological position on reward transfer. Two independent reviews (2 Nov
2026) reached this positioning separately.

**D17. The growth engine is participant → next organizer.** (2026-11-02)
Every circle shows QuranCircle to 20–50 people at an emotional moment. The
circle page and completion screen invite them to start a khatm for someone they
love, and creating one must take seconds (D15).

## Khatm rules

**D4. Claiming a Juz is the commitment.** (2026-11-02)
A reader who claims a Juz is trusted to read it, as in offline khatms. Nothing
in the app may suggest the khatm is waiting on a reader to come back.

**D5. A khatm completes when the first of these happens:** (2026-11-02)
1. All 30 Juz are marked Done, or
2. The organizer taps "Complete khatm" (only possible once all 30 are claimed), or
3. Seven days pass after the last Juz was claimed, with all 30 claimed (safety
   net so a forgotten khatm still completes). Once deadlines exist, a deadline
   replaces the 7 days.

The rule applies to existing khatms too: fully claimed khatms older than 7 days
complete on the first run.

**D6. A completed khatm is final.** (2026-11-02)
No claiming or unclaiming in a completed khatm. Readers may still mark their Juz
Done. No reopening (revisit only if organizers ask for it).

**D7. "Done" is optional and never nagged.** (2026-11-02)
Juz states are shown as **Available → Reading → Done** (data stays
`unclaimed / claimed / read`). A reader sees their own Juz with a one-tap Done
at the top of the circle page. No reminders or prompts. If they come back on
another phone they are told to ask the organizer, who can mark any Juz Done.
Reason: active circles do use it (one had 55 of 118 marked within two days), but
most readers never return, so completion must not depend on it.

**D8. Progress leads with claimed, not read.** (2026-11-02)
The main progress is "N of 30 claimed". Done count is a quiet secondary line.

**D13. Circles are ongoing by default; organizers can stop them.** (2026-11-02)
When a khatm fills, the next one opens (current behaviour; 10 of 27 public
circles went past one khatm). Each khatm completes on its own under D5. The
organizer can switch off "Open a new khatm when this one fills"; switching it
off removes an empty trailing khatm, so a one-khatm circle never shows an
unfinished extra khatm. Archiving stays separate (it freezes everything).

**D14. Time-based recurring khatms are a later feature.** (2026-11-02)
A new khatm every Friday or month (mosques, study groups) is planned for
wave 3, not built now.

**D15. Organizers can create a circle without an account.** (2026-11-02)
Creating needs only a circle name, like claiming needs only a reader's name. The
organizer is recognised by their browser's anonymous session, as readers are.
After the link is shared, one optional prompt: "Add your email to manage this
circle from any phone" (uses the existing anonymous-to-account merge). Without
an email, organizer controls live on that one browser; if it is lost, the
circle still completes through D5's 7-day rule, and archive/delete wait for
recovery or a support request. CAPTCHA on anonymous sign-ins guards against
spam circles. Evidence: the sign-in wall sat in front of the one person the
growth engine depends on (D17).

**D18. Organizers may opt in to memorial-day reminders by email.** (2026-11-02)
Organizers who added an email can tick "remind me on the 40th day and the
anniversary". Organizer only, opt-in, unsubscribable; readers never get
reminders (D7). The circle page also shows a reshare prompt as the date nears.

## Privacy

**D9. New circles are link-only by default.** (2026-11-02)
Public circles expose the names of ill or deceased people and of every
participant, and are listed in the sitemap. Public listing is an explicit opt-in
that says what becomes visible.

## Money

**D10. One voluntary support link, asked at gratitude moments only.** (2026-11-02)
An external donation page (Ko-fi, LaunchGood or Stripe link; no payments code).
Shown on the completion screen and in the footer, never while creating a circle
or claiming a Juz.

**D11. Charity links take no cut.** (2026-11-02)
"Give sadaqah for [name]" links go straight to trusted charities without a fee
("الدال على الخير كفاعله").

**D19. The support link is the only money mechanism, for now.** (2026-11-02)
Considered and declined for now: a one-off waqf endowment fundraiser, a single
disclosed charity sponsor, and a paid tier for institutions (would change D1).
Never: ads; a cut of sadaqah; paid memorial features; sharing or selling names
or emails; donation asks while claiming or on a circle created in the last 72
hours; AI-generated duas or "messages from the deceased".

## Search

**D20. Search effort targets memorial and healing intents in users' languages.** (2026-11-02)
One genuine short guide per language for memorial and healing khatms (Arabic,
Indonesian, English with South Asian terms such as "Quran Khwani" and
"esaal-e-thawaab", Turkish), each ending in "start one, free". The existing
generic guides (tracker, WhatsApp, Ramadan) stay but get no further investment.
Evidence: the generic plan brought ~10 search visitors a month after 8 months.

## Measurement

**D12. Success = juz claimed and khatms completed.** (2026-11-02)
Measured from the database (`juzs.claimed_at`, `khatms.completed_at` and how each
khatm completed), not Vercel custom events: the Hobby plan does not record them.
Done marks are tracked as a secondary signal.

## Not doing

- Cross-device reader identity (personal tokens or links). Not needed once Done is
  optional (D7).
- Reminders or notifications to readers (organizer opt-in only, D18).
- Organizer interviews before wave 2 (skipped for now, 2026-11-02; build from
  the usage data).
- Ads, paid tiers, organisation plans.
- Extra worship tools (tasbih counters, Yasin readings) until completion works.
