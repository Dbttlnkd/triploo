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

// ────────────── Account upgrade (anon → permanent) ──────────────

const USERNAME_DOMAIN = 'triploo.app';
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function validateUsername(username) {
  if (!username) return 'Pseudo requis';
  if (typeof username !== 'string') return 'Pseudo invalide';
  if (!USERNAME_REGEX.test(username)) {
    return '3 à 20 caractères : lettres minuscules, chiffres ou underscore';
  }
  return null;
}

function usernameToEmail(username) {
  return `${username.toLowerCase()}@${USERNAME_DOMAIN}`;
}

/** Returns true if a username is still available. Uses the existing
 *  is_username_available RPC. */
export async function isUsernameAvailable(username) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('is_username_available', { p_username: username });
  if (error) throw error;
  return data === true;
}

function isValidEmail(s) {
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Converts the current anonymous session into a permanent account.
 * The auth user_id is preserved — events, games and player claims follow.
 *
 * @param {string} username
 * @param {string} password
 * @param {string} [recoveryEmail] optional real email used as the auth
 *   identifier; if omitted, the synthetic <pseudo>@triploo.app is used.
 */
export async function upgradeToUsername(username, password, recoveryEmail = '') {
  const formatErr = validateUsername(username);
  if (formatErr) throw new Error(formatErr);
  if (!password || password.length < 6) {
    throw new Error('Mot de passe : 6 caractères minimum');
  }
  const trimmedEmail = (recoveryEmail || '').trim();
  if (trimmedEmail && !isValidEmail(trimmedEmail)) {
    throw new Error('Email invalide');
  }

  const normalized = username.toLowerCase();
  const available = await isUsernameAvailable(normalized);
  if (!available) throw new Error('Ce pseudo est déjà pris');

  const sb = getSupabase();
  const authEmail = trimmedEmail || usernameToEmail(normalized);
  const { data, error } = await sb.auth.updateUser({
    email: authEmail,
    password,
    data: { username: normalized },
  });
  if (error) {
    if (error.message?.toLowerCase().includes('already')) {
      throw new Error('Ce pseudo ou cet email est déjà pris');
    }
    throw error;
  }

  // Mirror the username into profiles so SELECTs see it without waiting on
  // the trigger. The trigger fires only on auth.users insert, not update.
  const userId = data?.user?.id;
  if (userId) {
    await sb.from('profiles').update({ username: normalized }).eq('id', userId);
  }
  return data?.user || null;
}

async function lookupEmailForUsername(username) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('get_email_for_username', { p_username: username });
  if (error) return null;
  return typeof data === 'string' ? data : null;
}

/**
 * Sign in an existing account on a new device. The current anonymous
 * session is replaced. Tries the synthetic email first (for accounts
 * upgraded without a recovery email), falls back to looking up the
 * real email via the get_email_for_username RPC.
 */
export async function signInWithExistingUsername(username, password) {
  if (!username || !password) throw new Error('Pseudo et mot de passe requis');
  const sb = getSupabase();
  const normalized = username.toLowerCase();

  const trySignIn = async (email) => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // First, try the synthetic email (cheap, no extra RPC).
  let res = await trySignIn(usernameToEmail(normalized));
  if (res.error) {
    // Maybe this account was created with a real recovery email — look it up.
    const realEmail = await lookupEmailForUsername(normalized);
    if (realEmail && realEmail !== usernameToEmail(normalized)) {
      res = await trySignIn(realEmail);
    }
  }
  if (res.error) throw new Error('Pseudo ou mot de passe incorrect');
  return res.data;
}

/**
 * Send a password reset email. The caller may pass either a username or an
 * email. Returns { sent, target } where target is the email the link was
 * sent to (useful for the UI: "Email envoyé à al***@gmail.com").
 */
export async function requestPasswordReset(usernameOrEmail) {
  const raw = (usernameOrEmail || '').trim();
  if (!raw) throw new Error('Indique ton pseudo ou ton email.');

  let email = null;
  if (isValidEmail(raw)) {
    email = raw;
  } else {
    email = await lookupEmailForUsername(raw.toLowerCase());
  }

  if (!email) {
    throw new Error('Aucun compte trouvé pour ce pseudo.');
  }

  // Synthetic emails can't receive — abort early with a clear message.
  if (email.endsWith(`@${USERNAME_DOMAIN}`)) {
    throw new Error("Ce compte n'a pas d'email de récupération. Demande à un administrateur Triploo de réinitialiser ton mot de passe.");
  }

  const sb = getSupabase();
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return { sent: true, target: email };
}

export async function updateMyPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mot de passe : 6 caractères minimum');
  }
  const sb = getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
}

export async function signOut() {
  const sb = getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

/** True if the current user has an email (i.e. not an anonymous session). */
export async function isPermanentAccount() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  // Anonymous users in Supabase have is_anonymous=true. Fallback: no email.
  if (typeof user.is_anonymous === 'boolean') return !user.is_anonymous;
  return Boolean(user.email);
}
