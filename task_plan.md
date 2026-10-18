# Task Plan

**Current Phase: 5 — Trigger (wrap-up).** Deadline: **everything incl. testing done by 2026-10-20**. Live: https://aiesec-in-india-ogt-dashboard.vercel.app/. Final integration test passed 2026-10-18 (1 finding, Breakdown rows 36 px on touch, fixed the same day). Next: the user's change requests.

## Phase 0 — Initialization
- [x] Create `CLAUDE.md`, `task_plan.md`, `findings.md`, `progress.md`, `.tmp/`
- [x] Record provisional A.N.T. mapping in constitution
- [x] Discovery Questions answered
- [x] Data Schema written in constitution (v0.3; v1 after Link verification)
- [x] User approves Blueprint

## Phase 1 — B: Blueprint
- [x] Receive spec file; cross-check against discovery answers; log conflicts
- [x] User resolves open conflicts 3–6
- [x] Study reference site (ogtbardo.vercel.app/cv-pool) and log how it works
- [x] Research EXPA API from public sources (auth, query shape, candidate fields, pagination, token types)
- [x] Choose tech stack; verify current library versions; log in findings.md
- [x] Data Schema v0.3 + data flow + endpoint table in constitution
- [x] Implementation plan
- [x] User approval (2026-10-14)

## Phase 2 — L: Link
- [x] Project scaffold and environments
- [x] Secrets in `.env.local` (+ `.env.example`), `.gitignore` covers them
- [x] User puts the token in `.env.local`
- [x] EXPA probe (read-only): endpoint, schema field names, "applied" status name, India MC id, LinkedIn field, token reach
- [x] Re-run probe hours later to check token expiry (works after ~31 h, 2026-10-15)
- [x] Data Schema v1 (verified) in constitution (2026-10-15; `person.full_name` still to confirm)
- [x] Sync + database plan approved; constitution rewritten (2026-10-15)
- [x] UI conversation — mockup v10 approved 2026-10-15; UI Spec in constitution
- [x] User creates Supabase project (free, Mumbai); adds URL + publishable + secret keys to `.env.local` (URL needs `/rest/v1/` removed)
- [x] User creates Vercel account (Hobby)
- [x] Install `@supabase/supabase-js` 2.118.0; write `supabase/schema.sql`
- [x] User runs `supabase/schema.sql` in the SQL editor
- [x] Connection test: `scripts/db-check.mjs` — all 7 checks pass (2026-10-15)
- [x] GitHub secrets: EXPA_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SECRET_KEY (user, 2026-10-15)

## Phase 3 — A: Architect
### MVP (bare minimum)
- [x] Application cards (status "applied" only, one per application): name, phone, email, LinkedIn, CV link, EP manager
- [x] Remaining spec fields: company name, LC, duration, opportunity field
### Full version (this iteration)
- [x] Search box
- [x] Filter by LC
- [x] Export to spreadsheet (CSV, formula guard)
- [x] Statistics v1: total, per LC, per work area, GTa vs GTe
### Quality
- [x] Tools layer: EXPA client + mapper, pool rules, database helpers, with tests (49 tests)
- [x] Sync job: dry run, safety brake, upsert + delete, `sync_runs` log, with tests — first real run 2026-10-15: 940 rows
- [x] GitHub Actions workflow (every 15 min + manual) and keep-alive — `.github/workflows/sync.yml`
- [x] First GitHub run (manual, run #1, 2026-10-15 23:31 IST): success, 940 kept, ~70 s
- [x] Confirm the first *scheduled* run fires and succeeds (4 scheduled runs green by 2026-10-16 06:28 UTC)
- [x] Scheduled runs are sparse (4 in ~12 h instead of ~48): decided on Supabase Cron trigger (`supabase/scheduler.sql`)
- [x] User set up the token + Vault secret and ran `supabase/scheduler.sql`; first Supabase-started run #7 at 14:22:01 UTC 2026-10-16, success in 46 s
- [x] Navigation layer: `/` page reads Supabase (5-min cache) with tests
- [x] SOPs written for each workflow (`sync.md`, `pool-page.md`)
- [x] Full test suite run and logged (66 tests, 2026-10-16)

### Additional features (user, 2026-10-16)
- [x] Work-area filter (dropdown + clickable Breakdown rows)
- [x] Deployed on Vercel: https://aiesec-in-india-ogt-dashboard.vercel.app/ (user, 2026-10-16)
- [x] Card popups: summary cards + details popup
- [x] Phone: search bar slides away on scroll down, back on scroll up

## Phase 4 — S: Stylize
- [x] UI/UX direction agreed with user (approved 2026-10-15; more tweaks after DB is connected)
- [x] Empty / loading / error states (pool empty, no match, database error)
- [x] Responsive layout (audit 320–1920 px clean, 44 px touch targets)
- [x] User feedback collected (2026-10-18: "the website is okay")
- [ ] User's change requests (announced 2026-10-18, details to come)

## Phase 5 — T: Trigger
- [x] Final integration test on the live site (2026-10-18: 45/46 checks; sync 170/170 runs green, no gap > 15.2 min)
- [x] Breakdown rows 44 px tall on touch screens (fixed 2026-10-18, user-approved)
- [x] Deploy to Vercel (env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) — 2026-10-16
- [x] README (updated 2026-10-18 with the live link)
- [x] Maintenance Log updated (2026-10-18)

## Phase 2+ (later, not in this iteration)
- [ ] Notes on applicants
