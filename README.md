# oGT CV Pool — AIESEC in India

A public, India-wide pool of every **applied** outgoing Global Talent application (**GTa** and
**GTe**) from AIESEC in India, built for AIESEC members (EP managers and the oGT team) to find
candidates and their CVs quickly.

Data comes from **EXPA**, AIESEC's global platform. A sync job, started every 15 minutes by
Supabase Cron, copies it into a database, and the website reads from that database, so pages load fast and
EXPA is never queried by visitors.

> **Status (October 2026):** the sync job, database and website are built (about 930 applications
> across 24 LCs). Next: review and deployment to Vercel.

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [The sync job](#the-sync-job)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security and data handling](#security-and-data-handling)
- [Project documents](#project-documents)
- [Credits](#credits)

---

## Features

- **One card per application**, newest first, showing: applicant name, LC, GTa/GTe, company,
  work area, start and end dates, applicant email, phone and LinkedIn, EP manager(s) and a link
  to the CV. Missing details show as "Not available".
- **Search** across name, email, company, work area, LC and EP manager.
- **Filter by LC** (local committee), including India National Office.
- **Statistics** that follow the LC filter: total applications, GTa vs GTe, top LCs (or the
  selected LC's rank) and top work areas, with a full breakdown.
- **Export to CSV** of exactly what is currently searched and filtered.
- **12 cards at a time** with a "Load more applications" button.
- **"Last updated" time**, which turns amber when the data is more than an hour old.
- **Dark mode by default**, with a light/dark switch; responsive from 320 px phones to
  1920 px screens; WCAG AA text contrast.

### Which applications are in the pool

| Rule | Detail |
|---|---|
| Status | "Applied" in EXPA (`open` in the API) |
| Programmes | GTa (Global Talent) and GTe (Global Teacher) |
| Applicant's home | AIESEC in India |
| Closed LCs | Hidden |
| Ended slots | Hidden from the day after the slot ends (India time) |

---

## How it works

```
EXPA (read-only)
   │   GitHub Actions, started every 15 minutes by Supabase Cron
   ▼
Sync job ── pool rules ── safety brake
   │   secret key (write)
   ▼
Supabase (Postgres, Row Level Security)
   │   publishable key (read-only), cached 5 minutes
   ▼
Next.js website on Vercel  ──►  visitors' browsers (search, filter, stats, CSV)
```

1. **Sync job** (`scripts/sync.ts`): fetches all candidate applications from EXPA, cleans each
   record, applies the pool rules, and checks a **safety brake** before writing anything.
2. **Database** (Supabase): an `applications` table (one row per card) and a `sync_runs` log.
   Row Level Security lets the website's key **read only**; only the sync job's secret key can
   write.
3. **Website** (Next.js): reads the pool from the database on the server, caches it for
   5 minutes, and sends it to the browser, where search, filtering, statistics and CSV export
   run instantly.

---

## Tech stack

| Part | Technology |
|---|---|
| Website | [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript |
| Styling | Plain CSS, Lato font |
| Database | [Supabase](https://supabase.com) (Postgres), free plan, Mumbai region |
| Data source | EXPA GraphQL API (`gis-api.aiesec.org`), read-only |
| Scheduled sync | GitHub Actions, started by Supabase Cron (pg_cron + pg_net) |
| Hosting | [Vercel](https://vercel.com) |
| Tests | [Vitest](https://vitest.dev) |
| Runtime | Node.js 22.12 or newer |

---

## Project structure

```
.github/workflows/sync.yml   The sync job (hourly backup schedule + manual run button)
docs/
  design/ui-mockup.html      Approved UI design (sample data; open in a browser)
  sops/sync.md               Rules and edge cases of the sync job
  sops/pool-page.md          Rules and edge cases of the website page
scripts/
  sync.ts                    Sync job entry point (npm run sync)
  db-check.mjs               Checks the database connection and access rules
  expa-probe.mjs             Read-only EXPA exploration script
src/
  app/                       Next.js page, layout, error page, styles
  components/                Page parts: navbar, statistics, cards
  lib/
    expa/                    Read-only EXPA client, query and record mapper
    pool/                    Pool rules, search, statistics, CSV export, formatting
    sync/                    One sync run, safety brake, delete list
    db/                      Table types, the website's cached reader, the sync job's writer
supabase/schema.sql          Tables, Row Level Security and permissions
supabase/scheduler.sql       Supabase Cron job that starts the sync every 15 minutes
CLAUDE.md                    Project constitution: rules, schema, decisions
```

---

## Getting started

### Prerequisites

- Node.js **22.12+** and npm
- An EXPA access token with national (MC-level) reach
- A Supabase project

### 1. Install

```bash
git clone https://github.com/ElementZ76/aiesec-in-india-ogt-dashboard.git
cd aiesec-in-india-ogt-dashboard
npm install
```

### 2. Configure secrets

Copy `.env.example` to `.env.local` and fill in the values. `.env.local` is git-ignored and must
never be committed.

| Variable | Used by | Where to find it |
|---|---|---|
| `EXPA_ACCESS_TOKEN` | Sync job only | Your EXPA access token |
| `SUPABASE_URL` | Sync job and website | Supabase → Project Settings → Data API. Use the bare `https://<id>.supabase.co`, without `/rest/v1/` |
| `SUPABASE_PUBLISHABLE_KEY` | Website (read-only) | Supabase → Project Settings → API Keys (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | Sync job only (can write) | Supabase → Project Settings → API Keys (`sb_secret_…`) |

None of these may ever be given a `NEXT_PUBLIC_` prefix: that would send them to the browser.

### 3. Create the database

In the Supabase dashboard, open **SQL Editor**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) and run it. Then verify the setup:

```bash
node --env-file=.env.local scripts/db-check.mjs
```

All 7 checks should pass.

### 4. Fill the database and run the site

```bash
npm run sync -- --dry-run   # fetch and check, write nothing
npm run sync                # first real sync
npm run dev                 # website at http://localhost:3000
```

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the website locally |
| `npm run build` | Production build (what Vercel runs) |
| `npm test` | Run all automated tests |
| `npm run typecheck` | Type-check all TypeScript |
| `npm run lint` | Lint the code |
| `npm run sync` | Real sync run |
| `npm run sync -- --dry-run` | Fetch and check everything, write nothing; prints counts only |
| `npm run sync -- --force` | Real run that skips the "less than half" brake (only after a person has checked that the drop is real) |

---

## The sync job

Each run (about 1 minute on GitHub):

1. **Fetch** every applied GTa/GTe application of AIESEC in India from EXPA, 5 pages at a
   time, with timeouts and retries. Only read queries are ever sent.
2. **Clean** each record:
   - re-check the status (EXPA's own filter also returns some rejected and withdrawn records)
   - format phone numbers, and treat placeholders like "deleted phone number" as missing
   - keep only `http(s)` links
   - convert dates to India time
3. **Apply the pool rules** (closed LCs and ended slots are dropped).
4. **Safety brake.** Nothing is written or deleted if:
   - EXPA returned fewer records than it reported
   - no applications are left after the rules
   - or the pool shrank to less than half of the last successful run

   The site then keeps showing the last good data.
5. **Write**: add or update the kept applications, then delete those no longer in the pool.
6. **Log** the run in `sync_runs`. A blocked or failed run turns the GitHub run red and emails
   the repository owner.

**Running it manually:** GitHub → **Actions** → **Sync EXPA to Supabase** → **Run workflow**,
then pick `normal`, `dry-run` or `force`.

**Required repository secrets:** `EXPA_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
(Settings → Secrets and variables → Actions).

Full rules and edge cases: [`docs/sops/sync.md`](docs/sops/sync.md).

---

## Testing

```bash
npm test            # unit tests (Vitest)
npm run typecheck
npm run lint
npm run build
```

The tests cover:
- the EXPA client: it refuses mutations, retries, and hides the token in errors
- the record mapper: phones, links, dates and invalid records
- the pool rules, including "a slot ending today is kept" and India time zone edges
- the safety brake
- a full sync run against fake EXPA and database stand-ins: success, blocked, failed and dry run

---

## Deployment

- **Sync job:** runs on GitHub Actions from
  [`.github/workflows/sync.yml`](.github/workflows/sync.yml). Both actions are pinned to exact
  commits, and runs never overlap. A monthly keep-alive step stops GitHub from pausing the
  schedule after 60 days without repository activity.
- **Website:** deployed on Vercel. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the
  Vercel project's environment variables. The EXPA token and the Supabase secret key are
  **not** needed on Vercel and must not be added there.

---

## Security and data handling

- **EXPA is read-only.** The client refuses to send anything but queries; no data is ever
  written to EXPA.
- **Least privilege:**
  - the EXPA token and the database secret key live only in GitHub secrets and local
    `.env.local`
  - the website holds only a read-only key, and only on the server
  - Row Level Security and column-level permissions enforce this in the database
- **Public logs stay clean.** Sync output contains counts only (no names, emails, phones or
  links), and any text that could contain the token is redacted.
- **Data privacy:** the site is public by decision of AIESEC in India; handling of applicant
  data is covered by AIESEC in India's data policy.

---

## Project documents

| File | Contents |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Project constitution: scope, data schema, rules (invariants), UI spec, change log |
| [`task_plan.md`](task_plan.md) | Phase checklist |
| [`findings.md`](findings.md) | Research, decisions and verified EXPA facts |
| [`progress.md`](progress.md) | Dated work log, including test results and errors |
| [`docs/sops/`](docs/sops) | Standard operating procedures |

---

## Credits

Built by [Praveen](https://www.linkedin.com/in/praveen-pr190705/) for **AIESEC in India**.
