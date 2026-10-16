-- Supabase Cron: starts the GitHub Actions sync every 15 minutes (docs/sops/sync.md "Trigger").
-- Why: GitHub's own schedule ran only every 2-5 hours (findings.md, 2026-10-16).
--
-- BEFORE running this file (once, in the Supabase dashboard):
--   1. Integrations -> Cron -> enable it (this turns on the pg_cron extension).
--   2. Database -> Extensions -> search "pg_net" -> enable it.
--   3. Integrations -> Vault -> "Add new secret":
--        Name:  github_dispatch_token
--        Value: the fine-grained GitHub token (this repo only, "Actions: Read and write")
--      Use the Vault screen, NOT a SQL query, so the token never lands in SQL history or snippets.
--      This file contains no secret and is safe to commit (CLAUDE.md Invariant 1).
--
-- Then paste this whole file into SQL Editor and click Run. Running it again is safe:
-- cron.schedule with an existing job name replaces that job.

-- Every 15 minutes, at minutes 7, 22, 37, 52 (UTC): ask GitHub to start a normal sync run.
select cron.schedule(
  'trigger-expa-sync',
  '7,22,37,52 * * * *',
  $$
  select net.http_post(
    url := 'https://api.github.com/repos/ElementZ76/aiesec-in-india-ogt-dashboard/actions/workflows/sync.yml/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'github_dispatch_token'),
      'X-GitHub-Api-Version', '2026-03-10',
      'User-Agent', 'aiesec-ogt-cv-pool-scheduler',
      'Content-Type', 'application/json'
    ),
    body := '{"ref": "main", "inputs": {"mode": "normal"}}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);

-- Once a week: delete cron run history older than 7 days (Supabase does not clean it up).
select cron.schedule(
  'cleanup-cron-history',
  '30 4 * * 0',
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days' $$
);

-- ---------------------------------------------------------------------------------------------
-- Checks (run one at a time, any time):
--
--   Jobs that exist:
--     select jobname, schedule, active from cron.job;
--
--   Did the job run? (status should be 'succeeded'):
--     select status, return_message, start_time from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'trigger-expa-sync')
--     order by start_time desc limit 5;
--
--   What did GitHub answer? (200 = run started; 401 = token wrong or expired; 404 = token has no
--   access to the repo; kept for 6 hours):
--     select status_code, timed_out, error_msg, created from net._http_response
--     order by created desc limit 5;
--
-- Undo (stop the 15-minute trigger; GitHub's hourly backup schedule keeps running):
--     select cron.unschedule('trigger-expa-sync');
