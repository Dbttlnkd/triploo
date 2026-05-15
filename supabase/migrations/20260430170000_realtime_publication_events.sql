-- 20260430170000_realtime_publication_events.sql
-- Add events and event_members to the realtime publication so subscriptions
-- on those tables actually receive notifications. games / rounds / teams
-- were already in the default publication; events was added later as part
-- of the events feature but never registered with Realtime, which silently
-- broke event_detail and Home live updates for event creation / membership
-- changes.

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_members;
