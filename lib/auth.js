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
