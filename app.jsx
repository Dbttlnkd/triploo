// Triploo — App root: routing, screen orchestration, Supabase
import React from 'react';
import { DEMO_GAMES } from './app-state.jsx';
import { getSupabase, isSupabaseConfigured } from './lib/supabase.js';
import {
  fetchGamesForUser,
  createGameRemote,
  addRoundRemote,
  undoLastRoundRemote,
  finalizeGameRemote,
  subscribeRounds,
} from './lib/games.js';
import {
  signInWithUsername,
  signUpWithUsername,
  validateUsername,
} from './lib/auth.js';
import { Mono, Display, TabBar } from './ui-kit.jsx';
import { HomeScreen, CreateScreen, StatsScreen } from './screen-home.jsx';
import { LiveScreen } from './screen-live.jsx';
import { SpectatorScreen, PhotoScreen } from './screen-extras.jsx';

const LANG = 'fr';
const WIN_THRESHOLD = 13;
const SCORING_LAYOUT = 'split';

function cloneDemoGames() {
  return DEMO_GAMES.map((g) => ({
    ...g,
    teams: g.teams.map((t) => ({ ...t, players: [...(t.players || [])] })),
    rounds: [...(g.rounds || [])],
  }));
}

export function App() {
  const [route, setRoute] = React.useState({ name: 'home' });
  const [tab, setTab] = React.useState('home');
  const remote = isSupabaseConfigured();

  const [games, setGames] = React.useState(() => (remote ? [] : cloneDemoGames()));
  const [loadErr, setLoadErr] = React.useState(null);
  const [authPhase, setAuthPhase] = React.useState(() => (remote ? 'checking' : 'ready'));
  const [authMode, setAuthMode] = React.useState('signin');
  const [usernameInput, setUsernameInput] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState('');
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authErr, setAuthErr] = React.useState(null);

  const refreshGames = React.useCallback(async () => {
    if (!remote) return;
    const list = await fetchGamesForUser();
    setGames(list);
  }, [remote]);

  React.useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    const sb = getSupabase();

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthPhase('ready');
        setAuthErr(null);
        setPasswordInput('');
        refreshGames();
      } else {
        setAuthPhase('need_login');
      }
    });

    (async () => {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (cancelled) return;
        if (session) {
          setAuthPhase('ready');
          await refreshGames();
          return;
        }
        setAuthPhase('need_login');
      } catch (e) {
        if (cancelled) return;
        setLoadErr(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [remote, refreshGames]);

  const handleAuthSubmit = async (e) => {
    e?.preventDefault?.();
    setAuthErr(null);

    const u = usernameInput.trim().toLowerCase();
    const formatErr = validateUsername(u);
    if (formatErr) {
      setAuthErr(formatErr);
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      setAuthErr('Mot de passe : 6 caractères minimum');
      return;
    }

    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        await signUpWithUsername(u, passwordInput);
      } else {
        await signInWithUsername(u, passwordInput);
      }
    } catch (err) {
      setAuthErr(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const switchAuthMode = (next) => {
    setAuthMode(next);
    setAuthErr(null);
  };

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const displayGames = React.useMemo(() => {
    if (remote) return games;
    return games.map((g) => ({ ...g, target: WIN_THRESHOLD || g.target }));
  }, [games, remote]);

  const liveGame = displayGames.find((g) => g.status === 'live');

  React.useEffect(() => {
    if (!remote || route.name !== 'live' || !route.gameId) return undefined;
    const off = subscribeRounds(route.gameId, (g) => {
      if (!g) return;
      setGames((prev) => prev.map((x) => (x.id === g.id ? g : x)));
    });
    return off;
  }, [remote, route.name, route.gameId]);

  const go = (r) => setRoute(r);

  const onTab = (t) => {
    setTab(t);
    if (t === 'home') go({ name: 'home' });
    else if (t === 'live' && liveGame) go({ name: 'live', gameId: liveGame.id });
    else if (t === 'photo') go({ name: 'photo' });
    else if (t === 'stats') go({ name: 'stats' });
  };

  const handleCreate = async (payload) => {
    if (remote) {
      try {
        const g = await createGameRemote(payload);
        setGames((prev) => [g, ...prev.filter((x) => x.id !== g.id)]);
        go({ name: 'live', gameId: g.id });
      } catch (e) {
        setLoadErr(e?.message || String(e));
      }
      return;
    }
    const id = `local-${Date.now()}`;
    const newG = {
      id,
      name: payload.name,
      place: payload.place,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
      format: payload.formatUi,
      target: payload.target,
      best_of: payload.bestOf,
      status: 'live',
      teams: [
        { id: 't1', name: payload.teamA.name, color: payload.teamA.color, players: payload.teamA.players },
        { id: 't2', name: payload.teamB.name, color: payload.teamB.color, players: payload.teamB.players },
      ],
      rounds: [],
      spectators: 0,
      startedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setGames((prev) => [newG, ...prev]);
    go({ name: 'live', gameId: id });
  };

  const handleAddRound = async (gameId, side, points) => {
    if (remote) {
      const g = await addRoundRemote(gameId, side, points);
      setGames((prev) => prev.map((x) => (x.id === g.id ? g : x)));
      return;
    }
    setGames((prev) => prev.map((g) => (g.id !== gameId ? g : {
      ...g,
      rounds: [...(g.rounds || []), { team: side, points }],
    })));
  };

  const handleUndoRound = async (gameId) => {
    if (remote) {
      const g = await undoLastRoundRemote(gameId);
      setGames((prev) => prev.map((x) => (x.id === g.id ? g : x)));
      return;
    }
    setGames((prev) => prev.map((g) => {
      if (g.id !== gameId) return g;
      const r = [...(g.rounds || [])];
      r.pop();
      return { ...g, rounds: r };
    }));
  };

  const handleGameFinished = async (gameId, score) => {
    if (remote) {
      const g = await finalizeGameRemote(gameId);
      if (g) setGames((prev) => prev.map((x) => (x.id === g.id ? g : x)));
      return;
    }
    setGames((prev) => prev.map((g) => {
      if (g.id !== gameId) return g;
      const winner = score.t1 > score.t2 ? 't1' : 't2';
      return {
        ...g,
        status: 'archived',
        winner,
        finalScore: [score.t1, score.t2],
      };
    }));
  };

  const resolveGame = (id) => displayGames.find((x) => x.id === id);

  let content = null;
  switch (route.name) {
    case 'home':
      content = (
        <HomeScreen
          games={displayGames}
          onOpen={(id) => {
            const g = resolveGame(id);
            if (!g) return;
            go(g.status === 'live' ? { name: 'live', gameId: id } : { name: 'spectator', gameId: id });
          }}
          onNew={() => go({ name: 'create' })}
          lang={LANG}
        />
      );
      break;
    case 'create':
      content = (
        <CreateScreen
          onCancel={() => go({ name: 'home' })}
          onCreate={handleCreate}
          lang={LANG}
        />
      );
      break;
    case 'live': {
      const g = resolveGame(route.gameId);
      content = g ? (
        <LiveScreen
          game={g}
          onBack={() => { setTab('home'); go({ name: 'home' }); }}
          onShare={() => go({ name: 'spectator', gameId: g.id })}
          layout={SCORING_LAYOUT}
          lang={LANG}
          onAddRound={(side, pts) => handleAddRound(g.id, side, pts)}
          onUndoRound={() => handleUndoRound(g.id)}
          onGameFinished={(id, sc) => handleGameFinished(id, sc)}
        />
      ) : (
        <Mono color="#949494" style={{ padding: 24 }}>Partie introuvable.</Mono>
      );
      break;
    }
    case 'spectator': {
      const g = resolveGame(route.gameId);
      content = g ? (
        <SpectatorScreen game={g} onBack={() => { setTab('home'); go({ name: 'home' }); }}/>
      ) : null;
      break;
    }
    case 'photo':
      content = <PhotoScreen onBack={() => { setTab('home'); go({ name: 'home' }); }}/>;
      break;
    case 'stats':
      content = <StatsScreen lang={LANG}/>;
      break;
    default:
      content = <HomeScreen games={displayGames} onOpen={() => {}} onNew={() => {}} lang={LANG}/>;
  }

  const noTabs = ['live', 'create', 'spectator'].includes(route.name);

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      background: '#070707',
    }}>
      {remote && authPhase !== 'ready' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,7,7,0.92)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 50, padding: 24,
        }}>
          {authPhase === 'checking' && (
            <Mono color="#fff">Connexion…</Mono>
          )}
          {authPhase === 'need_login' && (
            <form
              onSubmit={handleAuthSubmit}
              style={{
                maxWidth: 400, width: '100%', background: '#131313', border: '1px solid #309875',
                borderRadius: 24, padding: '28px 24px', color: '#fff',
              }}
            >
              <Display size={26} style={{ letterSpacing: '-0.5px' }}>
                {authMode === 'signup' ? 'Créer un compte' : 'Connexion Triploo'}
              </Display>
              <p style={{ color: '#949494', fontSize: 14, lineHeight: 1.55, marginTop: 14 }}>
                {authMode === 'signup'
                  ? 'Choisis un username unique et un mot de passe.'
                  : 'Connecte-toi avec ton username et ton mot de passe.'}
              </p>

              <label style={{ display: 'block', marginTop: 18 }}>
                <Mono color="#949494" size={10} tracking="1.2px">USERNAME</Mono>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="ex. lulu_ptq"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={20}
                  style={{
                    display: 'block', width: '100%', marginTop: 8, padding: '12px 14px',
                    borderRadius: 12, border: '1px solid #fff', background: '#070707', color: '#fff',
                    fontSize: 16, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginTop: 14 }}>
                <Mono color="#949494" size={10} tracking="1.2px">MOT DE PASSE</Mono>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="6 caractères minimum"
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  style={{
                    display: 'block', width: '100%', marginTop: 8, padding: '12px 14px',
                    borderRadius: 12, border: '1px solid #fff', background: '#070707', color: '#fff',
                    fontSize: 16, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </label>

              {authErr && (
                <Mono color="#ff5e5e" size={12} style={{ marginTop: 14, display: 'block', lineHeight: 1.5 }}>
                  {authErr}
                </Mono>
              )}

              <button
                type="submit"
                disabled={authBusy}
                style={{
                  marginTop: 18, width: '100%', padding: '14px 18px', borderRadius: 30, border: 0,
                  background: 'var(--jelly-mint)', color: '#000', fontFamily: 'var(--font-mono)',
                  fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
                  cursor: authBusy ? 'wait' : 'pointer', opacity: authBusy ? 0.7 : 1,
                }}
              >
                {authBusy
                  ? '…'
                  : authMode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
              </button>

              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => switchAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                  style={{
                    background: 'transparent', border: 0, color: '#3cffd0',
                    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1px',
                    textTransform: 'uppercase', cursor: 'pointer', padding: 4,
                  }}
                >
                  {authMode === 'signup' ? 'J’ai déjà un compte' : 'Créer un compte'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {loadErr && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
          background: '#5200ff', color: '#fff', padding: '10px 16px', borderRadius: 12, maxWidth: 360,
          fontSize: 13,
        }}>
          {loadErr}
        </div>
      )}
      <main style={{
        flex: 1, width: '100%', maxWidth: 480, margin: '0 auto',
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {content}
        </div>
        {!noTabs && (
          <div style={{ flexShrink: 0, paddingBottom: 18 }}>
            <TabBar active={tab} onChange={onTab} lang={LANG}/>
          </div>
        )}
        {noTabs && <div style={{ flexShrink: 0, height: 18 }}/>}
      </main>
    </div>
  );
}
