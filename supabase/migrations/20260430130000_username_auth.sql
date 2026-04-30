-- 20260430130000_username_auth.sql
-- Auth username-only : ajout colonne username unique sur profiles
-- + RPC de check disponibilité + trigger d'auto-création de profile
--
-- Cette migration a déjà été appliquée sur le projet de prod (xghmgvahpdnxwxywtbay).

create extension if not exists citext;

-- 1) Colonne username sur profiles
alter table public.profiles
  add column if not exists username citext;

-- 2) Contraintes : unique + format (3-20 caractères, lettres minuscules, chiffres, underscore)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_key'
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_format'
  ) then
    alter table public.profiles add constraint profiles_username_format
      check (username ~ '^[a-z0-9_]{3,20}$');
  end if;
end $$;

-- 3) RPC de disponibilité (callable depuis le client, sans auth)
create or replace function public.is_username_available(p_username citext)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = p_username
  );
$$;

revoke all on function public.is_username_available(citext) from public;
grant execute on function public.is_username_available(citext) to anon, authenticated;

-- 4) Trigger d'auto-création de profile à partir de raw_user_meta_data.username
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username citext;
begin
  v_username := nullif(new.raw_user_meta_data->>'username', '')::citext;

  if v_username is null then
    return new;
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_username::text)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
