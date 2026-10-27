-- oGT CV Pool: entity logins (CLAUDE.md invariant 4; docs/sops/pool-page.md "Login").
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run more than once. Contains NO passwords: the repo is public. Entities and their
-- first passwords are added afterwards with add_entity() (see "Admin" at the bottom).

create extension if not exists pgcrypto with schema extensions;  -- crypt() + gen_salt(): bcrypt

-- 1. Table ---------------------------------------------------------------------

-- One row = one login: an LC (lc_id = EXPA home LC id) or all of India (lc_id null).
create table if not exists public.entities (
  slug            text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- the address: /chennai
  name            text not null,
  lc_id           text,                          -- null = sees every LC
  password_hash   text not null,                 -- bcrypt; the password itself is never stored
  session_version integer not null default 1     -- +1 on every password change = everyone logged out
);

-- 2. Access rules (CLAUDE.md invariant 3) ---------------------------------------------
-- The website ("anon") may read everything except password_hash, and may ask
-- check_entity_password() whether a password is right. It can never read or change a hash.

alter table public.entities enable row level security;
drop policy if exists "website can read" on public.entities;
create policy "website can read" on public.entities for select to anon using (true);

revoke all on public.entities from anon, authenticated;
grant select (slug, name, lc_id, session_version) on public.entities to anon;
grant select, insert, update, delete on public.entities to service_role;

-- 3. Login check (called by the website) ----------------------------------------------
-- Returns the entity's session_version when the password is right, null when it is wrong
-- or the entity does not exist. Runs as the table owner, so it can compare hashes that
-- the website itself cannot read.
create or replace function public.check_entity_password(p_slug text, p_password text)
returns integer
language sql stable security definer
set search_path = public, extensions
as $$
  select session_version from public.entities
  where slug = p_slug and length(p_password) <= 200
    and password_hash = extensions.crypt(p_password, password_hash)
$$;
revoke all on function public.check_entity_password(text, text) from public, anon, authenticated, service_role;
grant execute on function public.check_entity_password(text, text) to anon;

-- 4. Admin (run by hand in the SQL editor; the website cannot call these) ----------------

-- Change a password. Everyone logged in to that entity is logged out within 5 minutes.
--   select set_entity_password('chennai', 'NewPassword');
create or replace function public.set_entity_password(p_slug text, p_password text)
returns text
language plpgsql
set search_path = public, extensions
as $$
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'The password must be at least 6 characters';
  end if;
  update public.entities
     set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
         session_version = session_version + 1
   where slug = p_slug;
  if not found then
    raise exception 'No entity with the address "%". See: select slug, name from entities order by slug;', p_slug;
  end if;
  return format('Password changed for /%s. Everyone logged in to it is logged out within 5 minutes.', p_slug);
end
$$;

-- Add a login. lc_id = the LC's EXPA id (the home_lc_id column of applications); null = all of India.
--   select add_entity('coimbatore', 'Coimbatore', '1234', 'Password');
create or replace function public.add_entity(p_slug text, p_name text, p_lc_id text, p_password text)
returns text
language plpgsql
set search_path = public, extensions
as $$
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'The password must be at least 6 characters';
  end if;
  insert into public.entities (slug, name, lc_id, password_hash)
  values (p_slug, p_name, p_lc_id, extensions.crypt(p_password, extensions.gen_salt('bf')));
  return format('Added /%s (%s).', p_slug, p_name);
end
$$;

revoke all on function public.set_entity_password(text, text) from public, anon, authenticated, service_role;
revoke all on function public.add_entity(text, text, text, text) from public, anon, authenticated, service_role;

-- Other admin tasks are plain SQL:
--   select slug, name, lc_id from entities order by slug;   -- list all logins
--   delete from entities where slug = 'coimbatore';           -- remove a login
