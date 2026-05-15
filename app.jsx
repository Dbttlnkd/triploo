// Triploo — App root: routing, screen orchestration, Supabase
import React from 'react';
import { DEMO_GAMES } from './app-state.jsx';
import { isSupabaseConfigured, getSupabase } from './lib/supabase.js';
import { ensureSession, joinEventByToken, AnonDisabledError } from './lib/auth.js';
import {
  fetchGames,
  fetchPlayerNames,
  fetchEvents,
  createGameRemote,
  createEventRemote,
  deleteEventRemote,
  finalizeEventRemote,
  addRoundRemote,
  undoLastRoundRemote,
  finalizeGameRemote,
  deleteGameRemote,
  subscribeRounds,
  subscribeEvent,
  subscribeAll,
} from './lib/games.js';
import { Mono, Display, TabBar } from './ui-kit.jsx';
import { HomeScreen, CreateScreen, StatsScreen } from './screen-home.jsx';
import { LiveScreen } from './screen-live.jsx';
import { SpectatorScreen, PhotoScreen } from './screen-extras.jsx';
import { CreateEventScreen, EventDetailScreen } from './screen-events.jsx';

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

function NoLiveGameScreen({ onCreate }) {
  const quip = React.useMemo(
    () => NO_LIVE_GAME_QUIPS[Math.floor(Math.random() * NO_LIVE_GAME_QUIPS.length)],
    [],
  );
  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <div style={{
        padding: '32px 18px 24px',
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
  const [events, setEvents] = React.useState([]);
  const [eventsLoaded, setEventsLoaded] = React.useState(false);
  const [gamesLoaded, setGamesLoaded] = React.useState(!remote);
  const [authReady, setAuthReady] = React.useState(!remote);
  const [authError, setAuthError] = React.useState(null);
  const [playerSuggestions, setPlayerSuggestions] = React.useState([]);
  const [loadErr, setLoadErr] = React.useState(null);
  const [pendingDeepLink, setPendingDeepLink] = React.useState(() => {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    const ev = p.get('event');
    const gm = p.get('game');
    const tk = p.get('token');
    if (ev) return { type: 'event', id: ev, token: tk };
    if (gm) return { type: 'game', id: gm };
    return null;
  });

  const refreshGames = React.useCallback(async () => {
    if (!remote) return;
    try {
      const list = await fetchGames();
      setGames(list);
      setGamesLoaded(true);
    } catch (e) {
      setLoadErr(e?.message || String(e));
    }
  }, [remote]);

  const refreshEvents = React.useCallback(async () => {
    if (!remote) return;
    try {
      const list = await fetchEvents();
      setEvents(list);
      setEventsLoaded(true);
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

  // Auth boot: anonymous Supabase session + opportunistic join_event if the
  // landing URL carries an invite token.
  React.useEffect(() => {
    if (!remote) return undefined;
    let cancelled = false;

    (async () => {
      try {
        await ensureSession();
      } catch (e) {
        if (cancelled) return;
        if (e instanceof AnonDisabledError) {
          setAuthError("Active « Anonymous Sign-Ins » dans Supabase → Authentication → Providers.");
        } else {
          setAuthError(e?.message || String(e));
        }
        return;
      }

      // Try to redeem the invite token before loading lists so the joined
      // event shows up in the very first fetchEvents() roundtrip.
      if (pendingDeepLink?.type === 'event' && pendingDeepLink.token) {
        try {
          await joinEventByToken(pendingDeepLink.token);
        } catch (e) {
          // Bad token = the visitor still lands; they just won't see the
          // event. Surface the error in the toast slot for visibility.
          setLoadErr("Lien d'invitation invalide ou expiré.");
        }
      }

      if (cancelled) return;
      setAuthReady(true);
      refreshGames();
      refreshEvents();
      refreshPlayerSuggestions();
    })();

    return () => { cancelled = true; };
    // pendingDeepLink intentionally not in deps: this runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote, refreshGames, refreshEvents, refreshPlayerSuggestions]);

  // Auth state change listener: refresh when the session changes (rare in
  // this app, but useful if/when we add an "upgrade to username" flow).
  React.useEffect(() => {
    if (!remote) return undefined;
    const sb = getSupabase();
    const { data: { subscription } } = sb.auth.onAuthStateChange(() => {
      refreshGames();
      refreshEvents();
    });
    return () => subscription?.unsubscribe?.();
  }, [remote, refreshGames, refreshEvents]);

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

  const nextEventName = React.useMemo(() => {
    let max = 0;
    for (const e of events) {
      const m = String(e.name || '').match(/^Événement #(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    return `Événement #${max + 1}`;
  }, [events]);

  // App-wide realtime: keep events + games lists fresh on every screen.
  // Postgres realtime respects RLS, so the callback only fires for rows
  // the current anon session can already SELECT.
  React.useEffect(() => {
    if (!remote || !authReady) return undefined;
    let timer = null;
    const debouncedRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        refreshGames();
        refreshEvents();
      }, 300);
    };
    const off = subscribeAll(debouncedRefresh);
    return () => {
      if (timer) clearTimeout(timer);
      off();
    };
  }, [remote, authReady, refreshGames, refreshEvents]);

  React.useEffect(() => {
    if (!remote || route.name !== 'event-detail' || !route.eventId) return undefined;
    const off = subscribeEvent(route.eventId, () => {
      refreshGames();
      refreshEvents();
    });
    return off;
  }, [remote, route.name, route.eventId, refreshGames, refreshEvents]);

  // Resolve ?event= / ?game= deep links once the relevant collection has loaded.
  React.useEffect(() => {
    if (!pendingDeepLink) return;
    if (pendingDeepLink.type === 'event' && !eventsLoaded) return;
    if (pendingDeepLink.type === 'game' && !gamesLoaded) return;

    if (pendingDeepLink.type === 'event') {
      const ev = events.find((e) => e.id === pendingDeepLink.id);
      if (ev) setRoute({ name: 'event-detail', eventId: ev.id });
    } else if (pendingDeepLink.type === 'game') {
      const g = games.find((x) => x.id === pendingDeepLink.id);
      if (g) {
        setRoute(g.status === 'live'
          ? { name: 'live', gameId: g.id }
          : { name: 'spectator', gameId: g.id });
      }
    }
    setPendingDeepLink(null);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const u = new URL(window.location.href);
      u.searchParams.delete('event');
      u.searchParams.delete('game');
      window.history.replaceState({}, '', u.pathname + (u.search ? '?' + u.searchParams.toString() : '') + u.hash);
    }
  }, [pendingDeepLink, eventsLoaded, gamesLoaded, events, games]);

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
      eventId: payload.eventId || null,
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

  const handleCreateEvent = async ({ name, place }) => {
    if (!remote) {
      const id = `local-event-${Date.now()}`;
      const ev = { id, name, place, status: 'live', startedAt: '', date: '', started_at: null, finished_at: null, created_at: new Date().toISOString() };
      setEvents((prev) => [ev, ...prev]);
      go({ name: 'event-detail', eventId: id });
      return;
    }
    try {
      const ev = await createEventRemote({ name, place });
      setEvents((prev) => [ev, ...prev.filter((x) => x.id !== ev.id)]);
      go({ name: 'event-detail', eventId: ev.id });
    } catch (e) {
      setLoadErr(e?.message || String(e));
      throw e;
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!eventId) return;
    if (typeof window !== 'undefined' && !window.confirm("Supprimer l'événement ? Les parties associées seront détachées (pas supprimées).")) return;
    if (remote) {
      try {
        await deleteEventRemote(eventId);
      } catch (e) {
        setLoadErr(e?.message || String(e));
        return;
      }
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setGames((prev) => prev.map((g) => (g.eventId === eventId ? { ...g, eventId: null } : g)));
    setRoute((r) => (r.name === 'event-detail' && r.eventId === eventId ? { name: 'home' } : r));
  };

  const handleFinishEvent = async (eventId) => {
    if (!eventId) return;
    if (!remote) {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status: 'archived', finished_at: new Date().toISOString() } : e)));
      return;
    }
    try {
      const ev = await finalizeEventRemote(eventId);
      if (ev) setEvents((prev) => prev.map((e) => (e.id === ev.id ? ev : e)));
    } catch (e) {
      setLoadErr(e?.message || String(e));
    }
  };

  const resolveGame = (id) => displayGames.find((x) => x.id === id);
  const resolveEvent = (id) => events.find((e) => e.id === id);

  let content = null;
  switch (route.name) {
    case 'home':
      content = (
        <HomeScreen
          games={displayGames}
          events={events}
          onOpen={(id) => {
            const g = resolveGame(id);
            if (!g) return;
            go(g.status === 'live' ? { name: 'live', gameId: id } : { name: 'spectator', gameId: id });
          }}
          onNew={() => go({ name: 'create' })}
          onDelete={handleDeleteGame}
          onOpenEvent={(id) => go({ name: 'event-detail', eventId: id })}
          onCreateEvent={() => go({ name: 'event-create' })}
          onDeleteEvent={handleDeleteEvent}
          lang={LANG}
        />
      );
      break;
    case 'create':
      content = (
        <CreateScreen
          onCancel={() => go(route.eventId ? { name: 'event-detail', eventId: route.eventId } : { name: 'home' })}
          onCreate={handleCreate}
          lang={LANG}
          playerSuggestions={playerSuggestions}
          defaultName={nextGameName}
          events={events}
          defaultEventId={route.eventId || null}
          eventLocked={Boolean(route.eventId)}
        />
      );
      break;
    case 'event-create':
      content = (
        <CreateEventScreen
          onCancel={() => go({ name: 'home' })}
          onCreate={handleCreateEvent}
          defaultName={nextEventName}
        />
      );
      break;
    case 'event-detail': {
      const ev = resolveEvent(route.eventId);
      if (!ev) {
        content = (
          <Mono color="#949494" style={{ padding: 24 }}>Événement introuvable.</Mono>
        );
        break;
      }
      const eventGames = displayGames.filter((g) => g.eventId === ev.id);
      content = (
        <EventDetailScreen
          event={ev}
          games={eventGames}
          onBack={() => go({ name: 'home' })}
          onAddGame={() => go({ name: 'create', eventId: ev.id })}
          onOpenGame={(g) => go(g.status === 'live'
            ? { name: 'live', gameId: g.id }
            : { name: 'spectator', gameId: g.id })}
          onDeleteGame={handleDeleteGame}
          onFinishEvent={() => handleFinishEvent(ev.id)}
          onDeleteEvent={() => handleDeleteEvent(ev.id)}
        />
      );
      break;
    }
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
          <NoLiveGameScreen onCreate={() => go({ name: 'create' })}/>
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
      content = <PhotoScreen/>;
      break;
    case 'stats':
      content = <StatsScreen lang={LANG} games={displayGames}/>;
      break;
    default:
      content = <HomeScreen games={displayGames} onOpen={() => {}} onNew={() => {}} lang={LANG}/>;
  }

  if (remote && authError) {
    return (
      <div style={{
        width: '100%', minHeight: '100vh', background: '#070707', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 420, border: '1px solid #5200ff', borderRadius: 24,
          padding: '28px 24px', textAlign: 'left',
        }}>
          <Mono color="#ff7a7a" size={11} tracking="1.5px">CONNEXION IMPOSSIBLE</Mono>
          <div style={{ marginTop: 12 }}>
            <Display size={28}>Auth requise.</Display>
          </div>
          <p style={{ marginTop: 14, color: '#949494', fontSize: 14, lineHeight: 1.55 }}>
            {authError}
          </p>
          <p style={{ marginTop: 12, color: '#949494', fontSize: 13, lineHeight: 1.5 }}>
            Triploo s'appuie sur des sessions Supabase anonymes pour que chaque utilisateur ne voie que ses propres parties.
          </p>
        </div>
      </div>
    );
  }

  if (remote && !authReady) {
    return (
      <div style={{
        width: '100%', minHeight: '100vh', background: '#070707',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Mono color="#3cffd0" size={11} tracking="1.9px">CONNEXION…</Mono>
      </div>
    );
  }

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
        paddingBottom: 'calc(72px + env(safe-area-inset-bottom))',
      }}>
        {content}
      </main>
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
        background: 'var(--canvas-black)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <TabBar active={tab} onChange={onTab} lang={LANG}/>
        </div>
      </div>
    </div>
  );
}
