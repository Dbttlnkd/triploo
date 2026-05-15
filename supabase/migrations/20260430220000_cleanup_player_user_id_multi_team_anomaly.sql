-- 20260430220000_cleanup_player_user_id_multi_team_anomaly.sql
--
-- Data cleanup: a user_id should not appear in two opposing teams of the
-- same game. When that happens (picker race / mis-pick), null out the
-- user_id on every row that is NOT on the winning team — keep the win
-- claim, drop the spurious loss claim.
--
-- Already applied on prod.

update public.players pl
set user_id = null
where pl.user_id is not null
  and exists (
    select 1
    from public.players pl2
    join public.teams t2 on t2.id = pl2.team_id
    join public.teams t  on t.id = pl.team_id
    where pl2.user_id = pl.user_id
      and t2.game_id = t.game_id
      and t2.id <> t.id
  )
  and pl.team_id <> (
    select g.winner_team_id
    from public.teams t
    join public.games g on g.id = t.game_id
    where t.id = pl.team_id
  );
