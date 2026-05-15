-- 20260430210000_event_owner_auto_member.sql
--
-- The event owner is conceptually always a member, but until now they
-- were only granted access via the owner_id check in can_access_event.
-- They didn't appear in event_members rows, so list_event_members hid
-- them from the roster surfaced to the picker / event-detail UI.
--
-- Already applied on prod.

create or replace function public.add_owner_as_event_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.event_members(event_id, user_id)
    values (new.id, new.owner_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_event_created_add_owner on public.events;
create trigger on_event_created_add_owner
  after insert on public.events
  for each row execute function public.add_owner_as_event_member();

-- Backfill: any pre-existing event without its owner among the members.
insert into public.event_members(event_id, user_id)
select e.id, e.owner_id
from public.events e
left join public.event_members em
  on em.event_id = e.id and em.user_id = e.owner_id
where em.event_id is null
on conflict do nothing;
