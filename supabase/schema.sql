-- oGT CV Pool: database setup (matches CLAUDE.md "Data Schema").
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run more than once: it creates what is missing and resets the access rules.

-- 1. Tables ------------------------------------------------------------------

-- One row = one card in the pool. Written only by the sync job.
create table if not exists public.applications (
  application_id    text primary key,                 -- EXPA application id
  person_id         text not null,
  full_name         text not null,
  email             text,
  phone             text,
  linkedin_url      text,
  cv_url            text,
  home_lc_id        text not null,
  home_lc           text not null,
  ep_managers       jsonb not null default '[]'::jsonb, -- [{ "name", "email", "phone" }]
  company_name      text,
  opportunity_field text,
  programme         text not null check (programme in ('GTa', 'GTe')),
  start_date        date,
  end_date          date,
  applied_at        timestamptz not null,             -- EXPA created_at; cards are sorted newest first
  synced_at         timestamptz not null default now()
);
create index if not exists applications_applied_at_idx on public.applications (applied_at desc);

-- Added 2026-10-27 (also on tables created before that date).
alter table public.applications
  add column if not exists professional_experiences jsonb not null default '[]'::jsonb, -- [{ "title", "organisation", "type", "start", "end", "description" }]
  add column if not exists languages                jsonb not null default '[]'::jsonb; -- [{ "name", "level" }]

-- One row per sync run. The website reads only status + finished_at ("Last updated").
create table if not exists public.sync_runs (
  id             bigint generated always as identity primary key,
  started_at     timestamptz not null,
  finished_at    timestamptz,
  status         text not null check (status in ('success', 'failed', 'blocked')),
  fetched_count  integer,
  kept_count     integer,
  upserted_count integer,
  deleted_count  integer,
  message        text                                  -- short reason; never contains a secret
);
create index if not exists sync_runs_status_finished_idx on public.sync_runs (status, finished_at desc);

-- 2. Row Level Security (CLAUDE.md invariant 3) ------------------------------
-- RLS on = nobody can read or write a row unless a policy below allows it.
-- The secret key (sync job) bypasses RLS. The publishable key (website) acts as role "anon".

alter table public.applications enable row level security;
alter table public.sync_runs    enable row level security;

drop policy if exists "website can read" on public.applications;
create policy "website can read" on public.applications for select to anon using (true);

drop policy if exists "website can read" on public.sync_runs;
create policy "website can read" on public.sync_runs for select to anon using (true);

-- 3. Table permissions (least privilege) --------------------------------------
-- No logins exist, so "authenticated" gets nothing. "anon" may only read, and on sync_runs
-- only the two columns the website needs. "service_role" (the secret key) may write.

revoke all on public.applications, public.sync_runs from anon, authenticated;
grant select on public.applications to anon;
grant select (status, finished_at) on public.sync_runs to anon;

grant select, insert, update, delete on public.applications, public.sync_runs to service_role;
grant usage, select on sequence public.sync_runs_id_seq to service_role;
