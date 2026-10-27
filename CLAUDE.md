# Project Constitution — AIESEC in India oGT CV Pool

> **This file is LAW.** If code and this file disagree, the code is wrong or this file must be
> updated first (with a Maintenance Log row). Status: **Blueprint approved 2026-10-14; sync +
> database design approved 2026-10-15; UI approved 2026-10-15; live on Vercel since 2026-10-16;
> final integration test passed 2026-10-18.** Data Schema v1 (EXPA paths verified by the probe and the sync).
> **Deadline: everything, including testing, done by 2026-10-20.**

## North Star

A public website, hosted on Vercel, showing **one India-wide pool** of AIESEC in India oGT
(outgoing Global Talent) applications with status **"applied"**, filterable by local committee
(LC). Each application is one card showing the spec fields. A sync job copies the data from
EXPA into our database every 15 minutes; the website reads only that database.

- **Live site:** https://aiesec-in-india-ogt-dashboard.vercel.app/

- **Spec:** `spec_file.txt` lists the 10 fields each card shows (see Data Schema).
- **Bare minimum (MVP):** the cards with contact info, EP manager and CV link.
- **Done:** the MVP with a proper UI, plus a search box, an LC filter, spreadsheet export and
  statistics (v1: total applications, count per LC, count per work area, GTa vs GTe).
- Functional reference: https://ogtbardo.vercel.app/cv-pool (same function, different look).
- Expected load: 20–30 users per day. Pool size: **about 945 applications in 24 LCs**
  (measured 2026-10-14; 2404 before the hide rules in Invariant 6).

## Tech Stack

Approved by the user 2026-10-14 (website) and 2026-10-15 (sync + database). Versions checked on
npm on those days.

