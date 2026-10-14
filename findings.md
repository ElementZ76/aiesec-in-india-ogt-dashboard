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

### EXPA API (researched 2026-10-14; nothing verified against the live API yet)

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

_Still unverified (check in Link phase with the real token):_
- Which endpoint works; token type and expiry; India-wide vs one-LC reach.
- Whether CV, phone, EP manager and LinkedIn are readable; exact field names (use GraphQL schema
  introspection — a read-only "describe yourself" query).
- That "applied" = `open`; the India MC id.

## Constraints
- EXPA token stays server-side (Invariant 1). Exposing it would let anyone act on EXPA as the token owner.
- Read-only access to EXPA (Invariant 3).
- Public site: anyone with the link can see applicant data (accepted by user).
- Tech versions on npm (2026-10-14): next 16.4.0, react 19.3.0, vitest 5.0.4 (needs Node ^22.12),
  typescript 7.0.2 (use whatever create-next-app pins). Local Node 22.14.0, npm 11.12.1.

### Project scaffold (2026-10-14)
- Generated with `create-next-app@16.4.0` (TypeScript, App Router, `src/`, ESLint, no Tailwind).
  It enables `cacheComponents: true` by default in `next.config.ts` → the 15-min cache can use the
  `"use cache"` directive. Read `node_modules/next/dist/docs/` before using caching APIs.
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
