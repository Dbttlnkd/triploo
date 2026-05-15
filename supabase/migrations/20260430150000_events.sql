-- 20260430150000_events.sql
-- Add events as a grouping concept on top of games.
-- An event is a container for multiple games (tournament, soirée club, etc.).
-- Games can be standalone (event_id = NULL) or attached to an event.
--
-- Already applied on prod (xghmgvahpdnxwxywtbay). This file just versions it.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type event_status as enum ('live', 'archived');
  end if;
end $$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text,
  status event_status not null default 'live',
  started_at timestamptz default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.games
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists games_event_id_idx on public.games(event_id);

alter table public.events enable row level security;

drop policy if exists events_public_all on public.events;
create policy events_public_all
  on public.events for all
  to anon, authenticated
  using (true) with check (true);

comment on table public.events is 'Conteneur de plusieurs parties — tournoi, soirée club, etc.';
comment on column public.games.event_id is 'NULL pour une partie standalone, sinon FK vers l''événement parent';
