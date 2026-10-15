# Findings

## Discovery answers (2026-10-14)

| # | Question | Answer |
|---|---|---|
| 1 | North Star | One India-wide pool of oGT applicants with an LC filter. Public site, no login. |
| 2 | Integrations / keys | EXPA API (GraphQL). Token belongs to an MC member; type (browser vs developer app) unknown. |
| 3 | Source of truth | Data lives on EXPA. Spec: `spec_file.txt` (received 2026-10-14; region removed same day) — 10 fields: applicant name, company name, EP manager, email, phone, LC, duration, CV link, opportunity field, LinkedIn link. |
| 4 | Delivery payload | Vercel. 20–30 users/day, 100+ applicants. MVP: list + contact info + EP manager + CV link. Done: proper UI + search box + LC filter + spreadsheet export + statistics (status/date filters dropped later, see conflict 5). Notes on applicants → later. |
| 5 | Behavioral rules | Claude decides technical choices but gets approval before every change. Plain language, no over-explaining. Never push data to EXPA. Commit to git after each change. |

## Conflicts and resolutions

| # | Conflict | Resolution |
|---|---|---|
| 1 | Claude recommended a shared password because the site shows personal data publicly. | User chose fully public for now; privacy covered by AIESEC policy. Recorded as Invariant 2. |
| 2 | Spec not yet provided, so answers can't be cross-checked. | Spec received and cross-checked 2026-10-14. Conflicts 3–6 below. |
| 3 | Spec has job fields (company name, duration, opportunity field), so one person can appear with several jobs. Is a row one person or one application? | **Resolved:** one card per application. A person with 3 applications shows as 3 cards. |
| 4 | Spec has company name, but early-stage applicants have no company yet. Which applicants belong in the pool (signed up, applied, accepted, approved…)? | **Resolved:** only applications with status "applied". |
| 5 | Discovery asked for status and date filters; the spec doesn't list status or date fields. | **Resolved:** user said remove them. Status/date filters dropped; date field dropped. Status kept internally only to select "applied" applications. |
| 6 | Spec says "region and lc"; discovery only mentioned an LC filter. | **Resolved:** LC filter only. Region removed from the spec and schema. |
| 7 | Token type unknown (browser token may expire in ~2 h). | Partly resolved: token belongs to an MC member, so India-wide reach is expected. Type/expiry still unknown — test in Link phase. |
| 8 | "Opportunity field" could mean sub-product or academic background. | **Resolved:** the job's work area = `opportunity.sub_product`. |
| 9 | "Duration" as a category or as dates. | **Resolved:** actual dates. Slot dates first, fallback to the opportunity's date range (user confirmed). |
| 10 | Which programmes are oGT? | **Resolved:** GTa and GTe. |
| 11 | EXPA may have no LinkedIn field. | **Resolved:** card shows "Not available" when there is no LinkedIn data. |
| 12 | Search box not in spec; Bardo has one. | **Resolved:** add a search box (user: "absolutely necessary"). |
| 13 | User proposed Spring Boot (Java) backend + Supabase database instead of Next.js server + no database. | **Resolved:** Next.js only, no database (user agreed). Reason: Vercel's official runtimes are Node.js, Bun, Python, Rust — no Java (vercel.com/docs/functions/runtimes, checked 2026-10-14), so Spring Boot would need a second host; and there is no data of our own to store. |
| 14 | Tailwind CSS was proposed for styling. | **Resolved:** no Tailwind. Plain CSS files for now; styling decided in a separate conversation. |
| 15 | Approved design fetches EXPA on page load (15-min cache, no DB). Probe: 2404 applications take ~5 min to fetch. User's mentor suggested a scheduled sync (GitHub Actions) into a database (Supabase) that the site reads. | **Resolved:** switch to sync + database (user, 2026-10-14). Refresh every **15 minutes**. Detailed plan approved 2026-10-15; written into the constitution. |
| 16 | Pool has 2404 "open" applications, incl. 9 closed LCs and possibly years-old applications whose slot dates are past. | **Resolved:** hide all closed LCs and all applications whose slot has already ended (user, 2026-10-14). |
| 17 | "India National Office" appears as an LC (183 of 2404 applications). Show it? | **Resolved:** yes, shown in the pool and as an LC filter option (user, 2026-10-15). |
| 18 | Does a slot ending today still count as active? | **Resolved:** yes; it disappears from the next day, India time (user, 2026-10-15). |

