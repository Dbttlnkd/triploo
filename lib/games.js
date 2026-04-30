import { getSupabase } from './supabase.js';

function scoreFromRounds(game) {
  const out = { t1: 0, t2: 0 };
  (game.rounds || []).forEach((r) => {
    out[r.team] = (out[r.team] || 0) + r.points;
  });
  return out;
}

const UI_TO_DB_FORMAT = {
  teteATete: 'tete_a_tete',
  doublette: 'doublette',
  triplette: 'triplette',
  unContreDeux: 'un_contre_deux',
};

function dbFormatToUi(db) {
  const m = {
    tete_a_tete: 'teteATete',
    doublette: 'doublette',
    triplette: 'triplette',
    un_contre_deux: 'unContreDeux',
  };
  return m[db] || 'doublette';
}

function formatDateFr(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function formatTimeFr(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Normalise une ligne API (nested select) vers le modèle UI du prototype */
export function mapRemoteGame(row) {
  if (!row) return null;
  const teamsJoined = row.teams ?? row['teams!teams_game_id_fkey'];
  const teamsRaw = [...(teamsJoined || [])].sort((a, b) => a.position - b.position);
  const teams = teamsRaw.map((t, idx) => {
    const side = idx === 0 ? 't1' : 't2';
    const players = [...(t.players || [])].sort((a, b) => a.sort_order - b.sort_order).map((p) => p.name);
    return {
      id: side,
      dbId: t.id,
      name: t.name,
      color: t.color,
      players,
    };
  });

  const roundsRaw = [...(row.rounds || [])].sort((a, b) => a.round_index - b.round_index);
  const teamIdToSide = {};
  teamsRaw.forEach((t, i) => {
    teamIdToSide[t.id] = i === 0 ? 't1' : 't2';
  });
  const rounds = roundsRaw.map((r) => ({
    team: teamIdToSide[r.team_id] || 't1',
    points: r.points,
  }));

  const status = row.status === 'finished' || row.status === 'cancelled' ? 'archived' : 'live';
  const sc = { t1: 0, t2: 0 };
  rounds.forEach((r) => {
    sc[r.team] = (sc[r.team] || 0) + r.points;
  });

  let winner = null;
  if (row.status === 'finished' && row.winner_team_id && teamsRaw.length >= 2) {
    winner = row.winner_team_id === teamsRaw[0].id ? 't1' : 't2';
  }

  return {
    id: row.id,
    name: row.name,
    place: row.place || '',
    date: formatDateFr(row.finished_at || row.started_at || row.created_at),
    startedAt: formatTimeFr(row.started_at || row.created_at),
    format: dbFormatToUi(row.format),
    target: row.target,
    best_of: row.best_of,
    status,
    teams,
    rounds,
    spectators: row.spectator_count ?? 0,
    winner,
    finalScore: row.status === 'finished' ? [sc.t1, sc.t2] : null,
    _raw: row,
  };
}

/** Levé quand le projet Supabase a « Anonymous sign-ins » désactivé */
export class AnonDisabledError extends Error {
  constructor() {
    super('ANON_DISABLED');
    this.name = 'AnonDisabledError';
    this.code = 'ANON_DISABLED';
  }
}

function isAnonymousDisabledError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  if (error.status === 422) return true;
  return msg.includes('anonymous') && (msg.includes('disabled') || msg.includes('not allowed'));
}

export async function ensureAuthSession() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session) return session;

  const { data, error } = await sb.auth.signInAnonymously();
  if (!error && data.session) return data.session;
  if (isAnonymousDisabledError(error)) throw new AnonDisabledError();
  throw error;
}

/** Magic link (email) — nécessite le provider Email activé dans Supabase */
export async function sendAuthMagicLink(email) {
  const sb = getSupabase();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${origin}${path}` },
  });
  if (error) throw error;
}

export async function fetchGamesForUser() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const { data, error } = await sb
    .from('games')
    .select(`
      id, name, place, format, target, best_of, status, started_at, finished_at, winner_team_id,
      spectator_count, created_at,
      teams!teams_game_id_fkey ( id, name, color, position, players ( id, name, sort_order ) ),
      rounds ( id, team_id, points, round_index )
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRemoteGame);
}

