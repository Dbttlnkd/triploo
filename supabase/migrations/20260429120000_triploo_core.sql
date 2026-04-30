-- Triploo — schéma Supabase (Postgres)
-- Exécuter via Supabase Dashboard → SQL Editor, ou : supabase db push

-- ─── Extensions (gen_random_uuid est natif PG14+ ; pgcrypto si besoin) ───
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Types ───
CREATE TYPE public.game_format AS ENUM (
  'tete_a_tete',
  'doublette',
  'triplette'
);

CREATE TYPE public.game_status AS ENUM (
  'draft',
  'live',
  'finished',
  'cancelled'
);

CREATE TYPE public.team_color AS ENUM (
  'mint',
  'violet',
  'yellow',
  'pink',
  'orange',
  'electric',
  'white'
);

-- ─── Profils (1:1 auth.users, affichage & stats futures) ───
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Parties ───
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  place text,
  format public.game_format NOT NULL DEFAULT 'doublette',
  target smallint NOT NULL DEFAULT 13 CHECK (target IN (11, 13, 15, 21)),
  best_of smallint CHECK (best_of IS NULL OR best_of > 0),
  status public.game_status NOT NULL DEFAULT 'draft',
  started_at timestamptz,
  finished_at timestamptz,
  winner_team_id uuid,
  spectator_count integer NOT NULL DEFAULT 0 CHECK (spectator_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX games_owner_id_idx ON public.games (owner_id);
CREATE INDEX games_status_idx ON public.games (status);
CREATE INDEX games_created_at_idx ON public.games (created_at DESC);

-- ─── Équipes (2 par partie dans le MVP) ───
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  name text NOT NULL,
  color public.team_color NOT NULL,
  position smallint NOT NULL CHECK (position IN (1, 2)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, position)
);

CREATE INDEX teams_game_id_idx ON public.teams (game_id);

-- FK différé : gagnant référence une ligne teams
ALTER TABLE public.games
  ADD CONSTRAINT games_winner_team_id_fkey
  FOREIGN KEY (winner_team_id) REFERENCES public.teams (id) ON DELETE SET NULL;

-- ─── Joueurs (noms affichés ; liaison compte optionnelle) ───
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX players_team_id_idx ON public.players (team_id);
CREATE INDEX players_user_id_idx ON public.players (user_id) WHERE user_id IS NOT NULL;

-- ─── Mènes (points par équipe, ordre strict) ───
CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  points smallint NOT NULL CHECK (points >= 1 AND points <= 6),
  round_index integer NOT NULL CHECK (round_index >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, round_index)
);

CREATE INDEX rounds_game_id_idx ON public.rounds (game_id);
CREATE INDEX rounds_game_round_idx ON public.rounds (game_id, round_index);

-- PG n’autorise pas les sous-requêtes dans CHECK : validation via trigger
CREATE OR REPLACE FUNCTION public.rounds_validate_team_game()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = NEW.team_id AND t.game_id = NEW.game_id
  ) THEN
    RAISE EXCEPTION 'rounds: team_id % does not belong to game_id %', NEW.team_id, NEW.game_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rounds_validate_team_game_trigger
  BEFORE INSERT OR UPDATE OF game_id, team_id ON public.rounds
  FOR EACH ROW EXECUTE PROCEDURE public.rounds_validate_team_game();

-- ─── Accès spectateurs (lien partagé = token UUID) ───
CREATE TABLE public.spectator_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  label text,
  email text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX spectator_access_game_id_idx ON public.spectator_access (game_id);
CREATE INDEX spectator_access_token_idx ON public.spectator_access (token);

-- ─── Analyses « Qui pointe ? » (Claude Vision / stockage image) ───
CREATE TABLE public.photo_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games (id) ON DELETE SET NULL,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  storage_path text,
  prompt_version text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photo_analyses_game_id_idx ON public.photo_analyses (game_id);
CREATE INDEX photo_analyses_owner_id_idx ON public.photo_analyses (owner_id);

-- ─── updated_at automatique ───
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER games_set_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── Profil créé à l’inscription ───
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── RPC : lecture partie pour un token spectateur (anon OK) ───
CREATE OR REPLACE FUNCTION public.get_game_bundle_for_spectator(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.games%ROWTYPE;
  gid uuid;
BEGIN
  SELECT sa.game_id INTO gid
  FROM public.spectator_access sa
  WHERE sa.token = p_token
    AND (sa.expires_at IS NULL OR sa.expires_at > now())
  LIMIT 1;

  IF gid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO g FROM public.games WHERE id = gid;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'game', to_jsonb(g),
    'teams', COALESCE((SELECT jsonb_agg(to_jsonb(t.*) ORDER BY t.position) FROM public.teams t WHERE t.game_id = gid), '[]'::jsonb),
    'players', COALESCE((SELECT jsonb_agg(to_jsonb(p.*)) FROM public.players p JOIN public.teams t ON t.id = p.team_id WHERE t.game_id = gid), '[]'::jsonb),
    'rounds', COALESCE((SELECT jsonb_agg(to_jsonb(r.*) ORDER BY r.round_index) FROM public.rounds r WHERE r.game_id = gid), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_game_bundle_for_spectator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_game_bundle_for_spectator(uuid) TO anon, authenticated;

-- ─── RLS ───
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spectator_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_analyses ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- games — propriétaire
CREATE POLICY "games_owner_all"
  ON public.games FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- teams
CREATE POLICY "teams_via_game_owner"
  ON public.teams FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = teams.game_id AND g.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = teams.game_id AND g.owner_id = auth.uid())
  );

-- players
CREATE POLICY "players_via_game_owner"
  ON public.players FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.games g ON g.id = t.game_id
      WHERE t.id = players.team_id AND g.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.games g ON g.id = t.game_id
      WHERE t.id = players.team_id AND g.owner_id = auth.uid()
    )
  );

-- rounds
CREATE POLICY "rounds_via_game_owner"
  ON public.rounds FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = rounds.game_id AND g.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = rounds.game_id AND g.owner_id = auth.uid())
  );

-- spectator_access — seul le propriétaire du jeu gère les liens
CREATE POLICY "spectator_access_owner"
  ON public.spectator_access FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = spectator_access.game_id AND g.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = spectator_access.game_id AND g.owner_id = auth.uid())
  );

-- photo_analyses
CREATE POLICY "photo_analyses_owner"
  ON public.photo_analyses FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─── Realtime (scores / mènes en direct) ───
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;

-- ─── Commentaires (documentation dans Supabase) ───
COMMENT ON TABLE public.games IS 'Partie de pétanque : statut, objectif, lien gagnant';
COMMENT ON TABLE public.teams IS 'Deux équipes par partie (position 1 ou 2)';
COMMENT ON TABLE public.players IS 'Joueurs affichés ; user_id optionnel si compte relié';
COMMENT ON TABLE public.rounds IS 'Historique des mènes : points 1–6 par équipe';
COMMENT ON TABLE public.spectator_access IS 'Jeton UUID pour lien spectateur ; lecture via get_game_bundle_for_spectator';
COMMENT ON TABLE public.photo_analyses IS 'Résultats JSON analyse image « Qui pointe ? »';
