// Triploo — App root: routing, screen orchestration, Tweaks panel, Supabase
import React from 'react';
import { DEMO_GAMES } from './app-state.jsx';
import { getSupabase, isSupabaseConfigured } from './lib/supabase.js';
import {
  AnonDisabledError,
  ensureAuthSession,
  sendAuthMagicLink,
  fetchGamesForUser,
  createGameRemote,
  addRoundRemote,
  undoLastRoundRemote,
  finalizeGameRemote,
  subscribeRounds,
} from './lib/games.js';
import { IOSDevice } from './ios-frame.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakButton,
} from './tweaks-panel.jsx';
import { Eyebrow, Display, Mono, Whisper, PillBtn, TabBar } from './ui-kit.jsx';
import { HomeScreen, CreateScreen, StatsScreen } from './screen-home.jsx';
import { LiveScreen } from './screen-live.jsx';
import { SpectatorScreen, PhotoScreen, SchemaScreen } from './screen-extras.jsx';

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "language": "fr",
  "winThreshold": 13,
  "scoringLayout": "split",
  "showSpectatorBadge": true,
  "demoLiveScore": "live"
}/*EDITMODE-END*/;

function cloneDemoGames() {
  return DEMO_GAMES.map((g) => ({
    ...g,
    teams: g.teams.map((t) => ({ ...t, players: [...(t.players || [])] })),
    rounds: [...(g.rounds || [])],
  }));
}

