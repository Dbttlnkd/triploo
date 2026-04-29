// Triploo — Spectator live view + Photo "qui pointe?" + Schema appendix
import React from 'react';
import { TEAM_COLORS, currentScore, Icon } from './app-state.jsx';
import {
  Mono, Display, LiveDot, Eyebrow, ScreenHeader, PillBtn,
} from './ui-kit.jsx';

// ─────────────────────────────────────────────────────────────
// Spectator live view (read-only)
// ─────────────────────────────────────────────────────────────
const SpectatorScreen = ({ game, onBack }) => {
  const [score, setScore] = React.useState(currentScore(game));
  const [pulse, setPulse] = React.useState(false);

  // Simulate realtime — bump every 6s for demo
  React.useEffect(() => {
    const id = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const cA = TEAM_COLORS[game.teams[0].color];
  const cB = TEAM_COLORS[game.teams[1].color];
  const leader = score.t1 > score.t2 ? 't1' : (score.t2 > score.t1 ? 't2' : null);

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <div style={{ padding: '16px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="back" size={16}/>
          <Mono color="#fff" size={11}>Sortir</Mono>
        </button>
        <LiveDot/>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="eye" size={14} color="#949494"/>
          <Mono color="#949494" size={10} tracking="1.5px" weight={500}>4 SPECTATEURS</Mono>
        </div>
      </div>

      <div style={{ padding: '4px 18px 16px', borderBottom: '1px dashed var(--purple-rule)' }}>
        <Eyebrow color="#3cffd0">VUE SPECTATEUR · LECTURE SEULE</Eyebrow>
        <div style={{ marginTop: 6 }}>
          <Display size={36}>{game.name}</Display>
        </div>
        <div style={{ marginTop: 6 }}>
          <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
            {game.place.toUpperCase()} · {game.date}
          </Mono>
        </div>
      </div>

      {/* Vertical split, dramatic */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {[{ team: game.teams[0], score: score.t1, c: cA, id: 't1' }, { team: game.teams[1], score: score.t2, c: cB, id: 't2' }].map(s => (
          <div key={s.id} style={{
            background: s.c.bg, color: s.c.fg, padding: '24px 18px 28px',
            borderTop: leader === s.id ? `3px solid ${s.c.fg}` : '3px solid transparent',
            transition: 'transform 250ms ease',
            transform: pulse && leader === s.id ? 'scale(1.02)' : 'scale(1)',
          }}>
            <Mono color={s.c.fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} size={9} tracking="1.5px">
              {s.id === 't1' ? 'ÉQUIPE A' : 'ÉQUIPE B'}
            </Mono>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900,
              lineHeight: 1, marginTop: 4, color: s.c.fg,
            }}>{s.team.name}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 110, lineHeight: 0.85,
              fontWeight: 900, marginTop: 14, color: s.c.fg, letterSpacing: '-2px',
            }}>{s.score}</div>
            <div style={{ marginTop: 8 }}>
              <Mono color={s.c.fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'} size={9} tracking="1.1px" weight={700}>
                {s.team.players.join(' · ')}
              </Mono>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 18px 8px' }}>
        <Mono color="#949494" size={10} tracking="1.5px">DERNIÈRES MÈNES</Mono>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...game.rounds].reverse().slice(0, 6).map((r, i) => {
            const team = r.team === 't1' ? game.teams[0] : game.teams[1];
            const tc = TEAM_COLORS[team.color];
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 10,
                padding: '10px 0', borderBottom: '1px solid #313131', alignItems: 'center',
              }}>
                <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
                  M{game.rounds.length - i}
                </Mono>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: tc.bg }}/>
                  <Mono color="#fff" size={11} tracking="1.1px">{team.name}</Mono>
                </div>
                <Display size={20} color={tc.bg}>+{r.points}</Display>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spectator code / invite */}
      <div style={{ padding: '16px 18px 24px' }}>
        <div style={{ background: '#5200ff', color: '#fff', borderRadius: 20, padding: '18px 20px' }}>
          <Eyebrow color="#fff">CODE SPECTATEUR</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1,
              fontWeight: 900, letterSpacing: '4px',
            }}>TR-9F4Q</div>
            <button style={{
              background: '#fff', color: '#5200ff', border: 0, borderRadius: 30,
              padding: '10px 16px', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>COPIER</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <Mono color="rgba(255,255,255,0.7)" size={10} tracking="1.5px" weight={500}>
              TRIPLOO.APP/L/TR-9F4Q · LIEN VALIDE 24H
            </Mono>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Photo analyzer "qui pointe?"
// ─────────────────────────────────────────────────────────────
const PhotoScreen = ({ onBack }) => {
  const [stage, setStage] = React.useState('upload'); // upload | analyzing | result
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (stage !== 'analyzing') return;
    setProgress(0);
    const id = setInterval(() => setProgress(p => Math.min(100, p + 8)), 120);
    const done = setTimeout(() => setStage('result'), 1700);
    return () => { clearInterval(id); clearTimeout(done); };
  }, [stage]);

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader kicker="ANALYSE · CLAUDE VISION" title="Qui pointe ?" onBack={onBack}/>

      <div style={{ padding: '14px 18px 24px' }}>
        {stage === 'upload' && (
          <>
            <div style={{
              border: '1px dashed #fff', borderRadius: 24, padding: '36px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              minHeight: 220,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: '#3cffd0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="camera" size={32} color="#000" stroke={1.4}/>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Display size={28}>Photographie le terrain.</Display>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300,
                  color: '#949494', marginTop: 8, lineHeight: 1.4, maxWidth: 280,
                }}>Vue plongeante sur les boules autour du cochonnet — contraste maximal.</p>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PillBtn variant="primary" wide icon="camera" onClick={() => setStage('analyzing')}>Prendre la photo</PillBtn>
              <PillBtn variant="ghost" wide icon="image" onClick={() => setStage('analyzing')}>Choisir dans la galerie</PillBtn>
            </div>

            <div style={{ marginTop: 22, padding: 16, border: '1px solid #309875', borderRadius: 20 }}>
              <Eyebrow color="#3cffd0">COMMENT ÇA MARCHE</Eyebrow>
              <ol style={{
                margin: '12px 0 0', paddingLeft: 18, color: '#fff',
                fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.6,
              }}>
                <li>L'IA repère le cochonnet (jaune)</li>
                <li>Mesure la distance pixel/perspective de chaque boule</li>
                <li>Classe les boules de la plus proche à la plus éloignée</li>
                <li>Identifie l'équipe au point — et de combien</li>
              </ol>
            </div>
          </>
        )}

        {stage === 'analyzing' && (
          <div style={{ paddingTop: 20 }}>
            {/* Simulated photo */}
            <div style={{
              borderRadius: 24, overflow: 'hidden', position: 'relative',
              background: '#5e4a2b', aspectRatio: '4/3', border: '1px solid #313131',
            }}>
              <BouleDiagram analyzing/>
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(19,19,19,0.45)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', border: '2px solid #3cffd0',
                  borderTopColor: 'transparent', animation: 'triploo-spin 900ms linear infinite',
                }}/>
                <Mono color="#3cffd0" size={11} tracking="1.9px">ANALYSE EN COURS · {progress}%</Mono>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
                CLAUDE VISION · MESURE DES DISTANCES · IDENTIFICATION DES ÉQUIPES
              </Mono>
            </div>
          </div>
        )}

        {stage === 'result' && (
          <div style={{ paddingTop: 4 }}>
            {/* Verdict tile */}
            <div style={{ background: '#3cffd0', color: '#000', borderRadius: 24, padding: '20px 22px' }}>
              <Mono color="rgba(0,0,0,0.6)" size={11} tracking="1.9px">VERDICT</Mono>
              <div style={{ marginTop: 8 }}>
                <Display size={44}>Mint pointe.</Display>
              </div>
              <div style={{ marginTop: 10 }}>
                <Mono color="#000" size={11} tracking="1.5px" weight={700}>
                  3 BOULES MINT AVANT LA PREMIÈRE ULTRAVIOLET
                </Mono>
              </div>
            </div>

            {/* Annotated photo */}
            <div style={{
              borderRadius: 24, overflow: 'hidden', marginTop: 14,
              background: '#5e4a2b', aspectRatio: '4/3', border: '1px solid #313131', position: 'relative',
            }}>
              <BouleDiagram annotated/>
            </div>

            {/* Ranking */}
            <div style={{ marginTop: 16 }}>
              <Mono color="#949494" size={10} tracking="1.5px">CLASSEMENT DES BOULES</Mono>
              <div style={{ marginTop: 10 }}>
                {[
                  { rank: 1, color: 'mint', dist: 8, team: 'Mint' },
                  { rank: 2, color: 'mint', dist: 14, team: 'Mint' },
                  { rank: 3, color: 'mint', dist: 22, team: 'Mint' },
                  { rank: 4, color: 'violet', dist: 31, team: 'Ultraviolet' },
                  { rank: 5, color: 'violet', dist: 38, team: 'Ultraviolet' },
                  { rank: 6, color: 'mint', dist: 47, team: 'Mint' },
                ].map((b, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '24px 24px 1fr auto', gap: 12,
                    padding: '10px 0', borderBottom: i === 5 ? 'none' : '1px solid #313131',
                    alignItems: 'center',
                  }}>
                    <Display size={20} color={b.rank <= 3 ? '#3cffd0' : '#fff'}>{b.rank}</Display>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: TEAM_COLORS[b.color].bg }}/>
                    <Mono color="#fff" size={11} tracking="1.1px">{b.team}</Mono>
                    <Mono color="#949494" size={10} tracking="1.5px" weight={500}>{b.dist} CM</Mono>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PillBtn variant="primary" wide icon="check">Ajouter +3 à Mint</PillBtn>
              <PillBtn variant="ghost" wide onClick={() => setStage('upload')}>Refaire une photo</PillBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// SVG diagram of boules around cochonnet
const BouleDiagram = ({ analyzing = false, annotated = false }) => {
  const boules = [
    { x: 50, y: 50, r: 6, c: '#ffec3b', jack: true, rank: 0 }, // cochonnet
    { x: 56, y: 56, r: 9, c: '#3cffd0', rank: 1 },
    { x: 42, y: 58, r: 9, c: '#3cffd0', rank: 2 },
    { x: 60, y: 42, r: 9, c: '#3cffd0', rank: 3 },
    { x: 28, y: 50, r: 9, c: '#5200ff', rank: 4 },
    { x: 70, y: 70, r: 9, c: '#5200ff', rank: 5 },
    { x: 24, y: 30, r: 9, c: '#3cffd0', rank: 6 },
  ];
  return (
    <svg viewBox="0 0 100 75" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid slice">
      {/* gravel texture */}
      <rect width="100" height="75" fill="#5e4a2b"/>
      <g opacity="0.18">
        {Array.from({length: 80}).map((_, i) => (
          <circle key={i} cx={(i*13)%100} cy={(i*7)%75} r={0.6} fill="#000"/>
        ))}
      </g>
      {/* shadows */}
      {boules.map((b, i) => (
        <ellipse key={'s'+i} cx={b.x+0.6} cy={b.y+1.2} rx={b.r*0.85} ry={b.r*0.35} fill="rgba(0,0,0,0.45)"/>
      ))}
      {/* rank lines (annotated) */}
      {annotated && boules.filter(b => !b.jack && b.rank <= 6).map((b, i) => (
        <line key={'l'+i} x1={50} y1={50} x2={b.x} y2={b.y}
          stroke={b.rank <= 3 ? '#3cffd0' : '#5200ff'} strokeWidth="0.4" strokeDasharray="1.2 1.2" opacity="0.85"/>
      ))}
      {/* boules */}
      {boules.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={b.r * (b.jack ? 0.5 : 1)} fill={b.c}
            stroke={b.jack ? '#131313' : '#000'} strokeWidth={b.jack ? 0.6 : 0.3}/>
          <circle cx={b.x - b.r*0.3} cy={b.y - b.r*0.3} r={b.r*0.25} fill="rgba(255,255,255,0.45)"/>
          {annotated && !b.jack && (
            <g>
              <circle cx={b.x + b.r*0.7} cy={b.y - b.r*0.7} r={2.2}
                fill={b.rank <= 3 ? '#3cffd0' : '#5200ff'} stroke="#131313" strokeWidth="0.3"/>
              <text x={b.x + b.r*0.7} y={b.y - b.r*0.7 + 0.9} textAnchor="middle"
                fontFamily="Archivo Black" fontSize="2.5"
                fill={b.rank <= 3 ? '#000' : '#fff'} fontWeight="900">{b.rank}</text>
            </g>
          )}
        </g>
      ))}
      {/* analyzing scan */}
      {analyzing && (
        <line x1="0" y1="35" x2="100" y2="35" stroke="#3cffd0" strokeWidth="0.4">
          <animate attributeName="y1" values="0;75;0" dur="1.6s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="0;75;0" dur="1.6s" repeatCount="indefinite"/>
        </line>
      )}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Schema / architecture appendix (in-app drawer)
// ─────────────────────────────────────────────────────────────
const SchemaScreen = ({ onBack }) => (
  <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
    <ScreenHeader kicker="DEV NOTES" title="Sous le capot." onBack={onBack}/>
    <div style={{ padding: '18px 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      <section>
        <Eyebrow color="#3cffd0">SUPABASE · TABLES</Eyebrow>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'games', cols: 'id, name, place, format, target, best_of, status, owner_id, created_at', accent: 'mint' },
            { name: 'teams', cols: 'id, game_id, name, color, position', accent: 'violet' },
            { name: 'players', cols: 'id, team_id, name, role, user_id?', accent: 'yellow' },
            { name: 'rounds', cols: 'id, game_id, team_id, points, idx, created_at', accent: 'pink' },
            { name: 'spectators', cols: 'id, game_id, token, email?, expires_at', accent: 'electric' },
          ].map(t => {
            const c = TEAM_COLORS[t.accent];
            return (
              <div key={t.name} style={{
                background: c.bg, color: c.fg, borderRadius: 16,
                padding: '12px 16px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                }}>{t.name}</div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 10.5, opacity: 0.85, lineHeight: 1.5 }}>
                  {t.cols}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <Eyebrow color="#3cffd0">ROW-LEVEL SECURITY</Eyebrow>
        <ul style={{ margin: '10px 0 0', paddingLeft: 16, color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6 }}>
          <li>Le créateur (<Mono size={11} color="#3cffd0">owner_id = auth.uid()</Mono>) écrit tout</li>
          <li>Les spectateurs lisent via token signé (table <Mono size={11} color="#3cffd0">spectators</Mono>)</li>
          <li>Realtime canal par <Mono size={11} color="#3cffd0">game_id</Mono></li>
        </ul>
      </section>

      <section>
        <Eyebrow color="#3cffd0">AUTH</Eyebrow>
        <p style={{ marginTop: 10, color: '#fff', fontSize: 14, lineHeight: 1.5 }}>
          Magic link (Supabase Auth). Pas de mot de passe — un lien par email, expirant à 1h. Les spectateurs n'ont pas besoin de compte : token public, lecture seule.
        </p>
      </section>

      <section>
        <Eyebrow color="#3cffd0">CLAUDE VISION · QUI POINTE</Eyebrow>
        <div style={{
          marginTop: 10, background: '#131313', border: '1px solid #309875',
          borderRadius: 16, padding: 16,
        }}>
          <Mono color="#3cffd0" size={10} tracking="1.5px">PROMPT</Mono>
          <pre style={{
            margin: '8px 0 0', color: '#fff', fontFamily: 'var(--font-mono)',
            fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap',
          }}>{`Tu analyses une photo de partie de pétanque.
Repère le cochonnet (boule jaune ~30mm).
Identifie chaque boule de pétanque (~75mm) et son équipe par sa couleur dominante.
Classe les boules de la plus proche au cochonnet à la plus éloignée.
Renvoie JSON: { jack: {x,y}, boules:[{team, color, distance_cm, x, y}], leader, advance }`}</pre>
        </div>
      </section>

    </div>
  </div>
);

export { SpectatorScreen, PhotoScreen, SchemaScreen, BouleDiagram };
