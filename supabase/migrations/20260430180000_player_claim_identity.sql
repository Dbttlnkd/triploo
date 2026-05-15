-- 20260430180000_player_claim_identity.sql
--
-- Link players to user accounts (display name + member-aware picker +
-- "C'est moi" claim flow + user-id stats foundation).
--
-- Already applied on prod (xghmgvahpdnxwxywtbay). This file just versions it.

-- 1) handle_new_user creates an empty profile for every new user, not only
--    those with a username in raw_user_meta_data. Anon users now get a row
--    they can later UPDATE to set their display_name.
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

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    v_username,
    coalesce(v_username::text, nullif(new.raw_user_meta_data->>'display_name', ''))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Backfill: ensure every existing auth.users has a profile row.
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict do nothing;

-- 2) RPC: list members of an event with their display names. Scoped by
--    can_access_event so only members (or owner) can read the roster.
create or replace function public.list_event_members(p_event_id uuid)
returns table(user_id uuid, display_name text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_access_event(p_event_id) then
    raise exception 'forbidden';
  end if;
  return query
    select em.user_id, coalesce(p.display_name, ''), em.joined_at
    from public.event_members em
    left join public.profiles p on p.id = em.user_id
    where em.event_id = p_event_id
    order by em.joined_at asc;
end;
$$;
revoke all on function public.list_event_members(uuid) from public;
grant execute on function public.list_event_members(uuid) to authenticated;

-- 3) RPC: claim unclaimed player rows by name within an event. Match is
--    case-insensitive on trimmed name. Caller must be member or owner.
create or replace function public.claim_player_name(p_event_id uuid, p_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.can_access_event(p_event_id) then
    raise exception 'forbidden';
  end if;

  update public.players
  set user_id = auth.uid()
  where lower(trim(name)) = lower(trim(p_name))
    and user_id is null
    and team_id in (
      select t.id from public.teams t
      join public.games g on g.id = t.game_id
      where g.event_id = p_event_id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.claim_player_name(uuid, text) from public;
grant execute on function public.claim_player_name(uuid, text) to authenticated;

-- 4) RPC: release my claims within an event.
create or replace function public.unclaim_my_players(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.can_access_event(p_event_id) then
    raise exception 'forbidden';
  end if;

  update public.players
  set user_id = null
  where user_id = auth.uid()
    and team_id in (
      select t.id from public.teams t
      join public.games g on g.id = t.game_id
      where g.event_id = p_event_id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.unclaim_my_players(uuid) from public;
grant execute on function public.unclaim_my_players(uuid) to authenticated;

-- 5) Add players to realtime publication so claim/unclaim updates propagate
--    to other sessions live.
alter publication supabase_realtime add table public.players;