## Technical research

### Reference site: ogtbardo.vercel.app/cv-pool (studied 2026-10-14 by reading its public JS bundle)

- **Tech:** Create React App single-page app on Vercel; Supabase database; React Router.
- **The CV Pool is one public page of a larger internal CRM** (leads, follow-ups, team performance,
  EXPA manager assignment, admin). Only `/cv-pool` is public.
- **Data source: Bardo's own Supabase `leads` table, NOT live EXPA.** Query: leads where
  `cv_link` is not null, `status != approved`, `show_in_cvpool = true`, newest first, joined with
  `managers`. Backgrounds from `backgrounds` / `lead_backgrounds` tables.
- **Unit:** one card per *person* (lead).
- **Card:** initials avatar; full name; university • year of study; product badge (GTa/GTe);
  EP MANAGER box (name, email, phone, copy buttons); desired regions; available start dates;
  duration (Short/Mid/Long); background tags; "View LinkedIn Profile"; "View CV" + "Download"
  or "CV not available". **Shows the EP manager's contact, not the EP's own.**
- **Page:** header (logo, "BARDO Talent Hub", dark/light toggle, Show/Hide Stats) → stats
  (Total CVs, Universities, Backgrounds; charts: Product Distribution, Duration Distribution,
  Year of Study) → search (name, email, EP ID, university) → Filters panel (product, year of
  study, backgrounds, desired regions, countries, duration, EP manager; active-filter count;
  clear) → "Showing X of Y CVs" → card grid → empty state "No CVs Found" + Clear Filters.
- **Open/closed switch:** admin can show "CV Pool is Currently Closed". No export on this page.
- **Security problems (do not copy):** EXPA access token embedded in the public JS bundle
  (`REACT_APP_EXPA_ACCESS_TOKEN`); open/closed switch and hidden admin login live only in the
  visitor's browser (localStorage) with credentials hard-coded in public code.
- **Their EXPA query (used in the internal CRM, not the CV pool):**
  `allOpportunityApplication(page, per_page, filters: { created_at | experience_start_date: { from, to } })
  { data { id status created_at experience_start_date slot { start_date end_date title }
  person { id full_name email contact_detail { phone } home_lc { id name country }
  managers { id full_name email phone } }
  opportunity { id title programme { short_name_display } opportunity_duration_type { duration_type }
  earliest_start_date latest_end_date home_lc { name } home_mc { name } } }
  paging { total_pages current_page total_items } }`
  Their mock data uses status `"open"` for an applied application.

### EXPA API (researched 2026-10-14, before the token arrived)

_Superseded by "EXPA probe results" below where they differ (e.g. LinkedIn **was** found:
`person.linkedin_url`). Kept for the record._

Sources: AIESEC Egypt `Universal-Expa-Sync-library` (GitHub, open source), EXPA API changelog
(changelog.commutatus.com/companies/aiesec/projects/api), AIESEC "Access Token 101" slides,
Bardo bundle, Pole-Position project description.

- **Endpoint:** `https://gis-api.aiesec.org/graphql` (Egypt library). Bardo calls
  `https://expa.aiesec.org/graphql` via a proxy. Test both.
- **Auth:** token sent as `?access_token=<token>` query param, or as the `Authorization` header.
- **Read query for our pool:** `allOpportunityApplication(filters: {...}, page, per_page)` returns
  `data` + `paging { current_page total_items total_pages }`. Paged; Egypt library waits 250 ms
  between pages.
- **Candidate field mapping (to verify):**

  | Our field | Likely EXPA path |
  |---|---|
  | applicationId | `id` |
  | status | `status` |
  | fullName | `person.full_name` |
  | email | `person.email` |
  | phone | `person.contact_detail.phone` |
  | homeLc | `person.home_lc.name` |
  | epManager | `person.managers { full_name email phone }` (a list — can be several) |
  | cvUrl | `person.cvs { url }` or `person.cv_url` |
  | linkedinUrl | **not found in any source** |
  | companyName | `opportunity.organisation.name` (maybe `opportunity.branch.name`) |
  | opportunityField | `opportunity.sub_product.name`? (meaning unconfirmed with user) |
  | duration | `opportunity.opportunity_duration_type.duration_type`, or dates (`slot`, `earliest_start_date`/`latest_end_date`) |
  | product | `opportunity.programme.short_name_display` (GTa / GTe) |

