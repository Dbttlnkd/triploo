// Triploo — App root: routing, screen orchestration, Supabase
import React from 'react';
import { DEMO_GAMES } from './app-state.jsx';
import { isSupabaseConfigured } from './lib/supabase.js';
import {
  fetchGames,
  fetchPlayerNames,
  createGameRemote,
  addRoundRemote,
  undoLastRoundRemote,
  finalizeGameRemote,
  deleteGameRemote,
  subscribeRounds,
} from './lib/games.js';
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

const NO_LIVE_GAME_QUIPS = [
  'Le cochonnet médite. Aucune partie en cours.',
  'Les boules dorment dans leurs sacoches.',
  'Pastis chaud, terrain froid : aucune partie pour le moment.',
  'Tu pointes ou tu tires ? Encore faut-il une partie.',
  'Silence radio sur le terrain.',
];

function NoLiveGameScreen({ onCreate, onBack }) {
  const quip = React.useMemo(
    () => NO_LIVE_GAME_QUIPS[Math.floor(Math.random() * NO_LIVE_GAME_QUIPS.length)],
    [],
  );
  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <div style={{ padding: '24px 18px 18px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'transparent', border: 0, color: '#949494',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.4px',
            textTransform: 'uppercase', padding: 0, cursor: 'pointer',
          }}
        >
          ← Accueil
        </button>
      </div>
      <div style={{
        padding: '0 18px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 22,
      }}>
        <Mono color="#3cffd0" size={11} tracking="1.9px">EN JEU · NIENTE</Mono>
        <Display size={56} style={{ letterSpacing: '-0.5px', lineHeight: 0.95 }}>
          Pas de partie en cours.
        </Display>
        <div style={{ fontSize: 56, lineHeight: 1 }} role="img" aria-label="boules">🎯</div>
        <p style={{
          color: '#949494', fontSize: 15, lineHeight: 1.55, fontStyle: 'italic',
          fontFamily: 'var(--font-sans)', maxWidth: 320, margin: 0,
        }}>
          « {quip} »
        </p>
        <button
          type="button"
          onClick={onCreate}
          style={{
            marginTop: 8, padding: '14px 22px', borderRadius: 30, border: 0,
            background: 'var(--jelly-mint)', color: '#000', fontFamily: 'var(--font-mono)',
            fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Lancer une partie
        </button>
      </div>
    </div>
  );
}

export function App() {
  const [route, setRoute] = React.useState({ name: 'home' });
  const [tab, setTab] = React.useState('home');
  const remote = isSupabaseConfigured();

  const [games, setGames] = React.useState(() => (remote ? [] : cloneDemoGames()));
  const [playerSuggestions, setPlayerSuggestions] = React.useState([]);
  const [loadErr, setLoadErr] = React.useState(null);

  const refreshGames = React.useCallback(async () => {
    if (!remote) return;
    try {
      const list = await fetchGames();
      setGames(list);
    } catch (e) {
      setLoadErr(e?.message || String(e));
    }
  }, [remote]);

  const refreshPlayerSuggestions = React.useCallback(async () => {
    if (!remote) return;
    try {
      const names = await fetchPlayerNames();
      setPlayerSuggestions(names);
    } catch {
      // Suggestions are best-effort — silently ignore.
    }
  }, [remote]);

  React.useEffect(() => {
    if (!remote) return;
    refreshGames();
    refreshPlayerSuggestions();
  }, [remote, refreshGames, refreshPlayerSuggestions]);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const displayGames = React.useMemo(() => {
    if (remote) return games;
    return games.map((g) => ({ ...g, target: WIN_THRESHOLD || g.target }));
  }, [games, remote]);

  const liveGame = displayGames.find((g) => g.status === 'live');

  const nextGameName = React.useMemo(() => {
    let max = 0;
    for (const g of displayGames) {
      const m = String(g.name || '').match(/^Partie #(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    return `Partie #${max + 1}`;
  }, [displayGames]);

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
    else if (t === 'live') go(liveGame ? { name: 'live', gameId: liveGame.id } : { name: 'live' });
    else if (t === 'photo') go({ name: 'photo' });
    else if (t === 'stats') go({ name: 'stats' });
  };

  const handleCreate = async (payload) => {
    if (remote) {
      try {
        const g = await createGameRemote(payload);
        setGames((prev) => [g, ...prev.filter((x) => x.id !== g.id)]);
        refreshPlayerSuggestions();
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

  const handleDeleteGame = async (gameId) => {
    if (!gameId) return;
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cette partie ? Les mènes et les joueurs liés seront aussi effacés.')) return;
    if (remote) {
      try {
        await deleteGameRemote(gameId);
      } catch (e) {
        setLoadErr(e?.message || String(e));
        return;
      }
    }
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setRoute((r) => (r.gameId === gameId ? { name: 'home' } : r));
    setTab((current) => (route.name === 'live' && route.gameId === gameId ? 'home' : current));
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
          onDelete={handleDeleteGame}
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
          playerSuggestions={playerSuggestions}
          defaultName={nextGameName}
        />
      );
      break;
    case 'live': {
      const g = route.gameId ? resolveGame(route.gameId) : null;
      if (g) {
        content = (
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
        );
      } else {
        content = (
          <NoLiveGameScreen
            onCreate={() => go({ name: 'create' })}
            onBack={() => { setTab('home'); go({ name: 'home' }); }}
          />
        );
      }
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
      content = <StatsScreen lang={LANG} games={displayGames}/>;
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
        width: '100%', maxWidth: 480, margin: '0 auto',
        minHeight: '100dvh',
        paddingBottom: noTabs
          ? 'env(safe-area-inset-bottom)'
          : 'calc(72px + env(safe-area-inset-bottom))',
      }}>
        {content}
      </main>
      {!noTabs && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
          background: 'var(--canvas-black)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <TabBar active={tab} onChange={onTab} lang={LANG}/>
          </div>
        </div>
      )}
    </div>
  );
}
