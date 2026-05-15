-- 20260430160000_auth_ownership_event_members.sql
-- Re-introduce auth and ownership on top of the events feature.
--
-- - Anonymous Supabase auth handles user identity (no friction).
-- - events / games get a non-null owner_id again.
-- - events get an invite_token (UUID, default gen_random_uuid()) and an
--   event_members table.
-- - RLS replaces the open prototype policies with owner / member rules.
-- - join_event(p_token) RPC adds the caller to event_members.
--
-- All pre-existing rows were wiped because they had NULL owner_id
-- (created during the no-auth prototype phase) — fresh start.
--
-- ⚠️  Manual prerequisite: Anonymous Sign-Ins must be enabled in
--    Supabase Dashboard → Authentication → Providers → Anonymous.

delete from public.rounds;
delete from public.players;
delete from public.teams;
delete from public.spectator_access;
delete from public.photo_analyses;
delete from public.games;
delete from public.events;

alter table public.events
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists invite_token uuid not null default gen_random_uuid();

alter table public.events alter column owner_id set not null;

create unique index if not exists events_invite_token_uniq on public.events(invite_token);

create table if not exists public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_members enable row level security;

alter table public.games alter column owner_id set not null;

drop policy if exists events_public_all on public.events;
drop policy if exists teams_public_all on public.teams;
drop policy if exists players_public_all on public.players;
drop policy if exists rounds_public_all on public.rounds;
drop policy if exists spectator_access_public_all on public.spectator_access;
drop policy if exists photo_analyses_public_all on public.photo_analyses;
drop policy if exists games_public_all on public.games;

create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = p_event_id and user_id = auth.uid()
  );
$$;
revoke all on function public.is_event_member(uuid) from public;
grant execute on function public.is_event_member(uuid) to anon, authenticated;

create or replace function public.can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select owner_id = auth.uid() from public.events where id = p_event_id),
    false
  ) or public.is_event_member(p_event_id);
$$;
revoke all on function public.can_access_event(uuid) from public;
grant execute on function public.can_access_event(uuid) to anon, authenticated;

create policy events_select on public.events for select to authenticated
  using (owner_id = auth.uid() or public.is_event_member(id));
create policy events_insert on public.events for insert to authenticated
  with check (owner_id = auth.uid());
create policy events_update on public.events for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy events_delete on public.events for delete to authenticated
  using (owner_id = auth.uid());

create policy event_members_select on public.event_members for select to authenticated
  using (user_id = auth.uid() or public.can_access_event(event_id));
create policy event_members_delete on public.event_members for delete to authenticated
  using (
    user_id = auth.uid()
    or exists(select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
  );

create policy games_select on public.games for select to authenticated
  using (
    owner_id = auth.uid()
    or (event_id is not null and public.can_access_event(event_id))
  );
create policy games_insert on public.games for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (event_id is null or public.can_access_event(event_id))
  );
create policy games_update on public.games for update to authenticated
  using (
    owner_id = auth.uid()
    or (event_id is not null and public.can_access_event(event_id))
  )
  with check (true);
create policy games_delete on public.games for delete to authenticated
  using (
    owner_id = auth.uid()
    or (event_id is not null and public.can_access_event(event_id))
  );

create policy teams_all on public.teams for all to authenticated
  using (exists(
    select 1 from public.games g
    where g.id = teams.game_id
      and (g.owner_id = auth.uid() or (g.event_id is not null and public.can_access_event(g.event_id)))
  ))
  with check (exists(
    select 1 from public.games g
    where g.id = teams.game_id
      and (g.owner_id = auth.uid() or (g.event_id is not null and public.can_access_event(g.event_id)))
  ));

create policy players_all on public.players for all to authenticated
  using (exists(
    select 1 from public.teams t
    join public.games g on g.id = t.game_id
    where t.id = players.team_id
      and (g.owner_id = auth.uid() or (g.event_id is not null and public.can_access_event(g.event_id)))
  ))
  with check (exists(
    select 1 from public.teams t
    join public.games g on g.id = t.game_id
    where t.id = players.team_id
      and (g.owner_id = auth.uid() or (g.event_id is not null and public.can_access_event(g.event_id)))
  ));

create policy rounds_all on public.rounds for all to authenticated
  using (exists(
    select 1 from public.games g
    where g.id = rounds.game_id
      and (g.owner_id = auth.uid() or (g.event_id is not null and public.can_access_event(g.event_id)))
  ))
  with check (exists(
    select 1 from public.games g
    where g.id = rounds.game_id
      and (g.owner_id = auth.uid() or (g.event_id is not null and public.can_access_event(g.event_id)))
  ));

create policy spectator_access_owner on public.spectator_access for all to authenticated
  using (exists(select 1 from public.games g where g.id = spectator_access.game_id and g.owner_id = auth.uid()))
  with check (exists(select 1 from public.games g where g.id = spectator_access.game_id and g.owner_id = auth.uid()));

create policy photo_analyses_owner on public.photo_analyses for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.join_event(p_token uuid)
returns table(event_id uuid, event_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_event_name text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id, name into v_event_id, v_event_name
  from public.events
  where invite_token = p_token;

  if v_event_id is null then
    raise exception 'invalid_token';
  end if;

  insert into public.event_members(event_id, user_id)
  values (v_event_id, v_uid)
  on conflict do nothing;

  return query select v_event_id, v_event_name;
end;
$$;
revoke all on function public.join_event(uuid) from public;
grant execute on function public.join_event(uuid) to authenticated;

comment on table public.event_members is 'Membres autorisés à voir et scorer dans un événement (via join_event)';
comment on column public.events.invite_token is 'UUID partagé dans le lien d''invitation; consommé par join_event';