- **Programme ids:** 2 = GT (old), 8 = GTa, 9 = GTe, 7 = GV, 5 = GE.
- **Filters seen:** `person_home_mc`, `person_home_lc`, `opportunity_home_mc`, `programmes`,
  `status`, `created_at { from to }`. oGT India ≈ `person_home_mc: <India MC id>` + `programmes: [8, 9]`.
- **Status naming:** the API's status-count keys are `open, matched, approved, withdrawn, rejected…`
  and Bardo's mock data uses `open` for an applied application. Strong sign that **"Applied" in
  the EXPA UI = `open` in the API.** Verify with the real token.
- **Tokens:**
  - Proper route: create an OAuth application at `auth.aiesec.org/developers/oauth_applications`;
    it needs approval; then create an access token there. A token's reach equals the **highest
    role of the person who owns it** (an LC member sees one LC; MC-level sees all of India).
  - A token copied from a browser session reportedly **expires in about 2 hours** (Pole-Position
    project). Unverified. If the user's token is this kind, the live site will break quickly.
  - Expiry of developer-app tokens: not documented in any source found.

_Checked by the probe on 2026-10-14 (see below), except token expiry:_
- Which endpoint works; token type and expiry; India-wide vs one-LC reach.
- Whether CV, phone, EP manager and LinkedIn are readable; exact field names (use GraphQL schema
  introspection — a read-only "describe yourself" query).
- That "applied" = `open`; the India MC id.

## Constraints
- EXPA token stays with the sync job only (Invariant 1). Exposing it would let anyone act on EXPA as the token owner.
- Read-only access to EXPA (Invariant 3).
- Public site: anyone with the link can see applicant data (accepted by user).
- Tech versions on npm (2026-10-14): next 16.4.0, react 19.3.0, vitest 5.0.4 (needs Node ^22.12),
  typescript 7.0.2 (use whatever create-next-app pins). Local Node 22.14.0, npm 11.12.1.

### Project scaffold (2026-10-14)
- Generated with `create-next-app@16.4.0` (TypeScript, App Router, `src/`, ESLint, no Tailwind).
  It enables `cacheComponents: true` by default in `next.config.ts` → the website's short cache of
  the database read can use the `"use cache"` directive. Read `node_modules/next/dist/docs/` before using caching APIs.
- **Constraint:** `@types/node` must match the Node runtime (22). The generator pins `^20`, which
  blocks Vitest 5 (needs `@types/node` `^22 || >=24`). Fixed by `@types/node@^22`; `engines.node`
  set to `>=22.12` so Vercel also uses Node 22+.
- **Constraint:** `LayoutProps` / route types are generated by Next.js, so `tsc` alone fails on a
  clean checkout. `npm run typecheck` runs `next typegen` first.
- `npm audit`: 0 vulnerabilities in shipped code. 5 "high" in dev-only tooling (`braces` via
  `eslint-config-next` → `fast-glob` → `micromatch`). Not exploitable here (no untrusted glob
  patterns); `npm audit fix --force` would make breaking changes, so left as is.
- `next dev` rewrites `AGENTS.md` only; it never touches `CLAUDE.md` (checked
  `next/dist/server/lib/generate-agent-files.js`).

### EXPA probe results (2026-10-14, `scripts/expa-probe.mjs`, read-only, no personal data printed)
- **Endpoint:** `https://gis-api.aiesec.org/graphql` with `?access_token=` works (HTTP 200).
  `https://expa.aiesec.org/graphql` returns HTTP 403. Schema introspection is allowed.
- **IDs:** India MC = **1585**. Token owner's home LC = India National Office (2340) → token has
  national reach: applications from **32 LCs** came back (incl. 9 "Closed [...]" LCs).
- **Status name:** "Applied" in the EXPA UI = **`open`** in the API (`open`: 2404, `applied`: 0).
  For comparison: matched 11, accepted 11, approved 41 (GTa + GTe, India).
- **Size: 2404 open GTa/GTe applications from 899 people** (GTa 2117, GTe 287). The user's
  estimate was "100+". Contradicts the "100+ applicants" assumption.
- **Speed: fetching all 2404 (25 pages × 100, sequential, full field set) took 298.5 s.**
  → Fetching on page load is not viable; see conflict 15.
