# Task Plan

**Current Phase: 1 — Blueprint (research done; next: token questions + tech stack)**

## Phase 0 — Initialization
- [x] Create `CLAUDE.md`, `task_plan.md`, `findings.md`, `progress.md`, `.tmp/`
- [x] Record provisional A.N.T. mapping in constitution
- [x] Discovery Questions answered
- [ ] Data Schema written in constitution (draft v0 done; v1 after EXPA research)
- [ ] User approves Blueprint

## Phase 1 — B: Blueprint
- [x] Receive spec file; cross-check against discovery answers; log conflicts
- [x] User resolves open conflicts 3–6
- [x] Study reference site (ogtbardo.vercel.app/cv-pool) and log how it works
- [x] Research EXPA API from public sources (auth, query shape, candidate fields, pagination, token types)
- [ ] Confirm EXPA findings against the live API with the real token (Link phase)
- [ ] Choose tech stack; verify current library versions from docs; log in findings.md
- [ ] Data Schema v1 in constitution
- [ ] Implementation plan
- [ ] User approval

## Phase 2 — L: Link
- [ ] Project scaffold and environments
- [ ] Secrets in `.env` (+ `.env.example`), `.gitignore` covers them
- [ ] Hello-world: fetch one applicant from EXPA with the real token
- [ ] Confirm token scope (all India vs one LC), readable fields, expiry

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
- [ ] Navigation layer (server routes) with tests
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
