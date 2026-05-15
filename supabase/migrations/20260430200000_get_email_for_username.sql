-- 20260430200000_get_email_for_username.sql
--
-- Resolve a username (profiles.username) to the user's auth email.
-- Used by the client both to sign in (the email might be the synthetic one
-- or a real recovery email picked at upgrade time) and to request a
-- password reset.  Returns NULL when there's no match.
--
-- Already applied on prod.

create or replace function public.get_email_for_username(p_username citext)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = p_username
  limit 1;
$$;

revoke all on function public.get_email_for_username(citext) from public;
grant execute on function public.get_email_for_username(citext) to anon, authenticated;
