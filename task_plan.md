# Task Plan

**Current Phase: 2 — Link.** Deadline: **everything incl. testing done by 2026-10-20**. Next: Supabase setup (user creating Supabase + Vercel accounts 2026-10-15).

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
- [ ] User creates Supabase project (free, Mumbai); adds URL + publishable + secret keys to `.env.local`
- [ ] Install `@supabase/supabase-js` (approved); write `supabase/schema.sql`; user runs it in the SQL editor
- [ ] Connection test: write one row, read it back, delete it
- [ ] GitHub secrets: EXPA_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SECRET_KEY

## Phase 3 — A: Architect
### MVP (bare minimum)
- [ ] Application cards (status "applied" only, one per application): name, phone, email, LinkedIn, CV link, EP manager
- [ ] Remaining spec fields: company name, LC, duration, opportunity field
### Full version (this iteration)
- [ ] Search box
- [ ] Filter by LC
- [ ] Export to spreadsheet
- [ ] Statistics v1: total, per LC, per work area, GTa vs GTe
### Quality
- [ ] Tools layer: EXPA client + mapper, pool rules, database helpers, with tests
- [ ] Sync job: dry run, safety brake, upsert + delete, `sync_runs` log, with tests
- [ ] GitHub Actions workflow (every 15 min + manual) and keep-alive; watch first scheduled run
- [ ] Navigation layer: `/` page reads Supabase (5-min cache) with tests
- [ ] SOPs written for each workflow
- [ ] Full test suite run and logged

## Phase 4 — S: Stylize
- [x] UI/UX direction agreed with user (approved 2026-10-15; more tweaks after DB is connected)
- [ ] Empty / loading / error states
- [ ] Responsive layout
- [ ] User feedback collected

## Phase 5 — T: Trigger
- [ ] Final integration test
- [ ] Deploy to Vercel (env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
- [ ] README
- [ ] Maintenance Log updated

## Phase 2+ (later, not in this iteration)
- [ ] Notes on applicants
