// lib/auth.js
// Auth username-only pour Triploo.
// On utilise Supabase Auth en mode email/password classique, mais l'email
// est synthétisé à partir du username (jamais affiché à l'utilisateur).
//
// Format username : 3-20 caractères, lettres minuscules, chiffres, underscore.
// La contrainte est aussi appliquée côté DB (CHECK + UNIQUE sur profiles.username).

import { getSupabase } from './supabase.js';

const USERNAME_DOMAIN = 'triploo.app';
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

/**
 * Valide le format d'un username côté client.
 * @param {string} username
 * @returns {string|null} Message d'erreur ou null si valide.
 */
export function validateUsername(username) {
  if (!username) return 'Username requis';
  if (typeof username !== 'string') return 'Username invalide';
  if (!USERNAME_REGEX.test(username)) {
    return '3 à 20 caractères : lettres minuscules, chiffres ou underscore';
  }
  return null;
}

/**
 * Vérifie si un username est disponible (RPC Supabase).
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export async function isUsernameAvailable(username) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: username,
  });
  if (error) {
    console.error('is_username_available error', error);
    throw new Error('Impossible de vérifier la disponibilité du username');
  }
  return data === true;
}

/**
 * Convertit un username en email synthétique pour Supabase Auth.
 */
function usernameToEmail(username) {
  return `${username.toLowerCase()}@${USERNAME_DOMAIN}`;
}

/**
 * Inscription avec username + mot de passe.
 * Le profile public.profiles est créé automatiquement par trigger DB.
 */
export async function signUpWithUsername(username, password) {
  const formatError = validateUsername(username);
  if (formatError) throw new Error(formatError);

  if (!password || password.length < 6) {
    throw new Error('Mot de passe : 6 caractères minimum');
  }

  const normalized = username.toLowerCase();

  const available = await isUsernameAvailable(normalized);
  if (!available) throw new Error('Ce username est déjà pris');

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(normalized),
    password,
    options: {
      data: { username: normalized },
    },
  });

  if (error) {
    if (error.message?.toLowerCase().includes('already registered')) {
      throw new Error('Ce username est déjà pris');
    }
    throw error;
  }

  return data;
}

/**
 * Connexion avec username + mot de passe.
 */
export async function signInWithUsername(username, password) {
  if (!username || !password) {
    throw new Error('Username et mot de passe requis');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username.toLowerCase()),
    password,
  });

  if (error) {
    throw new Error('Username ou mot de passe incorrect');
  }
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Récupère le username du user connecté depuis profiles.
 * @returns {Promise<string|null>}
 */
export async function getCurrentUsername() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getCurrentUsername error', error);
    return null;
  }
  return data?.username ?? null;
}
