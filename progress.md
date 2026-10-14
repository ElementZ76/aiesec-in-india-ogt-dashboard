# Progress Log

## 2026-10-14
- **Action:** Protocol 0 initialization.
- **Files:** `CLAUDE.md`, `task_plan.md`, `findings.md`, `progress.md`, `.gitignore`, `.tmp/`
- **Tests:** none (no code yet).
- **Errors:** none.

- **Action:** Recorded discovery answers. User chose a fully public site (no login, no shared password).
- **Files:** `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** none (no code yet).
- **Errors:** none.

- **Action:** Set up git, linked GitHub remote (ElementZ76/aiesec-in-india-ogt-dashboard), first commit and push.
- **Files:** `.git/`
- **Tests:** none. **Errors:** none.

- **Action:** Read `spec_file.txt`; cross-checked against discovery answers; updated schema to v0.1; logged conflicts 3–6.
- **Files:** `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`, `spec_file.txt` (added by user)
- **Tests:** none (no code yet).
- **Errors:** none.

- **Action:** Applied user answers to conflicts 3–6: one card per application; pool = "applied" only; removed status/date filters and date field; LC filter only; removed region from spec and schema. Schema → v0.2.
- **Files:** `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`, `spec_file.txt`
- **Tests:** none (no code yet).
- **Errors:** none.

- **Action:** Studied Bardo CV pool (read its public JS bundle; did not use its exposed EXPA token). Researched EXPA API from public sources. Logged both in findings.md.
- **Files:** `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** none (no code yet).
- **Errors:** none. Note: WebFetch can't render the Bardo page (JavaScript-only); used its JS bundle instead.

- **Action:** Recorded user answers on token owner (MC member), opportunity field (sub-product), duration (actual dates), programmes (GTa + GTe), LinkedIn fallback. Schema → v0.3.
- **Files:** `CLAUDE.md`, `findings.md`, `progress.md`
- **Tests:** none (no code yet). **Errors:** none.

- **Action:** Recorded decisions: slot dates first; stats v1; search box added; Next.js frontend; no Tailwind. Backend/database choice (Spring Boot + Supabase proposed by user) still open.
- **Files:** `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** none (no code yet). **Errors:** none.

- **Action:** Blueprint approved (Next.js only, no DB, plain CSS). Wrote tech stack, data flow, PoolApplication shape, endpoint table and final folder layout into the constitution. Phase-boundary review of all four memory files.
- **Contradictions found and fixed:** constitution still said "DRAFT / not approved"; Tech Stack and A.N.T. sections still provisional; Behavioral Rule 6 ("no code until Blueprint approved") obsolete → replaced with the push rule; Invariant 1 said `.env` but Next.js uses `.env.local`; findings rows 2 and 4 outdated (token owner, search box); conflict 13 still open; task_plan Phase 0/1 boxes unticked.
- **Files:** `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** none (no code yet). **Errors:** none.
