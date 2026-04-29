// Triploo — App root: routing, screen orchestration, Tweaks panel
import React from 'react';
import { DEMO_GAMES } from './app-state.jsx';
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

export function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const [route, setRoute] = React.useState({ name: 'home' });
  const [tab, setTab] = React.useState('home');

  // Hot-reload icons after each render
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const games = DEMO_GAMES.map(g => ({ ...g, target: tweaks.winThreshold || g.target }));
  const liveGame = games.find(g => g.status === 'live');

  const go = (r) => setRoute(r);

  // Map tab → route
  const onTab = (t) => {
    setTab(t);
    if (t === 'home') go({ name: 'home' });
    else if (t === 'live') go({ name: 'live', gameId: liveGame.id });
    else if (t === 'photo') go({ name: 'photo' });
    else if (t === 'stats') go({ name: 'stats' });
  };

  let content = null;
  switch (route.name) {
    case 'home':
      content = <HomeScreen
        games={games}
        onOpen={(id) => { const g = games.find(x => x.id === id); go(g.status === 'live' ? { name: 'live', gameId: id } : { name: 'spectator', gameId: id }); }}
        onNew={() => go({ name: 'create' })}
        lang={tweaks.language}
      />;
      break;
    case 'create':
      content = <CreateScreen
        onCancel={() => go({ name: 'home' })}
        onCreate={() => go({ name: 'live', gameId: liveGame.id })}
        lang={tweaks.language}
      />;
      break;
    case 'live': {
      const g = games.find(x => x.id === route.gameId);
      content = <LiveScreen
        game={g}
        onBack={() => { setTab('home'); go({ name: 'home' }); }}
        onShare={() => go({ name: 'spectator', gameId: g.id })}
        layout={tweaks.scoringLayout}
        lang={tweaks.language}
      />;
      break;
    }
    case 'spectator': {
      const g = games.find(x => x.id === route.gameId);
      content = <SpectatorScreen game={g} onBack={() => { setTab('home'); go({ name: 'home' }); }}/>;
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
      content = <HomeScreen games={games} onOpen={() => {}} onNew={() => {}} lang={tweaks.language}/>;
  }

  // Hide tab bar on full-immersion screens
  const noTabs = ['live', 'create', 'spectator'].includes(route.name);

  return (
    <div style={{
      width: '100%', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#070707', padding: 24, gap: 28, flexWrap: 'wrap',
    }}>
      <IOSDevice width={392} height={848} dark>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Push past status bar */}
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

      {/* Side info card */}
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

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Langue">
          <TweakRadio
            value={tweaks.language}
            onChange={(v) => setTweak('language', v)}
            options={[{value:'fr',label:'FR'},{value:'en',label:'EN'}]}
          />
        </TweakSection>
        <TweakSection title="Score à atteindre">
          <TweakRadio
            value={tweaks.winThreshold}
            onChange={(v) => setTweak('winThreshold', v)}
            options={[{value:11,label:'11'},{value:13,label:'13'},{value:15,label:'15'},{value:21,label:'21'}]}
          />
        </TweakSection>
        <TweakSection title="Démo">
          <TweakButton onClick={() => setRoute({ name: 'home' })}>Accueil</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'live', gameId: liveGame.id })}>Live scoring</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'spectator', gameId: liveGame.id })}>Vue spectateur</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'photo' })}>Qui pointe ?</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'create' })}>Nouvelle partie</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'stats' })}>Stats</TweakButton>
          <TweakButton onClick={() => setRoute({ name: 'schema' })}>Schéma DB</TweakButton>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

