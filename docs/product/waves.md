# Waves

Work ships in waves. Each wave has one goal, follows [decisions.md](decisions.md),
and is finished (tests, all three locales, deployed) before the next starts.

## Wave 1: Finish the khatm

**Goal:** khatms actually complete, and completion feels like the moment it should be.
**Baseline (31 Oct 2026):** 0 public khatms ever completed; 23% of claimed Juz marked read.

### 1. Completion rule (D5, D6)

- Migration: add `khatms.completion_source` (`all_done | organizer | auto`).
- `mark_juz_read_with_completion`: record `all_done` when it completes a khatm.
- New RPC `complete_khatm(p_short_code, p_khatm_id)`: creator only, all 30
  claimed, not already complete; sets `completed_at` + `organizer`.
- Daily `pg_cron` job: complete khatms with no unclaimed Juz whose latest
  `claimed_at` is over 7 days old, as `auto`.
- `unclaim_juz` rejects completed khatms. (Claiming into one is already
  impossible: every Juz is claimed, and `claim_juz_batch` opens the next khatm
  as soon as one fills.) Done/undo still allowed.
- Snapshot RPC returns `completed_at` per khatm.
- Ongoing switch (D13): `events.open_next_khatm` (default true);
  `claim_juz_batch` only opens the next khatm when it is on; switching it off
  deletes an empty trailing khatm. Organizer toggle in circle settings.
- Database tests for each path, including the creator-only and all-claimed checks.

### 2. Organizer prompt

- When a khatm is fully claimed and not complete, the creator sees a banner:
  "All 30 Juz are claimed. Complete the khatm" + "Completes automatically on
  [date]". Confirmation dialog before completing.

### 3. Completion moment (D10)

- A completed khatm shows a completion state to everyone: "Khatm completed for
  [circle name]", a short dua, share to WhatsApp, and the support link.
- Shown once per device as a dialog, then as a persistent banner on that khatm.
- The circle's share preview image shows the completed state.
- Fix the existing "completed" badge to mean `completed_at` is set (today it
  means "fully claimed and a newer khatm exists").
- Wording (D16): a khatm completed by the 7-day rule says all 30 Juz were taken
  up, not that the Quran was read; describe the practice ("a khatm for
  [name]"), never theologise.

### 4. Reader view (D7, D8)

- Rename states to Available / Reading / Done (en, tr, ar).
- "Your Juz" block at the top of the circle page in every tab, with Done.
- After claiming: "Juz N is yours. JazakAllah khair. When you finish, you can tap
  Done here."
- Hint for the other-phone case: "Claimed on another phone? Ask the organizer to
  mark it Done."
- Progress bar and copy lead with claimed; Done is secondary.

### 5. Honest numbers and support (D1, D10, D12)

- Homepage stat "Khatms active now" becomes "Khatms completed".
- Footer + completion screen: support link and "Free forever. No ads. Built as
  sadaqah jariyah."
- Support URL comes from the user (blocked until provided).
- A saved SQL query (`scripts/`) for the weekly numbers: circles created, Juz
  claimed, khatms completed by source, Done marks.

### 6. Privacy copy (D9)

- Default is already link-only. The public toggle states that circle name,
  description and reader names become visible to anyone and to search engines.

### 7. Create without an account (D15)

- Organizers create a circle with a name only, on their anonymous session.
  The create RPC and dialog stop requiring a non-anonymous account.
- After sharing: an optional "Add your email to manage this circle from any
  phone" prompt, using the existing anonymous-to-account merge.
- My Circles works for anonymous organizers on that browser.
- CAPTCHA on anonymous sign-ins (provider decided on the plan issue).
- The anonymous-user cleanup keeps any user who created a circle (it already
  does; covered by a test).

### 8. Design audit (D22) — first

- Impeccable audit of every page at 390px and 1440px, English and Arabic:
  design direction, prioritised fix list and the quality bar, in `docs/design/`.
- `scripts/capture-pages.mjs`: before/after screenshots of named pages at both
  widths and both directions, used by every UI stream from here on.
- Blocks the UI streams #79, #80, #81.

### 9. Browse lists only active circles (D21)

- Browse shows a circle only if created in the last 7 days or claimed in the
  last 30 days. Nothing is deleted; stalled circles keep working on their link.

### Out of scope for wave 1

Deadlines, "start your own khatm" call to action, new languages, charity links,
reopening completed khatms, cross-device identity, reminders.

### Done when

- All five completion paths and rejections covered by database tests.
- Unit tests updated; `npm run test:unit` and `npm run lint` pass.
- en, tr and ar keys in sync.
- Deployed, and the first cron run checked against production data.

## Wave 2: Grow — the khatm for someone (planned)

**Goal:** every circle recruits the next organizer, and the circle becomes a
page the family keeps and re-shares (D16, D17).

- **Start a khatm for someone you love** on the circle page and the completion
  screen, with the source stored in the database to measure
  participant → organizer conversion (D12, D17).
- **The circle as a page that stays:** the person's name and an
  organizer-editable dua shown prominently, and the khatms completed for them
  over time ("3 khatms completed for [name]"). Homepage and metadata reworded
  around the memorial and healing moment (D2, D16).
- **Share preview refresh:** the WhatsApp preview shows the name, live progress
  and "free, no account needed".
- **Deadline presets** (3 / 7 / 40 days) replacing the 7-day safety net when set.
- **Memorial-day reminders** (D18): opt-in email for organizers with an email
  (40th day, anniversary) through the existing email function, plus an
  on-page reshare prompt.
- **Indonesian locale** (Indonesia was the #2 country in Oct 2026 with no locale).
- **Memorial and healing guides** (D20): one per language, Arabic, Indonesian,
  English (South Asian terms), Turkish.
- **Design polish (D22):** an Impeccable pass over every page no stream touched
  in waves 1–2, on mobile and desktop, English and Arabic.
- **Reliability:** an uptime check on the circle page and verified database
  backups; a broken circle page in a funeral week is the worst failure.

## Wave 3: Reach (planned)

- Persian, then Urdu locales, with their memorial guides (D20).
- "Give sadaqah for [name]" charity links (D11).
- Time-based recurring khatms (weekly / monthly) for mosques and study groups (D14).
- Outreach to mosques and burial societies (not code). Ramadan 2027 (early
  February) readiness by January.
