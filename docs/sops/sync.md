# SOP: Sync job (EXPA → Supabase)

Layer: Architecture. Code: `scripts/sync.ts` (entry) → `src/lib/sync/run.ts` (orchestration) →
tools in `src/lib/expa/`, `src/lib/pool/`, `src/lib/sync/`, `src/lib/db/`.
Rules come from `CLAUDE.md` (Invariants 1, 3, 5, 6, 7). If this SOP and the code disagree, fix
this SOP first.

## Goal

Every 15 minutes, make the `applications` table equal to the current pool: every EXPA application
that passes the pool rules, one row each, and nothing else. Never damage good data with bad data.

## Inputs

| Input | Where from |
|---|---|
| `EXPA_ACCESS_TOKEN` | GitHub secret / `.env.local` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | GitHub secret / `.env.local` |
| Flags | `--dry-run` (read only, print counts), `--force` (skip the "less than half" brake only) |
| Clock | current time; "today" is the date in India (Asia/Kolkata) |

## Steps

1. **Fetch** (read-only): `allOpportunityApplication(filters: { person_home_mc: [1585],
   programmes: [8, 9], status: "open" }, per_page: 100)`. Page 1 gives `total_items` and
   `total_pages`; the other pages are fetched 5 at a time. Each request: 60 s timeout, up to 3
   attempts (waits 1 s, then 3 s). Duplicate ids (pages shifting during the fetch) are dropped.
2. **Map** each EXPA record to an `applications` row (table in CLAUDE.md "Data Schema"):
   - Records missing an id, applicant id, home LC, a valid programme (GTa/GTe) or `created_at`
     are **invalid**: skipped and counted by reason.
   - A record whose status is not `open` is skipped and counted.
   - Name missing → `"(name not on EXPA)"`.
   - Phone = country code + number (`+91 98…`); unchanged if the number already starts with `+`.
     A value with no digits (EXPA writes "deleted phone number") counts as no phone.
     Invisible text-direction characters (U+200E/F, U+202A–E, U+2066–9) are removed first.
     The country code is the last group of digits in EXPA's value, which can be `+91`, `91` or
     `India (+91)` (52 of 1,183 phones on 2026-10-16). A code of only zeros counts as no code.
     The national trunk 0 is dropped after a country code (`+91 0987…` → `+91 987…`; 21 phones,
     India and Germany), except for Italy (`+39`), where the 0 is part of the number.
   - EXPA's `status: "open"` filter also returns some rejected/withdrawn records (11 of 2,399 on
     2026-10-15), so the status is checked again here.
   - URLs (CV, LinkedIn) are kept only if they are `http`/`https`. A LinkedIn value without a
     scheme but containing `linkedin.com` gets `https://`. Anything else → null (the card shows
     "Not available"). This also blocks `javascript:` links.
   - Dates: a plain `YYYY-MM-DD` is kept; a timestamp is converted to its date in India time.
     Start/end: slot dates first, then the opportunity's earliest start / latest end.
3. **Pool rules**: drop rows whose home LC name starts with `Closed [` (any case); drop rows
   whose end date is before today in India. Ending today is kept; no end date is kept.
4. **Safety brake**. Write nothing, delete nothing, record `blocked` if any of:
   - unique fetched ≠ EXPA's `total_items`;
   - kept = 0;
   - a previous `success` run exists and kept < half of its `kept_count` (skipped with `--force`).
   Any thrown error (EXPA down, timeout, database error) → record `failed`.
5. **Write** (secret key): upsert all kept rows (chunks of 500, key `application_id`, `synced_at`
   = run start), then read all existing ids (pages of 1000) and delete the ones not kept
   (chunks of 200).
6. **Log** one `sync_runs` row: `success` / `blocked` / `failed`, counts, short message.
7. **Exit code**: 0 for `success` (and for a dry run), 1 for `blocked` or `failed`, so GitHub marks
   the run red and emails the owner.

## Edge cases

| Case | Behaviour |
|---|---|
| EXPA token expired | GraphQL/HTTP error → `failed`; site keeps the last good data |
| EXPA returns fewer rows than it promised | `blocked` |
| Large legitimate drop (e.g. many slots end) | `blocked`; a person checks, then runs with `--force` |
| Upsert succeeds but delete fails | `failed`; stale rows stay until the next good run deletes them |
| First run ever | No previous success → only the "kept = 0" and count checks apply |
| Two runs at once | Prevented by the GitHub workflow's concurrency group. If a third start arrives while one runs and one waits, GitHub cancels the waiting one (shows as "cancelled"; harmless) |
| Supabase Cron trigger stops (GitHub token expired or revoked, Supabase paused) | GitHub's hourly backup schedule keeps the data at most a few hours old; "Last updated" turns amber after 1 h. Check `net._http_response` (status 401 = token problem); make a new token and update the Vault secret |
| Supabase free project paused for inactivity (Supabase's free-plan rule) | Unverified whether the cron job counts as activity. If paused: restore it in the Supabase dashboard; until then the site shows its error page and syncs fail (red runs, email) |
| GitHub pauses the schedule (60 days without repo activity) | Monthly keep-alive job re-enables it via the API (undocumented method); the site's amber "Last updated" shows if it fails. Fix: Actions tab → this workflow → Enable. |
| Who gets failure emails | The GitHub user who last changed the `cron` line (GitHub docs) |

## Output rules

- Console and `sync_runs.message` contain **counts and reasons only**: no names, emails, phones
  or URLs (GitHub Actions logs of a public repo are public).
- Any text that could contain the token is redacted before it is printed or stored.
- Dry run prints: fetched / total, kept, dropped per reason, field fill counts, would-upsert,
  would-delete. It never writes.

## Trigger (how a run starts)

1. **Every 15 minutes (main):** Supabase Cron job `trigger-expa-sync` (minutes 7, 22, 37, 52, UTC)
   sends `POST https://api.github.com/repos/ElementZ76/aiesec-in-india-ogt-dashboard/actions/workflows/sync.yml/dispatches`
   with body `{"ref": "main", "inputs": {"mode": "normal"}}` and the Vault secret
   `github_dispatch_token` as the bearer token. GitHub answers 200 and starts a normal run.
   SQL: `supabase/scheduler.sql`.
2. **Hourly backup:** GitHub's own schedule (`45 * * * *`), best effort.
3. **By hand:** Actions → Sync EXPA to Supabase → Run workflow.

Check it is working: GitHub Actions shows `workflow_dispatch` runs about every 15 minutes, and in
Supabase `select status_code, created from net._http_response order by created desc limit 5;`
shows 200s. Supabase keeps those responses for 6 hours.