- **Verified field paths and fill rates (out of 2404):**

  | Our field | EXPA path | Filled |
  |---|---|---|
  | cvUrl | `person.cv_url` (also `person.cvs[].url`, 2402) | 2403 |
  | — | application-level `cv { url }` | 0 (don't use) |
  | email | `person.email` | 2404 |
  | phone | `person.contact_detail.phone` (+ `country_code`) | 1802 |
  | linkedinUrl | `person.linkedin_url` (`contact_detail.linkedin`: only 9) | 1294 |
  | epManagers | `person.managers { full_name email contact_detail { phone } }` | 1786 (email 1786, phone 1342) |
  | companyName | `opportunity.organisation.name` (`branch.name` also 2404) | 2404 |
  | opportunityField | `opportunity.sub_product.name` | 2120 |
  | startDate / endDate | `slot.start_date` / `slot.end_date` | 2404 / 2404 |
  | (fallback) | `opportunity.earliest_start_date` | 17 — fallback rarely needed |
  | homeLc | `person.home_lc { id name }` | 2404 |
  | programme | `opportunity.programme.short_name_display` | GTa / GTe |

- **Filters available** on `allOpportunityApplication(filters: ApplicationFilter)`:
  `person_home_mc`, `person_home_lc`, `programmes`, `status`, `statuses`, `created_at`,
  `experience_start_date`, `sub_products`, `has_managers`, … (full list in probe output).
- Token expiry: **still unknown.** Re-run `node --env-file=.env.local scripts/expa-probe.mjs x`
  (step 1 only) a few hours after 2026-10-14 15:05 to check.
- GitHub repo `ElementZ76/aiesec-in-india-ogt-dashboard` is **public** (API returns 200 without login).
- GitHub Actions schedule (docs, checked 2026-10-14): shortest interval 5 minutes; runs "can be
  delayed during periods of high loads"; some may be dropped; in public repos scheduled workflows
  are disabled after 60 days without repository activity.

### Speed / size test (2026-10-14 15:22 IST, `expa-probe.mjs size`, light fields only)
- Light query (`id slot { end_date } person { home_lc { id name } }`) for all 2404:
  12.9 s (100/page, one at a time); 6.5 s (500/page); **4.2 s (100/page, 5 at a time)**.
  → The 298 s earlier was caused by the heavy nested fields (managers, CVs, contact), not the
  number of rows.
- After the user's rules: 98 in closed LCs, 1425 with an ended slot → **945 applications left,
  in 24 LCs** (incl. "India National Office").
- Closed LCs are recognisable by a name starting with `Closed [` (e.g. `Closed [Jodhpur]`).
- Token still worked at 15:21 IST (pasted ~15:05) — too early to judge expiry.

### Supabase (checked 2026-10-14)
- `@supabase/supabase-js` latest 2.117.3 (needs Node >= 22).
- New API keys: `sb_publishable_...` (low privilege, obeys Row Level Security) and
  `sb_secret_...` (server only, bypasses RLS). Legacy `anon` / `service_role` keys are deprecated
  by end of 2026 → use the new keys.
- Free plan (third-party summaries, verify on supabase.com/pricing): 500 MB database, 2 active
  projects, projects **pause after 7 days of inactivity** (a 15-min sync keeps it active).

### Sync + database plan (approved 2026-10-15)
- Full design in the constitution (Tech Stack, Data Schema, Invariants 1–3, 6, 7).
- **Assumptions made by Claude (tell the user if they change):** website caches the database read
  for up to 5 minutes, so data can be up to ~20 minutes old; safety brake threshold = "less than
  half of the last successful run".
- **To verify when building:** `person.full_name` (probe did not check it); who GitHub emails when a
  scheduled run fails; how the sync script runs TypeScript (Node 22.14 locally needs a flag or a
  runner; may need approval for a dev dependency); keep-alive method for the 60-day schedule
  pause.
- User pulled the UI conversation forward (2026-10-15): it happens before the Supabase setup.

### Token expiry check (2026-10-15 22:18 IST)
- Token pasted ~2026-10-14 15:05 IST still works ~31 hours later → it is **not** the ~2-hour
  browser-session kind. Exact lifetime still unknown; the sync's safety brake + GitHub failure email
  will reveal expiry. Re-check before the deadline.

### UI direction (2026-10-15, mockup `.tmp/ui-mockup.html`, v8; to be written into the constitution on sign-off)
- Audience: AIESEC members. Look: AIESEC brand, Apple "Liquid Glass"-style glassmorphism, Lato font,
  dark mode by default with a light/dark switch (remembered per browser).
- Colours: AIESEC blue `#037EF3`; GTa (oGT) `#0A8EA0`; GTe `#F85A40`. Buttons use `#0366D6` and
  small text uses lighter/darker shades so every text pair meets WCAG AA (4.5:1), measured.
- Layout: floating pill navbar (AIESEC in India · Statistics · Applications · theme · Export CSV);
  title; Statistics (4 cards: total, GTa vs GTe ring, top LCs / LC rank, top work areas; breakdown
  panel); sticky search + LC filter; 3 / 2 / 1 card columns; footer: last updated (left, amber if
  stale > 1 h), "Built by Praveen" → linkedin.com/in/praveen-pr190705 (right).
- Behaviour: newest application first (application `created_at`, verified 2026-10-15: DateTime, UTC, 100/100 filled); stats follow the LC filter
  (not search); search covers name, email, company, work area, LC, EP manager; CSV exports the
  current search + LC result; 12 cards first, then a "Load more applications" button adds 12
  per click (user, 2026-10-15; replaced auto-loading).
- Corners: concentric radii (inner = outer − padding), `corner-shape: squircle` where supported.
- **Performance constraints (measured with headless Chrome, CPU 4× slower):** no masks or
  cursor-tracking effects on cards; blur only on the navbar; never render all ~945 cards at once.
  `content-visibility: auto` was tested and **rejected**: fast scrolling fell to ~1 frame/s.
  Keystroke→screen went from ~340 ms to ~165 ms (phone).
- Responsive audit 320–1920 px: no sideways scroll, no tap target < 24 px (44 px on touch screens),
  no text < 12 px, sticky bars cover 19% of a phone screen (was 34%), first card at 572 px on a
  phone (was 1267 px).
- Approved 2026-10-15 (mockup v10). Missing LinkedIn shows as the text "Not available" in the
  Applicant section (user; replaced the greyed-icon idea). LinkedIn is a text row again.

### Supabase setup (2026-10-15)
- `supabase/schema.sql` applied by the user; `scripts/db-check.mjs`: all 7 access checks pass.
- **Constraint:** Postgres column privileges also cover columns used in filters and sorting. The
  website key may only read `sync_runs.status` and `finished_at`, so it must filter/sort by those
  only (e.g. `status = 'success'` order by `finished_at` desc limit 1), never by `id`.
- `.env.local` `SUPABASE_URL` must be the bare project URL (`https://<id>.supabase.co`); the
  dashboard's Data API URL ends in `/rest/v1/`, which supabase-js adds itself. db-check validates this.

### Sync job results (2026-10-15)
- Full fetch with all fields, 5 pages in parallel: **~17 s** (was 298 s one page at a time).
- Dry run: EXPA total 2399 = fetched 2399; 11 invalid; 98 closed LC; 1350 slot ended; **940 kept**.
- **EXPA's `status: "open"` filter leaks:** 2388 open, 8 rejected, 3 withdrawn → the mapper
  re-checks `status === "open"` (logged in the SOP).
- **Phone placeholder:** 54 records have phone = "deleted phone number" → treated as no phone.
- Formats: `slot.end_date` plain `YYYY-MM-DD`; `created_at` ISO UTC; `country_code` like `+91`
  (672 empty); 15 phones already start with `+`.
- Kept rows filled: name 940, email 940, phone 694, LinkedIn 496, CV 940, EP manager 440,
  company 940, work area 810, dates 940. (`person.full_name` verified: 940/940.)
- **Constraint:** this package is CommonJS, so scripts run by `tsx` cannot use top-level `await`
  (esbuild "Top-level await is currently not supported with the cjs output format"). Wrap in
  `main()`.
- First real runs: 2 × success (upserted 940, deleted 0, second run identical). Website key sees
  940 rows in 24 LCs, 0 closed-LC rows.

### GitHub Actions (checked 2026-10-15)
- Latest: `actions/checkout` v7.0.1 (SHA 3d3c42e…), `actions/setup-node` v7.1.0 (SHA 949feb2…); pinned by SHA.
- Docs: scheduled workflows in public repos are disabled after 60 days without "repository
  activity" (not defined); a commit changing the cron line re-activates them; failure
  notifications go to "the user who last modified the cron syntax in the workflow file".
