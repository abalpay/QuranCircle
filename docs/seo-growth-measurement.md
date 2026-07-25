# QuranCircle SEO Growth and Measurement

This document is the operating plan for improving non-branded search
acquisition and measuring search visibility alongside useful product
outcomes, without cookies or persistent visitor attribution.

## Search intent map

Each intent has one canonical English page and localized Turkish and Arabic
alternates. Spelling variants belong in natural supporting copy and must not
become duplicate doorway pages.

| Canonical page | Primary intent | Supporting terms |
| --- | --- | --- |
| `/` | online group Quran Khatm tracker | online Khatm app, group Khatam tracker, Quran completion tracker |
| `/khatm-coordination` | how to organize a group Quran Khatm | divide the Quran among 30 readers, shared Juz tracker |
| `/group-khatm-whatsapp` | group Quran Khatm on WhatsApp | Khatm invitation message, avoid duplicate Juz claims |
| `/ramadan-group-khatm` | Ramadan group Quran Khatm plan | Ramadan Juz tracker, 30-day group Khatm |
| `/browse` | join a public Quran Khatm | public Khatm groups, claim a Juz online |

The corresponding Turkish cluster includes `online hatim takip`, `grup
hatmi`, `cüz dağıtımı`, and `hatim programı`. The Arabic cluster includes
`ختمة قرآن جماعية`, `توزيع أجزاء القرآن`, and `متابعة ختم القرآن`.

## Search Console setup

The domain already publishes Google site-verification TXT records. Confirm
that the active Search Console account can open the `sc-domain:qurancircle.io`
property, then:

1. Submit `https://www.qurancircle.io/sitemap.xml`.
2. Inspect and request indexing for the five canonical pages in the table.
3. Inspect their Turkish and Arabic alternates.
4. Verify that Google's selected canonical matches the declared canonical.
5. Check indexing again after 7 and 14 days. Do not repeatedly request
   indexing during that window.

## Analytics setup

QuranCircle uses Vercel Web Analytics and Speed Insights on Vercel
deployments. There is no Google Analytics integration, cookie prompt, consent
preference, or persistent visitor-attribution storage.

Page views, referrers, countries, devices, and browsers are available in the
Vercel dashboard. The app also records these privacy-friendly product events:

| Vercel event | Meaning | Parameters |
| --- | --- | --- |
| `CTA Clicked` | A create, browse, or guide CTA | `action`, `source` |
| `Auth Started` | A login or registration attempt | `action`, `source` |
| `Auth Completed` | Completed password authentication | `method` |
| `Circle Created` | A completed circle creation | `visibility`, `source` |
| `Guide Content Copied` | An organizer copied a template | `content` |
| `Circle Invite Shared` | Native share action completed | `visibility` |
| `Circle Invite Copied` | Invite link copied | `visibility` |
| `Khatm Completed` | A Khatm reached 30 read Juz for the first time | none |

Analytics events deliberately exclude circle names, participant names,
descriptions, short codes, and reading details.

Each Khatm receives `completed_at` exactly once when it first reaches 30 read
Juz. The database transition locks the parent Khatm, so concurrent final-Juz
updates cannot double-count it. Existing Khatms that were already complete at
migration time are backfilled.

Use this query in the Supabase SQL editor for the monthly north-star report:

```sql
select
  date_trunc('month', k.completed_at) as month,
  count(*) as completed_khatms
from public.khatms k
where k.completed_at is not null
group by 1
order by 1 desc;
```

## Weekly scorecard

Review a complete Monday-Sunday period so partial-day data does not distort
the comparison.

| Funnel stage | Source | KPI |
| --- | --- | --- |
| Indexation | Search Console | Indexed canonical landing pages |
| Visibility | Search Console | Non-branded impressions by query cluster |
| Ranking | Search Console | Median position for each page/query cluster |
| Search appeal | Search Console | Organic clicks and CTR |
| Acquisition | Vercel Analytics | Visitors, page views, referrers, and landing pages |
| Conversion | Vercel Analytics | `Circle Created` relative to visitors |
| Activation | Vercel Analytics | Invite shares and copies relative to created circles |
| Outcome | Product database | Completed Khatms per month |

Search Console position is directional, not an exact rank. Prioritize trends
in impressions, clicks, and conversion. Compare the last 28 complete days
with the preceding 28 complete days, and annotate title changes, launches,
outreach, and seasonal events.

## Baseline recorded on 2026-07-25

- Vercel Analytics, last 30 days: 44 visitors, 231 page views, 48% bounce
  rate.
- Vercel Analytics, last 7 days: 33 visitors, 213 page views, 39% bounce
  rate.
- Search Console, last 3 months: 31 impressions, 0 clicks, 0% CTR, and an
  average position of 14.1. The only disclosed queries were `quran circle`
  (4 impressions) and `quranic circle` (1 impression).
- Search Console sitemap: submitted successfully, last read on 2026-07-24,
  with 18 pages discovered at that read.
- Search Console's page-indexing report was last updated on 2026-07-10 and
  showed 7 indexed and 5 not-indexed URLs. That report predates the new intent
  pages and Arabic launch, so it is not evidence that those new URLs failed
  indexing.
- Search discovery check: the homepage was discoverable; the newly published
  intent pages had not surfaced yet.
- Real-user Speed Insights: not enabled.

The business north-star metric is **completed group Khatms per month**.
Search Console impressions and clicks are the organic-acquisition indicators.
Without persistent visitor attribution, do not claim that an individual
completion came from search; compare aggregate trends instead.

## Monthly decision rules

- High impressions + low CTR: improve the title and description without
  changing the page's intent.
- Position 11-30 + useful engagement: deepen the existing page and acquire
  relevant links; do not create a competing page.
- Organic visits + weak circle creation: improve the primary CTA and product
  explanation.
- Circle creation + weak invite sharing: improve the post-creation handoff.
- No impressions after confirmed indexing: reassess the query wording,
  content usefulness, and internal/external authority.