export function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const [route, setRoute] = React.useState({ name: 'home' });
  const [tab, setTab] = React.useState('home');
  const remote = isSupabaseConfigured();

  const [games, setGames] = React.useState(() => (remote ? [] : cloneDemoGames()));
  const [loadErr, setLoadErr] = React.useState(null);
  const [authPhase, setAuthPhase] = React.useState(() => (remote ? 'checking' : 'ready'));
  const [emailInput, setEmailInput] = React.useState('');
  const [emailBusy, setEmailBusy] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const authReady = authPhase === 'ready';

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
        refreshGames();
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
        await ensureAuthSession();
        if (cancelled) return;
        setAuthPhase('ready');
        await refreshGames();
      } catch (e) {
        if (cancelled) return;
        const anonOff = e instanceof AnonDisabledError || e?.code === 'ANON_DISABLED';
        if (anonOff) {
          setAuthPhase('need_email');
          return;
        }
        setLoadErr(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [remote, refreshGames]);

  const handleSendMagicLink = async () => {
    setLoadErr(null);
    if (!emailInput.trim()) {
      setLoadErr('Indique une adresse email.');
      return;
    }
    setEmailBusy(true);
    try {
      await sendAuthMagicLink(emailInput);
      setEmailSent(true);
    } catch (e) {
      setLoadErr(e?.message || String(e));
    } finally {
      setEmailBusy(false);
    }
  };

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const displayGames = React.useMemo(() => {
    if (remote) return games;
    return games.map((g) => ({ ...g, target: tweaks.winThreshold || g.target }));
  }, [games, remote, tweaks.winThreshold]);

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
          lang={tweaks.language}
        />
      );
      break;
    case 'create':
      content = (
        <CreateScreen
          onCancel={() => go({ name: 'home' })}
          onCreate={handleCreate}
          lang={tweaks.language}
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
          layout={tweaks.scoringLayout}
          lang={tweaks.language}
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
      content = <StatsScreen lang={tweaks.language}/>;
      break;
    case 'schema':
      content = <SchemaScreen onBack={() => { setTab('home'); go({ name: 'home' }); }}/>;
      break;
    default:
      content = <HomeScreen games={displayGames} onOpen={() => {}} onNew={() => {}} lang={tweaks.language}/>;
  }

  const noTabs = ['live', 'create', 'spectator'].includes(route.name);

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#070707', padding: 24, gap: 28, flexWrap: 'wrap',
    }}>
      {remote && authPhase !== 'ready' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,7,7,0.92)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 50, padding: 24,
        }}>
          {authPhase === 'checking' && (
            <Mono color="#fff">Connexion…</Mono>
          )}
          {authPhase === 'need_email' && (
            <div style={{
              maxWidth: 400, width: '100%', background: '#131313', border: '1px solid #309875',
              borderRadius: 24, padding: '28px 24px', color: '#fff',
            }}>
              <Display size={26} style={{ letterSpacing: '-0.5px' }}>Connexion Triploo</Display>
              <p style={{ color: '#949494', fontSize: 14, lineHeight: 1.55, marginTop: 14 }}>
                La connexion <strong style={{ color: '#fff' }}>anonyme</strong> est désactivée sur ce projet Supabase.
                Tu peux soit l’activer (Authentication → Providers → <strong style={{ color: '#3cffd0' }}>Anonymous</strong>),
                soit recevoir un <strong style={{ color: '#fff' }}>lien magique</strong> par email.
              </p>
              {emailSent ? (
                <Mono color="#3cffd0" size={12} style={{ marginTop: 18, display: 'block' }}>
                  Lien envoyé. Ouvre ta boîte mail puis clique sur le lien pour revenir ici.
                </Mono>
              ) : (
                <>
                  <label style={{ display: 'block', marginTop: 18 }}>
                    <Mono color="#949494" size={10} tracking="1.2px">EMAIL</Mono>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="toi@exemple.com"
                      autoComplete="email"
                      style={{
                        display: 'block', width: '100%', marginTop: 8, padding: '12px 14px',
                        borderRadius: 12, border: '1px solid #fff', background: '#070707', color: '#fff',
                        fontSize: 16, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={emailBusy}
                    onClick={handleSendMagicLink}
                    style={{
                      marginTop: 16, width: '100%', padding: '14px 18px', borderRadius: 30, border: 0,
                      background: 'var(--jelly-mint)', color: '#000', fontFamily: 'var(--font-mono)',
                      fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
                      cursor: emailBusy ? 'wait' : 'pointer', opacity: emailBusy ? 0.7 : 1,
                    }}
                  >
                    {emailBusy ? 'Envoi…' : 'Recevoir le lien magique'}
                  </button>
                </>
              )}
            </div>
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
      <IOSDevice width={392} height={848} dark>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ height: 54, flexShrink: 0 }}/>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {content}
          </div>
          {!noTabs && (
            <div style={{ flexShrink: 0, paddingBottom: 18 }}>
              <TabBar active={tab} onChange={onTab} lang={tweaks.language}/>
            </div>
          )}
          {noTabs && <div style={{ flexShrink: 0, height: 18 }}/>}
        </div>
      </IOSDevice>

      <aside style={{
        maxWidth: 360, color: '#fff', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <Whisper color="#949494">Triploo · prototype 0.1</Whisper>
          <div style={{ marginTop: 6 }}>
            <Display size={48} style={{ letterSpacing: '-0.5px', lineHeight: 0.9 }}>Pétanque, en direct.</Display>
          </div>
          <p style={{ color: '#949494', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
            Suivi de partie au pouce, vue spectateur en temps réel, et une IA qui tranche le « qui pointe ». Hi-fi clickable prototype, dans le vocabulaire visuel du Verge.
          </p>
          {remote && (
            <Mono color="#3cffd0" size={11} style={{ marginTop: 8 }}>Supabase : parties & mènes synchronisées</Mono>
          )}
        </div>

        <div style={{ border: '1px solid #309875', borderRadius: 20, padding: 18 }}>
          <Eyebrow color="#3cffd0">À EXPLORER</Eyebrow>
          <ul style={{ margin: '10px 0 0', paddingLeft: 16, color: '#fff', fontSize: 13, lineHeight: 1.7 }}>
            <li>Tap sur la partie en direct → écran scoring</li>
            <li>Tap sur une équipe → grille +1 à +6</li>
            <li>« Diffuser » dans l'écran scoring → vue spectateur</li>
            <li>Onglet « Qui pointe » → analyse photo simulée</li>
            <li>Schéma DB → bouton ci-dessous</li>
          </ul>
          <div style={{ marginTop: 14 }}>
            <PillBtn variant="ghost" icon="arrow" onClick={() => go({ name: 'schema' })}>Voir le schéma DB</PillBtn>
          </div>
        </div>

        <div style={{ background: '#ffec3b', color: '#000', borderRadius: 20, padding: 18 }}>
          <Mono color="rgba(0,0,0,0.65)" size={10} tracking="1.5px">RAPPEL</Mono>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 18, lineHeight: 1.2, marginTop: 8 }}>
            Une mène rapporte au max +6 — six boules, toutes plus proches que la meilleure de l'adversaire.
          </div>
        </div>
      </aside>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Langue">
          <TweakRadio
            value={tweaks.language}
            onChange={(v) => setTweak('language', v)}
            options={[{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }]}
          />
        </TweakSection>
        <TweakSection title="Score à atteindre">
          <TweakRadio
            value={tweaks.winThreshold}
            onChange={(v) => setTweak('winThreshold', v)}
            options={[{ value: 11, label: '11' }, { value: 13, label: '13' }, { value: 15, label: '15' }, { value: 21, label: '21' }]}
          />
        </TweakSection>
        <TweakSection title="Démo">
          <TweakButton onClick={() => setRoute({ name: 'home' })}>Accueil</TweakButton>
          {liveGame && (
            <>
              <TweakButton onClick={() => setRoute({ name: 'live', gameId: liveGame.id })}>Live scoring</TweakButton>
              <TweakButton onClick={() => setRoute({ name: 'spectator', gameId: liveGame.id })}>Vue spectateur</TweakButton>
            </>
          )}
          <TweakButton onClick={() => setRoute({ name: 'photo' })}>Qui pointe ?</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'create' })}>Nouvelle partie</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'stats' })}>Stats</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'schema' })}>Schéma DB</TweakButton>
          {remote && (
            <TweakButton onClick={() => refreshGames()}>Rafraîchir (Supabase)</TweakButton>
          )}
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}