| Part | Choice |
|---|---|
| Website (front end **and** server) | Next.js 16 (App Router), React 19, hosted on Vercel |
| Language | TypeScript (website and sync job) |
| Styling | Plain CSS files for now. **Not Tailwind** (user decision). Final styling decided in a separate conversation. |
| Tests | Vitest |
| Running TypeScript scripts | `tsx` 4.23.x, dev only (approved 2026-10-15) |
| Data source | EXPA GraphQL API (`https://gis-api.aiesec.org/graphql`), **read-only**, called **only by the sync job** |
| Sync job | A script run by GitHub Actions. **Started every 15 minutes by Supabase Cron** (pg_cron + pg_net call GitHub's "run workflow" API at minutes 7, 22, 37, 52 UTC; `supabase/scheduler.sql`), because GitHub's own schedule ran only every 2–5 h. GitHub's schedule stays as an hourly backup (cron `45 * * * *`). Manual "Run workflow" button (normal / dry-run / force). Actions pinned to commit SHAs. Monthly keep-alive job. |
| Database | Supabase (hosted Postgres), free plan, Mumbai region. Client library `@supabase/supabase-js` 2.118.x (approved 2026-10-15; 2.117 was current when proposed) |
| Spreadsheet export | CSV file, generated in the browser; no extra library |
| Runtime | Node.js >= 22.12 (local: 22.14) |

**Commands** (run from the project folder):

| Command | What it does |
|---|---|
| `npm run dev` | Start the site locally at http://localhost:3000 |
| `npm test` | Run all automated tests (Vitest) |
| `npm run typecheck` | Generate Next.js route types, then check all TypeScript |
| `npm run lint` | Check code style and common mistakes (ESLint) |
| `npm run build` | Build the production version (what Vercel runs) |

| `node --env-file=.env.local scripts/db-check.mjs` | Check the database connection and access rules (write with the secret key, read-only with the publishable key) |

| `npm run sync:dry` | Fetch from EXPA and check everything, **write nothing**; prints counts only. **Never** use `npm run sync -- --dry-run` on Windows: PowerShell drops the `--`, so it becomes a real run |
| `npm run sync` | Real sync run (what GitHub Actions runs every 15 minutes) |
| `npm run sync -- --force` | Real run that skips the "less than half of the last run" brake. Only after a person has checked the drop is real |

`AGENTS.md` is managed by Next.js (`next dev` rewrites it). Keep it committed; don't hand-edit it.

Rejected:
- Spring Boot (Java) backend. Vercel has no Java runtime, so it needs a second host
  (findings.md, conflict 13).
- Fetching EXPA when a visitor opens the page. A full fetch took 298 s (findings.md, conflict 15).

## Data Schema

_v1 — fields come from `spec_file.txt` (the spec). EXPA paths verified by
`scripts/expa-probe.mjs` on 2026-10-14 unless marked otherwise._

**Unit of the pool = one application = one card.** A person who applied to 3 jobs appears as
3 cards. Which applications are in the pool: see Invariant 6.

### EXPA query (sync job only)

`allOpportunityApplication(filters: { person_home_mc: [1585], programmes: [8, 9], status: "open" },
page, per_page)` → `data { ... }` + `paging { total_items total_pages }`.
1585 = India. 8 = GTa, 9 = GTe. `open` is the API name for "Applied" in the EXPA UI.

### Table `applications` (one row = one card)

| Column | Type | Spec item | Source in EXPA |
|---|---|---|---|
| application_id | text, primary key | — (internal; card key) | `id` |
| person_id | text | — (internal) | `person.id` |
| full_name | text | applicant name | `person.full_name` (verified by the first sync, 2026-10-15: 940/940 filled) |
| email | text | email | `person.email` |
| phone | text, null | phone | `person.contact_detail.country_code` + `phone` |
| linkedin_url | text, null | link to their linkedin profile | `person.linkedin_url`; card shows "Not available" when null |
| cv_url | text, null | cv link | `person.cv_url` (not the application-level `cv`, which is always empty) |
| home_lc_id | text | — (internal; LC filter key) | `person.home_lc.id` |
| home_lc | text | lc | `person.home_lc.name` |
| ep_managers | jsonb: list of `{ name, email, phone }` | ep manager | `person.managers { full_name email contact_detail { phone } }`; can be empty or several |
| professional_experiences | jsonb: list of `{ title, organisation, type, start, end, description }` | professional experiences (user, 2026-10-27) | `person.professional_experiences { title organisation_name experience_level { name } start_date end_date description }`; newest first; no `end` = "Present" (verified 2026-10-27: 876/885 have one) |
| languages | jsonb: list of `{ name, level }` | languages (user, 2026-10-27) | `person.person_profile.languages { constant_name level }`; `level` is 0–4 with no label on EXPA, so only names are shown. **Not** `person.top_languages` (EXPA HTTP 500) |
| company_name | text, null | company name | `opportunity.organisation.name` |
| opportunity_field | text, null | opportunity field (the job's work area) | `opportunity.sub_product.name` |
| programme | text, `GTa` or `GTe` | — (stats only) | `opportunity.programme.short_name_display` |
| applied_at | timestamptz | — (sort order; "Applied on" date on the card) | `created_at` (UTC; filled 100/100 in a sample, checked 2026-10-15). Shown as a date in India time. |
| start_date | date, null | duration (actual dates) | `slot.start_date`; fallback `opportunity.earliest_start_date` |
| end_date | date, null | duration (actual dates) | `slot.end_date`; fallback `opportunity.latest_end_date` |
| synced_at | timestamptz | — (internal) | time the sync wrote the row |

### Table `sync_runs` (one row per sync run)

`id` (number), `started_at`, `finished_at`, `status` (`success` / `failed` / `blocked`),
`fetched_count` (from EXPA), `kept_count` (after the pool rules), `upserted_count`,
`deleted_count`, `message` (short reason when not `success`; never contains a secret).
The website shows "Last updated" = `finished_at` of the latest `success` run.

### Computed values

Statistics v1 (user-approved 2026-10-14; to be expanded later): total applications in the pool;
count per LC; count per work area (sub-product); count of GTa vs GTe. Computed in the browser.

### Data flow

```
Supabase Cron (every 15 min) → starts the sync job (GitHub Actions) → EXPA → Supabase → website server (Vercel) → browser
```

1. **Sync job:** fetches all pool applications from EXPA (pages fetched in parallel) → applies
   the pool rules (Invariant 6) → upserts the kept rows (adds new ones, updates changed ones) →
   deletes rows no longer in EXPA's result → writes a `sync_runs` row. The safety brake
   (Invariant 7) can stop it before any write.
2. **Website server:** on `/`, reads all `applications` rows and the latest successful
   `sync_runs` row from Supabase, cached for up to 5 minutes, and sends them with the page.
3. **Browser:** search, LC filter, statistics and CSV export all run on that list (rules in UI Spec).

`PoolApplication` (what the server hands to the page; camelCase of the table columns):
`{ applicationId, personId, fullName, email, phone|null, linkedinUrl|null, cvUrl|null, homeLcId,
homeLc, epManagers: [{ name, email|null, phone|null }], professionalExperiences: [{ title|null,
organisation|null, type|null, start|null, end|null, description|null }], languages: [{ name,
level|null }], companyName|null, opportunityField|null,
programme: "GTa"|"GTe", startDate|null, endDate|null, appliedAt }` — start/end dates as `YYYY-MM-DD`
strings; `appliedAt` as an ISO timestamp.

### Endpoint table

| Method | Path | Purpose | Auth | Input | Output |
|---|---|---|---|---|---|
| GET | `/` | The CV pool page (cards, search, LC filter, stats, export, "Last updated") | none (public) | — | HTML page with `PoolApplication[]` |

No public JSON API in v1. The sync job is not an endpoint; it is the GitHub Actions workflow
`.github/workflows/sync.yml`.

## UI Spec

Approved by the user 2026-10-15. Visual reference: `docs/design/ui-mockup.html` (mockup v10; open it
in a browser; details in findings.md "UI direction"). Further visual changes are expected after the
site is connected to the database.

- **Audience:** AIESEC members (EP managers, oGT team).
- **Look:** **monochrome** (user, 2026-10-22) with Apple "Liquid Glass"-style glass panels; Lato
  font (400/700/900); **dark mode by default** with a pure black background, no coloured glows;
  light mode is a warm (cream) white with warm near-black text; light/dark switch remembered per browser.
- **Colours:** black, white and neutral greys. AIESEC blue `#037EF3` only as a slight accent (links,
  buttons, focus outline, active tab, list bars); white for the big statistic numbers and stat icons.
  GTa `#0A8EA0` and GTe `#F85A40` stay, only on GTa/GTe things (badges, avatars, ring). Amber
  (stale data) and green (copied) stay as signals. Every text/background pair must
  meet WCAG AA contrast (4.5:1); use deeper/lighter shades for small text (e.g. buttons `#0366D6`).
- **Corners:** concentric (inner radius = outer radius − padding); capsules for free-standing controls.
- **Page:** floating pill navbar (AIESEC in India · Applications · theme switch · Export CSV) →
  title "oGT CV Pool" with the statistics cards beside it → sticky search + LC filter + work-area filter → cards → footer
  ("Last updated …" left; "Built by Praveen" → https://www.linkedin.com/in/praveen-pr190705/ right).
- **Statistics** (user 2026-10-23): 2 cards to the right of the title, under Export CSV (below
  960 px wide: under the title; phones: side by side). A small label above them names the LC they
  cover. **Applications** (total + LC/work-area counts) and **GTa vs GTe** (small ring + both
  counts). No "Statistics" heading and no navbar link. Top LC / Top work area cards and the LC
  rank were removed. On the Applications card, **"24 LCs ▾"** and **"8 work areas ▾"** open the
  full list (all LCs / all work areas): laptops and tablets — a panel drops down under the title
  row, one at a time (click the button again, ✕ or Esc closes); phones (≤ 640 px) — a bottom
  sheet. Clicking a row filters by that LC / work area, clicking it again clears it; on phones the
  sheet then closes. They follow the **LC filter** only, not the search box or the work-area
  filter (user, 2026-10-16).
- **Cards:** one per application, **newest application first** (`applied_at`). A card is a
  summary: name, LC, GTa/GTe badge, company, work area, start–end dates (+ weeks), a "Contact &
  EP manager" hint, View CV ("CV not available" when missing), applied date. 3 / 2 / 1 columns
  (desktop / tablet / phone).
- **Details popup** (user, 2026-10-16): tapping/clicking a card (or Tab + Enter) opens one popup
  with everything: the summary, applicant email and phone (copy buttons), LinkedIn (**"Not
  available" as text when missing**), EP manager(s) with name, email and phone written out and
  copy buttons ("No EP manager assigned" when none), languages (names only), professional
  experiences newest first with title, organisation, type, "Mar 2026 – Present" dates and the full
  description ("Not available" when a list is empty; user, 2026-10-27), View CV. Closes with ✕, Esc, a tap outside,
  or Android's back gesture. Centred on laptops; a bottom sheet on phones. Page behind does not
  scroll. Darkened backdrop, no blur. Motion (user, 2026-10-18): backdrop fades in, popup glides
  in and eases to a stop with **no bounce**, and slides out on close; no tap flash on cards.
- **Paging:** 12 cards first, then a **"Load more applications"** button adds 12 per click. Never
  render the whole pool at once. A new search or filter starts again at 12.
- **Search:** name, email, company, work area, LC, EP manager name. "Clear" shows only when a
  search or filter is active, and resets all three.
- **Work-area filter** (user, 2026-10-16): dropdown "All work areas", options A–Z with counts within
  the selected LC, "Not specified" last; labelled "Not specified (GTe)" while every application
  without a work area is GTe. Combines with search and LC. Phones: search on its own row, LC and
  work area side by side below.
- **Search bar on phones** (≤ 760 px wide; user, 2026-10-16): once it is stuck under the navbar,
  it slides away while scrolling down and comes back on scrolling up a little. It never hides
  while one of its fields has focus. Wider screens: always sticky.
- **CSV export:** the applications matching the current search + LC + work-area filters, all spec
  fields, plus professional experiences (one line per job, no descriptions: Excel's cell limit)
  and languages.
- **Stale data:** if the last successful sync is more than 1 hour old, "Last updated" turns amber
  and says the data may be out of date.
- **Performance rules (measured 2026-10-15):** background blur only on the navbar; no masks or
  cursor-tracking effects on cards; animate only `transform`/`opacity` where possible; do not use
  `content-visibility: auto` on cards (made fast scrolling collapse).
- **Accessibility / responsive:** no sideways scrolling from 320 px to 1920 px; tap targets ≥ 24 px
  (44 px on touch screens); no text under 12 px; respect "reduce motion".

## A.N.T. Architecture Mapping

| Layer | Role | Location |
|---|---|---|
| Architecture | SOPs in Markdown: goals, inputs, logic, edge cases | `docs/sops/` (`sync.md`, `pool-page.md`) |
| Navigation | Orchestration: decides what to fetch, write and show | `src/app/` (the page); `src/lib/sync/run.ts` (one sync run); `scripts/sync.ts` (sync entry point); `.github/workflows/sync.yml` (the job + hourly backup schedule); `supabase/scheduler.sql` (15-minute trigger) |
| Tools | Deterministic, testable units | `src/lib/expa/` (read-only EXPA client, query, mapper); `src/lib/pool/` (dates, pool rules, search, LC filter, stats, CSV); `src/lib/sync/` (safety brake, delete diff); `src/lib/db/` (row types; `read.ts` = the website's cached read-only access; `sync-store.ts` = writes, sync job only) |
| (UI pieces) | Visual components used by pages | `src/components/` |
| (Database setup) | SQL that creates the tables and access rules; pasted into Supabase's SQL editor | `supabase/schema.sql` |
| (Design reference) | Approved UI mockup with sample data (not used by the site) | `docs/design/ui-mockup.html` |
| (Checks) | One-off scripts, e.g. the EXPA probe | `scripts/` |

Tests live next to the code they test, as `*.test.ts`.

## Architectural Invariants

1. **The EXPA token lives only with the sync job:** the GitHub secret `EXPA_ACCESS_TOKEN` and the
   local `.env.local`. It is never put on Vercel, never given a `NEXT_PUBLIC_` prefix (that
   prefix sends a variable to the browser), and never logged or committed.
   The **GitHub trigger token** (fine-grained, this repo only, Actions read/write, nothing else)
   lives only in Supabase Vault as `github_dispatch_token`. It is never committed, never pasted
   into chat, and never stored in a saved SQL snippet.
2. **The website never calls EXPA.** It reads only from Supabase.
3. **Only the sync job writes to the database.** It uses `SUPABASE_SECRET_KEY` (GitHub secret and
   `.env.local` only). The website uses `SUPABASE_PUBLISHABLE_KEY`, which Row Level Security
   (RLS, the database's per-table access rules) limits to reading. RLS is on for every table.
   Neither key gets a `NEXT_PUBLIC_` prefix; the browser never talks to Supabase directly.
4. The site is **public, with no login** (user decision, 2026-10-14; data privacy is covered by
   AIESEC in India policy). Revisit only if the user asks.
5. **EXPA is read-only.** The project only runs read queries. It never creates, updates or deletes
   anything on EXPA (no GraphQL mutations).
6. **Pool rules.** An application is in the pool only if all of these hold:
   - EXPA status `open` ("Applied"), programme GTa or GTe, applicant's home MC = India (1585);
   - the applicant's home LC is not closed (closed LCs have a name starting with `Closed [`);
     "India National Office" counts as an LC and is shown (user, 2026-10-15);
   - the slot has not ended: `end_date` is today or later, with "today" in India time
     (Asia/Kolkata). A slot ending today is still shown (user, 2026-10-15). An application with
     no end date at all is kept (none exist as of 2026-10-14).
   One card per application. When an application stops matching, the next sync deletes it.
7. **Safety brake.** The sync job writes nothing and deletes nothing, and records a `blocked` or
   `failed` run, if: any EXPA request fails; the number fetched differs from EXPA's
   `total_items`; or the kept count is 0 or less than half of the last successful run's. The
   site then keeps showing the last good data.
8. `.tmp/` is scratch space only. Nothing in it is a deliverable.

## Behavioral Rules

1. Claude may make technical decisions, but must describe every change and get the user's
   approval **before** making it.
2. Explain in plain, non-technical language. The user is new to building apps. Don't over-explain.
3. Never guess business logic or requirements. Ask.
4. Never push data to EXPA (see Invariant 5).
5. Commit to git after each approved change.
6. Push to GitHub at the end of each finished, approved task.

## Maintenance Log

| Date | Change | Reason |
|---|---|---|
| 2026-10-14 | Created draft constitution | B.L.A.S.T. Protocol 0 |
| 2026-10-14 | Filled North Star, behavioral rules; added epManager/status/createdAt; invariant 2 → public site; added read-only invariant | Discovery answers |
| 2026-10-14 | Schema v0.1: added companyName, duration, opportunityField, homeRegion; split person vs application fields | `spec_file.txt` received |
| 2026-10-14 | Schema v0.2: one card per application; pool = status "applied" only (invariant 4); removed homeRegion, createdAt; status internal only; filters reduced to LC | User answers to conflicts 3–6 |
| 2026-10-14 | Schema v0.3: likely EXPA paths filled in; duration → startDate/endDate; epManager → epManagers list; added programme (GTa/GTe); LinkedIn "Not available" when missing | EXPA research + user answers |
| 2026-10-14 | Duration = slot dates with opportunity-range fallback; added search box; stats v1 defined; Next.js frontend; no Tailwind | User decisions |
| 2026-10-14 | Blueprint approved: tech stack table, data flow, PoolApplication shape, endpoint table, final A.N.T. folders; token env var named `EXPA_ACCESS_TOKEN` | User approved Next.js-only, no DB, plain CSS |
| 2026-10-14 | Added Commands table; `engines.node >= 22.12` in package.json | Project scaffold |
| 2026-10-15 | **Architecture → sync + database.** Added sync job (GitHub Actions, 15 min) and Supabase; website reads the database only; token moves to the sync job. Schema v1 with verified EXPA paths; tables `applications` and `sync_runs`. Invariants rewritten: 1 (token), new 2 (website never calls EXPA), new 3 (only sync writes; RLS), 6 (pool rules: closed LCs and ended slots hidden, India National Office shown, ends-today shown), new 7 (safety brake). A.N.T. folders updated. | Probe: full fetch took 298 s; mentor's suggestion; user approved the plan 2026-10-15 |
| 2026-10-15 | Added UI Spec; schema: `applied_at` (EXPA `created_at`, verified) + `appliedAt`; deadline 2026-10-20 in status | User approved the UI mockup; chose newest-first order, 12 + load more, LinkedIn "Not available" text |
| 2026-10-15 | Added `supabase/schema.sql` (tables, RLS, least-privilege grants), `scripts/db-check.mjs`, design reference in `docs/design/`; supabase-js 2.118.x | Link phase: Supabase project created by user |
| 2026-10-15 | Sync job built (`scripts/sync.ts`, `src/lib/{expa,pool,sync,db}`); Commands + A.N.T. updated; `tsx` added | Approved sync build plan; SOP `docs/sops/sync.md` |
| 2026-10-15 | Added `.github/workflows/sync.yml` (15-min schedule, manual modes, no overlap, 10-min limit, pinned actions, keep-alive) | Approved; user added the 3 GitHub secrets |
| 2026-10-16 | Website built: `src/app/{layout,page,error}.tsx`, `src/components/`, `src/lib/db/read.ts`, `src/lib/pool/{types,search,stats,csv,format}.ts`; SOP `docs/sops/pool-page.md`. Cache: `stale 300 / revalidate 300 / expire 3600`. CSV formula guard. Touch targets 44 px on touch screens (fixes the mockup's 34–43 px controls) | Approved website build plan |
| 2026-10-16 | Sync trigger → Supabase Cron calling GitHub's workflow-dispatch API every 15 min (`supabase/scheduler.sql`); GitHub schedule becomes an hourly backup; Invariant 1 covers the new GitHub trigger token (Supabase Vault only) | GitHub's schedule ran every 2–5 h instead of 15 min; user approved |
| 2026-10-16 | Added the work-area filter (dropdown + clickable Breakdown rows); statistics still follow the LC filter only; "Not specified (GTe)" label | User request: filter by work field; user chose filter over sort |
| 2026-10-16 | Cards became summaries; contact details, LinkedIn and EP managers moved into a details popup (native `<dialog>`); toast moved to the browser's top layer so it shows above the popup | User: on phones, cards were too long to see one whole card |
| 2026-10-16 | Phones: the sticky search bar slides away on scroll down, returns on scroll up | User: the bar took too much of the phone screen |
| 2026-10-18 | Status: live since 2026-10-16, final integration test passed; live URL in North Star; `person.full_name` marked verified | Final integration test (findings.md "Final integration test") |
| 2026-10-18 | UI Spec: popup motion (fade-in backdrop, no-bounce glide, close animation, no tap flash) | User: on phones the popup flashed, then jumped too fast |
| 2026-10-18 | UI Spec: condensed statistics — 4 short cards; Top LC / Top work area open the full list (drop-down on laptops, bottom sheet on phones); Breakdown button removed; phones 2 × 2 grid | User: condense the statistics cards; chose drop-down + sheet, merge Breakdown, 2 × 2, Applications and GTa cards not clickable |
| 2026-10-22 | UI Spec: monochrome look — black background (dark), white/grey (light), blue as a slight accent, teal/orange only for GTa/GTe; mockup no longer matches the colours | User: background fully black, monochrome with slight blue and white accents; chose to keep GTa/GTe colours and make light mode monochrome too |
| 2026-10-22 | UI Spec: light mode → warm white (cream `#F6F1E7` page, warm near-black text) | User: plain white was harsh; wanted a yellowish white that is pleasing to the eye |
| 2026-10-23 | UI Spec: statistics → 2 cards beside the title (Top LC / Top work area cards, LC rank, "Statistics" heading and navbar link removed); full lists open from the counts on the Applications card | User: remove the two cards and fill the empty space at the top right; keep the full lists, reached from the Applications card |
| 2026-10-27 | Commands: added `npm run sync:dry` (dry run without `--`) | PowerShell dropped the `--` in `npm run sync -- --dry-run`, so a check meant to write nothing ran a real sync |
| 2026-10-27 | Schema: `professional_experiences` + `languages` (jsonb) on `applications`; shown in the details popup and the CSV. Page data 642 → 1,913 KB (86 → 324 KB compressed): 885 cards are only 348 people, so each history repeats per application | User: add work experiences (labelled professional experiences) and languages to the EP details |
