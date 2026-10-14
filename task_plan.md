# Task Plan

**Current Phase: 2 — Link (project scaffold, then EXPA connection test)**

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
- [ ] Project scaffold and environments
- [ ] Secrets in `.env.local` (+ `.env.example`), `.gitignore` covers them
- [ ] User puts the token in `.env.local`
- [ ] EXPA probe (read-only): endpoint, schema field names, "applied" status name, India MC id, LinkedIn field, token reach
- [ ] Re-run probe hours later to check token expiry
- [ ] Data Schema v1 (verified) in constitution

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
- [ ] Tools layer (EXPA client, mappers) with tests
- [ ] Navigation layer (`/` page, 15-min cache) with tests
- [ ] SOPs written for each workflow
- [ ] Full test suite run and logged

## Phase 4 — S: Stylize
- [ ] UI/UX direction agreed with user
- [ ] Empty / loading / error states
- [ ] Responsive layout
- [ ] User feedback collected

## Phase 5 — T: Trigger
- [ ] Final integration test
- [ ] Deploy to Vercel
- [ ] README
- [ ] Maintenance Log updated

## Phase 2+ (later, not in this iteration)
- [ ] Notes on applicants
