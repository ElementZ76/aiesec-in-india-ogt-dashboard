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
- **Action:** User applied `supabase/schema.sql` and fixed `SUPABASE_URL`. Ran `scripts/db-check.mjs`.
- **Tests:** 6/7 passed, then 7/7 after fixing the test.
- **Errors:** (1) db-check refused to run: `SUPABASE_URL` still ended in `/rest/v1/` (file not saved) → user fixed. (2) "permission denied for table sync_runs" when the website key filtered by `id`. Root cause: column privileges apply to WHERE/ORDER BY columns too; the grant was right, the test was wrong. Fix: test queries by `status` + `finished_at` like the real site. Logged as a constraint in findings.md.
- **Action:** Built the sync job per approved plan: SOP `docs/sops/sync.md`; `src/lib/db/types.ts`, `src/lib/db/sync-store.ts`; `src/lib/expa/{client,applications,mapper}.ts`; `src/lib/pool/{dates,rules}.ts`; `src/lib/sync/{brake,diff,run}.ts`; `scripts/sync.ts`; `npm run sync`; installed `tsx` 4.23.15 (dev). Dry run, then 2 real runs into Supabase.
- **Files:** above + tests `*.test.ts` (5 files), `package.json`, `package-lock.json`, `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** vitest 5 files / 49 tests pass; typecheck OK; lint OK; dry run OK (17 s); real runs: success ×2, 940 rows, website key sees 940 rows / 24 LCs / 0 closed.
- **Errors:** (1) `tsx` → "Top-level await is currently not supported with the cjs output format". Root cause: package is CommonJS. Fix: `main()` wrapper; constraint logged. (2) Data: 11 non-open records despite the status filter, 54 "deleted phone number" placeholders → mapper re-checks status; digit-free phones → null; test added; SOP updated.
- **Action:** Added `.github/workflows/sync.yml` (approved). User added the 3 repository secrets.
- **Files:** `.github/workflows/sync.yml`, `CLAUDE.md`, `docs/sops/sync.md`, `findings.md`, `task_plan.md`, `progress.md`
- **Tests:** YAML parses (jobs: sync, keepalive). First GitHub run pending.
- **Errors:** none.
- **Action:** User triggered the workflow manually (run #1): success in ~70 s; `sync_runs` shows success (kept 940, upserted 940, deleted 0); website key sees 940 rows.
- **Tests:** GitHub Actions run #1 green. **Errors:** none.
- **Action:** User approved the website build plan (server reads Supabase with the publishable key, `"use cache"` + 5-min `cacheLife`; browser does search/filter/stats/CSV; files per plan) but asked not to start yet. Wrote `README.md`.
- **Files:** `README.md`, `task_plan.md`, `progress.md`
- **Tests:** none (docs only). **Errors:** none.
- **Action (2026-10-16):** Checked the schedule: 4 scheduled runs, all success (21:18, 23:43, 01:44, 06:27 UTC); `sync_runs` matches; 942 rows. Gaps of 2–5 h instead of 15 min. Built the website per the approved plan: SOP `docs/sops/pool-page.md`; `src/lib/db/read.ts`; `src/lib/pool/{types,format,search,stats,csv}.ts`; `src/app/{layout,page,error}.tsx`, `globals.css` (ported from mockup v10); `src/components/{PoolApp,NavBar,StatsSection,AppCard,icons,hooks}`.
- **Files:** above + `src/lib/pool/page-tools.test.ts`, `CLAUDE.md`, `findings.md`, `task_plan.md`, `progress.md`, `README.md`
- **Tests:** vitest 6 files / 66 tests pass; typecheck OK; lint OK; build OK (`/` static, revalidate 5m, expire 1h). Headless audit on `next start`: functional (paging, search, LC filter, breakdown click, clear, empty state, CSV 926 rows, theme saved + restored, no unsafe links, no console errors); responsive 320–1920 px: no sideways scroll, no text < 12 px, nothing < 24 px, nothing < 44 px on touch; page 105 KB gzipped.
- **Errors:** (1) Bash heredoc with many quotes failed ("unexpected EOF") → wrote files with the file tool. (2) Touch targets 34–43 px (theme switch, export, breakdown, logo, links) → added a `pointer: coarse` block at the end of `globals.css`. (3) Second `next start` failed: the first server (started via `npx`) kept port 3100 after its task was stopped → killed the leftover process; start servers with `node node_modules/next/dist/bin/next` so stopping works. (4) That stale server served old HTML with new chunks → IntersectionObserver got `NaN` rootMargin → code now falls back to default sizes. (5) Scroll fps varied 4–21 for the same page; the mockup measured the same today (11 fps at 120 cards) → machine noise, not a regression.
- **Action (2026-10-16):** Phone fix (user-approved): checked phone shapes in the database (masked): 21 with a trunk 0 after the code (9 India, 12 Germany), 52 with country code "India (+91)" giving "+India (+91) ...", 16 of those with invisible direction marks, 1 with code "0". `formatPhone` now: removes invisible marks, takes the last digit group of the code, treats a zero code as none, drops the trunk 0 (not for Italy, +39). SOP `sync.md` updated first.
- **Files:** `docs/sops/sync.md`, `src/lib/expa/mapper.ts`, `src/lib/expa/mapper.test.ts`, `progress.md`, `findings.md`
- **Tests:** vitest 68 pass; dry run OK (fetched 2386, kept 927, brake ok). Existing rows are corrected by the next real sync.
- **Errors:** Bash heredocs in this shell drop backslashes (`\u200e` became a real invisible character) -> escape-heavy edits go through a script file written with the file tool.
