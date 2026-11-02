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

### Out of scope for wave 1

Deadlines, "start your own khatm" call to action, new languages, charity links,
reopening completed khatms, cross-device identity, reminders.

### Done when

- All five completion paths and rejections covered by database tests.
- Unit tests updated; `npm run test:unit` and `npm run lint` pass.
- en, tr and ar keys in sync.
- Deployed, and the first cron run checked against production data.

## Wave 2: Grow from every circle (planned)

- "Start a khatm for a loved one" on the circle page and the completion screen,
  tagged with a source so participant-to-organizer conversion can be measured.
- Deadline presets (3 / 7 / 40 days) replacing the 7-day safety net when set.
- Homepage and metadata reworded around the memorial and healing moment (D2).
- Indonesian locale (Indonesia was the #2 country in Oct 2026 with no locale).

## Wave 3: Reach (planned)

- Persian, then Urdu locales.
- Memorial and healing landing pages per language.
- "Give sadaqah for [name]" charity links (D11).
- Time-based recurring khatms (weekly / monthly) for mosques and study groups (D14).
- Outreach to mosques and burial societies (not code). Ramadan 2027 (early
  February) readiness by January.