export async function fetchGameById(gameId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('games')
    .select(`
      id, name, place, format, target, best_of, status, started_at, finished_at, winner_team_id,
      spectator_count, created_at,
      teams!teams_game_id_fkey ( id, name, color, position, players ( id, name, sort_order ) ),
      rounds ( id, team_id, points, round_index )
    `)
    .eq('id', gameId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRemoteGame(data) : null;
}

/**
 * Crée une partie live + 2 équipes + joueurs.
 * @param {{ name, place, formatUi, target, bestOf, teamA: {name,color,players[]}, teamB: {name,color,players[]} }} payload
 */
export async function createGameRemote(payload) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const dbFormat = UI_TO_DB_FORMAT[payload.formatUi] || 'doublette';
  const now = new Date().toISOString();

  const { data: gameRow, error: gErr } = await sb
    .from('games')
    .insert({
      owner_id: user.id,
      name: payload.name,
      place: payload.place || null,
      format: dbFormat,
      target: payload.target,
      best_of: payload.bestOf > 1 ? payload.bestOf : null,
      status: 'live',
      started_at: now,
      spectator_count: 0,
    })
    .select('id')
    .single();

  if (gErr) throw gErr;
  const gameId = gameRow.id;

  const sides = [
    { position: 1, ...payload.teamA },
    { position: 2, ...payload.teamB },
  ];

  for (const side of sides) {
    const { data: teamRow, error: tErr } = await sb
      .from('teams')
      .insert({
        game_id: gameId,
        name: side.name,
        color: side.color,
        position: side.position,
      })
      .select('id')
      .single();
    if (tErr) throw tErr;

    const playerRows = (side.players || []).map((name, i) => ({
      team_id: teamRow.id,
      name: name || `Joueur ${i + 1}`,
      sort_order: i,
    }));
    if (playerRows.length) {
      const { error: pErr } = await sb.from('players').insert(playerRows);
      if (pErr) throw pErr;
    }
  }

  return fetchGameById(gameId);
}

export async function addRoundRemote(gameId, teamSide, points) {
  const sb = getSupabase();
  const game = await fetchGameById(gameId);
  if (!game) throw new Error('Game not found');
  const team = teamSide === 't1' ? game.teams[0] : game.teams[1];
  if (!team?.dbId) throw new Error('Invalid team');

  const nextIdx = (game.rounds || []).length;

  const { error } = await sb.from('rounds').insert({
    game_id: gameId,
    team_id: team.dbId,
    points,
    round_index: nextIdx,
  });
  if (error) throw error;
  return fetchGameById(gameId);
}

export async function undoLastRoundRemote(gameId) {
  const sb = getSupabase();
  const { data: last, error: qErr } = await sb
    .from('rounds')
    .select('id, round_index')
    .eq('game_id', gameId)
    .order('round_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (qErr) throw qErr;
  if (!last) return fetchGameById(gameId);

  const { error: dErr } = await sb.from('rounds').delete().eq('id', last.id);
  if (dErr) throw dErr;
  return fetchGameById(gameId);
}

export async function finalizeGameRemote(gameId) {
  const sb = getSupabase();
  const game = await fetchGameById(gameId);
  if (!game || game.status !== 'live') return game;

  const sc = scoreFromRounds(game);
  if (sc.t1 < game.target && sc.t2 < game.target) return game;

  let winnerTeamDbId = null;
  if (sc.t1 > sc.t2) winnerTeamDbId = game.teams[0].dbId;
  else if (sc.t2 > sc.t1) winnerTeamDbId = game.teams[1].dbId;

  const { error } = await sb
    .from('games')
    .update({
      status: 'finished',
      finished_at: new Date().toISOString(),
      winner_team_id: winnerTeamDbId,
    })
    .eq('id', gameId)
    .eq('status', 'live');

  if (error) throw error;
  return fetchGameById(gameId);
}

export function subscribeRounds(gameId, onChange) {
  const sb = getSupabase();
  const channel = sb
    .channel(`rounds:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rounds', filter: `game_id=eq.${gameId}` },
      () => {
        fetchGameById(gameId).then(onChange).catch(() => {});
      },
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}
