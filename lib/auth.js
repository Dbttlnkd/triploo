// Anonymous-first Supabase auth.
//
// On first load we make sure the visitor has a Supabase session — either a
// pre-existing one stored in localStorage, or a fresh anonymous one created
// via auth.signInAnonymously(). The returned user_id is what owns events
// and games via RLS.

import { getSupabase } from './supabase.js';

/** Levé quand le projet Supabase a « Anonymous sign-ins » désactivé */
export class AnonDisabledError extends Error {
  constructor(message = 'Anonymous sign-ins are disabled.') {
    super(message);
    this.name = 'AnonDisabledError';
    this.code = 'ANON_DISABLED';
  }
}

function looksLikeAnonDisabled(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  if (error.status === 422) return true;
  return msg.includes('anonymous') && (msg.includes('disabled') || msg.includes('not allowed') || msg.includes('forbidden'));
}

/**
 * Returns the active session, creating an anonymous one if needed.
 * @returns {Promise<import('@supabase/supabase-js').Session>}
 */
export async function ensureSession() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session) return session;

  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    if (looksLikeAnonDisabled(error)) throw new AnonDisabledError(error.message);
    throw error;
  }
  return data.session;
}

export async function getCurrentUserId() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  return user?.id ?? null;
}

/**
 * Calls the join_event RPC: the caller becomes a member of the event matching
 * the provided invite token.
 * @param {string} token UUID
 * @returns {Promise<{event_id: string, event_name: string}>}
 */
export async function joinEventByToken(token) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('join_event', { p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('invalid_token');
  return row;
}

/** Returns the current user's profile row, or null if there's no session. */
export async function fetchMyProfile() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, username')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  // If the trigger hasn't created the row yet (edge case), surface a stub.
  return data ?? { id: user.id, display_name: null, username: null };
}

/** Writes the current user's display name. Requires an active session. */
export async function setMyDisplayName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('display_name_required');
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  // The trigger creates a row on signup, but be defensive: upsert.
  const { error } = await sb
    .from('profiles')
    .upsert({ id: user.id, display_name: trimmed }, { onConflict: 'id' });
  if (error) throw error;
  return trimmed;
}

/**
 * Lists the members of an event via the list_event_members RPC.
 * @returns {Promise<{userId: string, displayName: string, joinedAt: string}[]>}
 */
export async function fetchEventMembers(eventId) {
  if (!eventId) return [];
  const sb = getSupabase();
  const { data, error } = await sb.rpc('list_event_members', { p_event_id: eventId });
  if (error) throw error;
  return (data || []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name || '',
    joinedAt: row.joined_at,
  }));
}

/** Reclaim ownership of all player rows with this name in the event. */
export async function claimPlayerName(eventId, name) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('claim_player_name', {
    p_event_id: eventId,
    p_name: name,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** Release my claim on every player row I've claimed in this event. */
export async function unclaimMyPlayers(eventId) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('unclaim_my_players', { p_event_id: eventId });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
