# Project Constitution — AIESEC in India oGT CV Pool

> **This file is LAW.** If code and this file disagree, the code is wrong or this file must be
> updated first (with a Maintenance Log row). Status: **Blueprint approved 2026-10-14.** Data Schema stays v0.x until verified against EXPA.

## North Star

A public website, hosted on Vercel, showing **one India-wide pool** of every AIESEC in India oGT
(outgoing Global Talent) application with status **"applied"**, filterable by local committee
(LC). Each application is one card showing the spec fields. Data is read live from EXPA.

- **Spec:** `spec_file.txt` lists the 10 fields each card shows (see Data Schema).
- **Bare minimum (MVP):** the cards with contact info, EP manager and CV link.
- **Done:** the MVP with a proper UI, plus a search box, an LC filter, spreadsheet export and
  statistics (v1: total applications, count per LC, count per work area, GTa vs GTe).
- Functional reference: https://ogtbardo.vercel.app/cv-pool (same function, different look).
- Expected load: 20–30 users per day; 100+ applicants.

## Tech Stack

Approved by the user 2026-10-14. Versions checked on npm the same day.

| Part | Choice |
|---|---|
| Framework (front end **and** server) | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Plain CSS files for now. **Not Tailwind** (user decision). Final styling decided in a separate conversation. |
| Tests | Vitest |
| Hosting | Vercel |
| Data | EXPA GraphQL API, read-only, cached on the server for 15 minutes |
| Database | **None** in this iteration (no data of our own to store). Revisit if notes/history come back. |
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

`AGENTS.md` is managed by Next.js (`next dev` rewrites it). Keep it committed; don't hand-edit it.

Rejected: Spring Boot (Java) backend + Supabase. Vercel has no Java runtime, so it needs a second
host, and there is no data to store yet (findings.md, conflict 13).

## Data Schema

_Draft v0.3 — fields come from `spec_file.txt` (the spec). Every EXPA source below is
UNVERIFIED until the EXPA token is tested (Link phase)._

**Unit of the pool = one application = one card.** A person who applied to 3 jobs appears as
3 cards. Only applications whose status is "applied" are in the pool, and only for oGT
programmes: **GTa and GTe**. Applicants' home MC = AIESEC in India.

### Person fields (EP — Exchange Participant)

| Field | Type | Spec item | Source in EXPA | Verified? |
|---|---|---|---|---|
| personId | string | — (internal) | person id | No |
| fullName | string | applicant name | person name | No |
| email | string | email | person email | No |
| phone | string | phone | person contact info | No |
| linkedinUrl | string \| null | link to their linkedin profile | not found in any source yet; card shows "Not available" when null | No |
| cvUrl | string \| null | cv link | `person.cvs { url }` or `person.cv_url` | No |
| homeLc | string | lc | person's home local committee (LC) | No |
| epManagers | list of { name, email, phone } | ep manager | `person.managers` (can be several) | No |

### Application / opportunity fields

| Field | Type | Spec item | Source in EXPA | Verified? |
|---|---|---|---|---|
| applicationId | string | — (internal; card key) | application id | No |
| companyName | string \| null | company name | `opportunity.organisation.name` | No |
| startDate | date \| null | duration (actual dates) | application `slot.start_date`; fallback `opportunity.earliest_start_date` | No |
| endDate | date \| null | duration (actual dates) | application `slot.end_date`; fallback `opportunity.latest_end_date` | No |
| opportunityField | string \| null | opportunity field = the job's work area (sub-product) | `opportunity.sub_product.name` | No |
| status | string | — (internal; query filter only, not shown) | application `status`; "applied" is probably `open` in the API | No |
| programme | string | — (internal; query filter only) | `opportunity.programme.short_name_display`; GTa or GTe | No |

### Computed values

Statistics v1 (user-approved 2026-10-14; to be expanded later): total applications in the pool;
count per LC; count per work area (sub-product); count of GTa vs GTe.

### API input/output schemas

**Data flow:** browser asks for `/` → server fetches all pool applications from EXPA (all
pages, cached 15 min) → server maps them to `PoolApplication[]` → page is sent with that list →
search, LC filter, statistics and CSV export all run in the browser on that list.

`PoolApplication` (what the server hands to the page; exact EXPA query written after Link phase):
`{ applicationId, personId, fullName, email, phone, linkedinUrl|null, cvUrl|null, homeLc,
epManagers: [{ name, email|null, phone|null }], companyName|null, opportunityField|null,
programme: "GTa"|"GTe", startDate|null, endDate|null }` — dates as `YYYY-MM-DD` strings.

**EXPA request (server only):** `POST` to the EXPA GraphQL endpoint with the token;
`allOpportunityApplication(filters: { status, programmes: [8, 9], person_home_mc: <India id> },
page, per_page)` — names to be verified.

### Endpoint table

| Method | Path | Purpose | Auth | Input | Output |
|---|---|---|---|---|---|
| GET | `/` | The CV pool page (cards, search, LC filter, stats, export) | none (public) | — | HTML page with `PoolApplication[]` |

No public JSON API in v1. The EXPA call happens only inside the server.

## A.N.T. Architecture Mapping

| Layer | Role | Location |
|---|---|---|
| Architecture | SOPs in Markdown: goals, inputs, logic, edge cases | `docs/sops/` |
| Navigation | Pages and orchestration (decides what to fetch and show) | `src/app/` |
| Tools | Deterministic, testable units | `src/lib/expa/` (read-only EXPA client, query, mapper) and `src/lib/pool/` (search, LC filter, stats, CSV) |
| (UI pieces) | Visual components used by pages | `src/components/` |
| (Checks) | One-off scripts, e.g. the Link-phase EXPA probe | `scripts/` |

Tests live next to the code they test, as `*.test.ts`.

## Architectural Invariants

1. The EXPA access token lives only on the server, in the environment variable
   `EXPA_ACCESS_TOKEN` (`.env.local` locally, Vercel settings in production). It must never have
   a `NEXT_PUBLIC_` prefix (that prefix sends a variable to the browser). It is never sent to the browser, logged, or committed.
2. The site is **public, with no login** (user decision, 2026-10-14; data privacy is covered by
   AIESEC in India policy). Revisit only if the user asks.
3. **EXPA is read-only.** The app only runs read queries. It never creates, updates or deletes
   anything on EXPA (no GraphQL mutations).
4. The pool contains **only applications with status "applied"** for **GTa and GTe** opportunities,
   from applicants whose home MC is AIESEC in India, one card per application.
   When an application moves to another status in EXPA, it leaves the pool.
5. `.tmp/` is scratch space only. Nothing in it is a deliverable.

## Behavioral Rules

1. Claude may make technical decisions, but must describe every change and get the user's
   approval **before** making it.
2. Explain in plain, non-technical language. The user is new to building apps. Don't over-explain.
3. Never guess business logic or requirements. Ask.
4. Never push data to EXPA (see Invariant 3).
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
