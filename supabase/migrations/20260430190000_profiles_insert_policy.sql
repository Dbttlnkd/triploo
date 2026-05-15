-- 20260430190000_profiles_insert_policy.sql
--
-- Allow a user to self-insert their own profile row.
--
-- The handle_new_user trigger creates this row on signup, but client-side
-- upserts (used by setMyDisplayName) can hit the INSERT path on race or
-- late session and were getting blocked by RLS with
-- "new row violates row-level security policy for table profiles".
--
-- Already applied on prod.

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- Defensive backfill: ensure every existing user has a profile row.
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict do nothing;
