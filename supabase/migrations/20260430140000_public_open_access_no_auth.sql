-- 20260430140000_public_open_access_no_auth.sql
-- Open the workspace: no auth required, everyone (anon + authenticated)
-- can read and write. Intentional for the prototype phase.
--
-- To re-introduce auth later, restore the owner-scoped policies and the
-- NOT NULL constraint on games.owner_id.

alter table public.games alter column owner_id drop not null;

drop policy if exists games_owner_all on public.games;
drop policy if exists teams_via_game_owner on public.teams;
drop policy if exists players_via_game_owner on public.players;
drop policy if exists rounds_via_game_owner on public.rounds;
drop policy if exists spectator_access_owner on public.spectator_access;
drop policy if exists photo_analyses_owner on public.photo_analyses;

create policy games_public_all
  on public.games for all
  to anon, authenticated
  using (true) with check (true);

create policy teams_public_all
  on public.teams for all
  to anon, authenticated
  using (true) with check (true);

create policy players_public_all
  on public.players for all
  to anon, authenticated
  using (true) with check (true);

create policy rounds_public_all
  on public.rounds for all
  to anon, authenticated
  using (true) with check (true);

create policy spectator_access_public_all
  on public.spectator_access for all
  to anon, authenticated
  using (true) with check (true);

create policy photo_analyses_public_all
  on public.photo_analyses for all
  to anon, authenticated
  using (true) with check (true);
