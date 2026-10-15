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

- **Action:** Scaffolded Next.js 16.4 project in `.tmp/scaffold`, merged into the repo root (so it could not overwrite memory files), replaced the default page with a placeholder, set page title, merged `.gitignore`, added `.env.example`, Vitest config, `test` / `typecheck` scripts, `engines.node`.
- **Files:** `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `AGENTS.md`, `.gitignore`, `.env.example`, `src/app/{layout.tsx,page.tsx,globals.css,favicon.ico}`, `CLAUDE.md`, `findings.md`, `task_plan.md`
- **Tests:** typecheck OK; lint OK; `vitest run --passWithNoTests` OK (no tests yet); `next build` OK (`/` static). `npm audit --omit=dev`: 0 vulnerabilities.
- **Errors:** (1) `npm install -D vitest` → ERESOLVE: `@types/node@^20` vs Vitest's `^22 || >=24`. Root cause: generator pins Node 20 types; we run Node 22. Fix: `@types/node@^22`, `engines.node >=22.12`. (2) `tsc --noEmit` → `Cannot find name 'LayoutProps'`. Root cause: Next.js generates that type. Fix: typecheck script runs `next typegen` first. Both logged as constraints in findings.md.

- **Action:** Confirmed `.env.local` exists, is git-ignored and holds a 43-char value (value not read). Wrote and ran `scripts/expa-probe.mjs` (read-only; refuses mutations; prints no personal data).
- **Files:** `scripts/expa-probe.mjs`, `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** probe ran OK (exit 0). Results in findings.md.
- **Errors:** (1) `currentPerson { home_mc }` → "Field 'home_mc' doesn't exist on type 'CurrentPerson'". Fix: read `home_lc.parent`. (2) Full fetch took 298.5 s, so the command exceeded the 300 s shell timeout and finished in the background. Not a bug, but it is the key finding: on-demand fetching is too slow (conflict 15).

- **Action:** User chose sync + database design, 15-min refresh, hide closed LCs and ended slots. Ran `expa-probe.mjs size` (read-only): light fetch takes 4–13 s; 945 applications remain after the rules. Checked Supabase key types and free-plan limits.
- **Files:** `scripts/expa-probe.mjs` (added `size` step), `findings.md`, `progress.md`
- **Tests:** probe OK (exit 0). **Errors:** none.

## 2026-10-15

- **Action:** User approved the sync + database plan and the new library; India National Office shown; slot ending today still shown. Rewrote the constitution (stack, schema v1, data flow, invariants, A.N.T. folders). Phase-boundary review of all four memory files. Added Supabase variables to `.env.example`.
- **Contradictions found and fixed:** constitution described on-page-load fetching, no database, token on Vercel, schema "unverified"; task_plan had "user puts token in .env.local" unticked (done 2026-10-14) and a "15-min cache" page item; findings said "nothing verified" and "LinkedIn not found" in the old research section, constraint said token is "server-side" (now: sync job only), scaffold note mentioned the 15-min page cache.
- **Files:** `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`, `.env.example`
- **Tests:** none (no code changed). **Errors:** none.

- **Action:** UI conversation: mockups v1–v8 in `.tmp/ui-mockup.html` (scratch, not committed). Measured contrast (WCAG), performance and responsiveness with headless Chrome via the DevTools protocol (script in the session scratchpad). Applied performance and responsive fixes. Re-checked the EXPA token (still works after ~31 h).
- **Files:** `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** contrast check all ≥ 4.5:1; responsive audit 320–1920 px clean; perf: keystroke→paint ~2× faster than v6.
- **Errors:** (1) Chrome extension not connected → used headless Chrome instead. (2) Headless Chrome exited with code 21 → root cause: relative `--user-data-dir`; fix: absolute path. (3) `content-visibility: auto` collapsed fast scrolling to ~1 fps → reverted; logged as a constraint. (4) 320 px sideways scroll → root cause: `1fr` grid column and `<select>` min-content width; fix: `minmax(0, 1fr)` and `min-width: 0`.
- **Action:** User approved the UI (mockup v10). Checked EXPA `created_at` (read-only introspection + 100-row sample: DateTime, all filled). Wrote UI Spec + `applied_at` into the constitution; deadline in status line.
- **Files:** `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** none (no code). **Errors:** none.
- **Action:** User created Supabase + Vercel accounts. Checked `.env.local` shape without printing values: keys OK; `SUPABASE_URL` ends in `/rest/v1/` (must be removed). Copied approved mockup to `docs/design/ui-mockup.html`. Installed `@supabase/supabase-js` 2.118.0. Wrote `supabase/schema.sql` (tables, RLS, least-privilege grants: anon reads applications + sync_runs.status/finished_at only) and `scripts/db-check.mjs`.
- **Files:** `package.json`, `package-lock.json`, `supabase/schema.sql`, `scripts/db-check.mjs`, `docs/design/ui-mockup.html`, `CLAUDE.md`, `task_plan.md`, `progress.md`
- **Tests:** eslint OK; typecheck OK; `npm audit --omit=dev` 0 vulnerabilities. db-check not run yet (needs SQL applied).
- **Errors:** none.
