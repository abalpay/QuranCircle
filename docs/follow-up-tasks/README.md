# Follow-up Tasks

Last reviewed: 4 September 2026

This document tracks follow-up work identified after adding Turkish and Arabic
localization. English, Turkish, and Arabic support is already merged into
`main` in merge commit `0eaec1c`.

## Recommended before wider promotion

### Native Arabic copy review

- Status: Outstanding
- Priority: High
- Review the Arabic catalog in `messages/ar.json` with a native Arabic speaker.
- Pay particular attention to Quran, Khatm, Juz, claim, completion, invitation,
  authentication, and error terminology.
- Test the reviewed wording in context on mobile and desktop rather than
  reviewing the message file alone.

Completion criteria:

- All user-facing Arabic messages have been reviewed.
- Terminology is consistent across landing, authentication, circle, account,
  and resource pages.
- Any wording changes pass catalog-parity and locale browser tests.

### Production locale smoke test

- Status: Outstanding
- Priority: High
- Verify `/`, `/tr`, and `/ar` in production.
- Confirm browser-language detection on a fresh session.
- Confirm a manual language choice persists and overrides later detection.
- Exercise sign-in, registration, account, browse, circle, and sharing flows.
- Check Arabic RTL layout at mobile and desktop widths for overflow, clipping,
  misplaced icons, and mixed-direction content.

Completion criteria:

- All three locales complete the primary user journeys without errors.
- Locale selection and authentication redirects preserve the intended locale.
- No Arabic layout regressions or browser-console errors are present.

## Discoverability and localization

### Search indexing validation

- Status: Outstanding
- Priority: Medium
- Submit or re-check `sitemap.xml` in Google Search Console.
- Inspect representative English, Turkish, and Arabic URLs.
- Confirm canonical and `hreflang` relationships are recognized.
- Monitor excluded, duplicate, or incorrectly canonicalized localized pages.

### Turkish and Arabic search strategy

- Status: Outstanding
- Priority: Medium
- Research the phrases Turkish and Arabic users actually use for group Quran
  reading, Khatm coordination, Juz assignment, Ramadan groups, and WhatsApp
  organization.
- Compare those phrases with current page titles, descriptions, headings, and
  resource copy.
- Prioritize useful localized content rather than direct keyword substitution.

### Country-based language behavior

- Status: Decision required only if desired
- Priority: Low
- Current behavior uses browser language plus the saved user preference.
- Physical location or IP address does not force Turkish or Arabic.
- Recommendation: retain the current behavior because it respects travellers,
  multilingual users, VPN users, and explicit choices.
- If country-based suggestions are introduced later, prefer a dismissible
  language suggestion over a forced redirect.

## Optional repository cleanup

### Remove merged local branches

- Status: Optional
- Priority: Low
- `agent/arabic-localization` and `agent/redesign-qurancircle-logo` are merged.
- Their remote branches have already been removed.
- The local branches can be deleted after confirming they are no longer useful.

## Separate repository maintenance

These open items require a fresh review against current `main`; this repository
maintenance change does not close, merge, or otherwise mutate them.

| PR | Status | Required follow-up |
| --- | --- | --- |
| #26 | Refresh required | Align the Node type definition update with Node 24, not Node 26, then test it. |
| #43 | Pending framework batch | Treat it as superseded by the Next.js/React framework batch only after that batch merges. |
| #51 | Policy refresh required | Refresh and re-split it after the Dependabot policy lands, then test the resulting scope. |
| #52 | Policy refresh required | Refresh and re-split it after the Dependabot policy lands, then test the resulting scope. |
| #54 | Pending security checkpoint | Treat it as superseded by the security checkpoint only after that checkpoint merges. |

Native dependency changes must include the exact `allowScripts` approvals for
the reviewed package versions. Review each newly introduced install script
before explicitly approving it; do not loosen `strict-allow-scripts` as a
shortcut.

Later dependency batches remain separate, tested maintenance work. This includes
updating the Supabase CLI pin from 2.109.1 to 2.116.0; it is not silently
included in this policy change.
