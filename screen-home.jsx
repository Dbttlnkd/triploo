// Triploo — Home screen (Parties list) + Create + Stats
import React from 'react';
import { I18N, TEAM_COLORS, Icon, currentScore } from './app-state.jsx';
import {
  Whisper, Mono, Eyebrow, Display, PillBtn, Boule, Card, ScreenHeader,
} from './ui-kit.jsx';

function TrashButton({ onClick, color = '#949494', label = 'Supprimer la partie' }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      aria-label={label}
      title={label}
      style={{
        background: 'transparent', border: 0, cursor: 'pointer',
        padding: 6, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
      </svg>
    </button>
  );
}

const HomeScreen = ({ games, onOpen, onNew, onSpectate, onDelete, lang = 'fr' }) => {
  const t = I18N[lang];
  const live = games.filter(g => g.status === 'live');
  const archived = games.filter(g => g.status === 'archived');
  const [tab, setTab] = React.useState('all');

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%', paddingBottom: 24 }}>
      {/* Wordmark masthead */}
      <div style={{ padding: '18px 18px 0' }}>
        <Whisper color="var(--text-secondary)">Pétanque · Tracker · Sud</Whisper>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 78, fontWeight: 900,
          lineHeight: 0.85, letterSpacing: '-0.5px', color: '#fff', marginTop: 4,
        }}>Triploo</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: '#3cffd0',
            animation: 'triploo-pulse 1400ms ease-in-out infinite',
          }} />
          <Mono color="#3cffd0" size={11}>{live.length} parties en cours · 29 avr · 27°c</Mono>
        </div>
      </div>

      {/* CTA — promo tile */}
      <div style={{ padding: '18px 18px 6px' }}>
        <div style={{
          background: 'var(--jelly-mint)', borderRadius: 24, padding: '20px 22px',
          color: '#000', display: 'flex', alignItems: 'flex-end', gap: 14, minHeight: 130,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ flex: 1 }}>
            <Eyebrow color="#000">{t.nouvellePartie}</Eyebrow>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 0.92,
              fontWeight: 900, marginTop: 10,
            }}>Lance la partie en deux gestes.</div>
            <div style={{ marginTop: 14 }}>
              <button onClick={onNew} style={{
                background: '#000', color: '#3cffd0', border: 0, borderRadius: 30,
                padding: '12px 18px', fontFamily: 'var(--font-mono)', fontSize: 12,
                fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="plus" size={14}/> Démarrer
              </button>
            </div>
          </div>
          {/* Decorative boules cluster */}
          <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.95 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="40" cy="80" r="22" fill="#131313"/>
              <circle cx="78" cy="62" r="20" fill="#131313"/>
              <circle cx="56" cy="48" r="14" fill="#131313"/>
              <circle cx="92" cy="92" r="10" fill="#5200ff"/>
              <circle cx="68" cy="88" r="6" fill="#ffec3b" stroke="#131313" strokeWidth="1.4"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '14px 18px 8px', display: 'flex', gap: 6 }}>
        {[{id:'all',label:'Toutes'},{id:'live',label:t.enCours},{id:'archived',label:t.archives}].map(x => {
          const active = tab === x.id;
          return (
            <button key={x.id} onClick={() => setTab(x.id)} style={{
              background: active ? '#fff' : 'transparent',
              color: active ? '#000' : '#fff',
              border: '1px solid #fff', borderRadius: 40,
              padding: '8px 14px', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>{x.label}</button>
          );
        })}
      </div>

      {/* Live banner card */}
      {tab !== 'archived' && live.map(g => {
        const s = currentScore(g);
        const leader = s.t1 > s.t2 ? g.teams[0] : (s.t2 > s.t1 ? g.teams[1] : null);
        return (
          <div key={g.id} style={{ padding: '8px 18px' }}>
            <div onClick={() => onOpen(g.id)} style={{
              background: 'var(--canvas-black)', border: '1px solid #fff',
              borderRadius: 20, padding: '18px 20px', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Eyebrow color="#3cffd0">EN DIRECT · {g.startedAt}</Eyebrow>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 22,
                    lineHeight: 1.05, marginTop: 8, color: '#fff',
                  }}>{g.name}</div>
                  <div style={{ marginTop: 6 }}>
                    <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
                      {g.place.toUpperCase()}
                    </Mono>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="radio" size={20} color="#3cffd0"/>
                  {onDelete && (
                    <TrashButton onClick={() => onDelete(g.id)} color="#949494"/>
                  )}
                </div>
              </div>

              {/* score block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, marginTop: 18, alignItems: 'center' }}>
                <div>
                  <Mono color={leader?.id === 't1' ? '#3cffd0' : '#949494'} size={10} tracking="1.5px">
                    {g.teams[0].name}
                  </Mono>
                  <div style={{ marginTop: 2 }}><Display size={56}>{s.t1}</Display></div>
                </div>
                <Display size={28} color="#949494">—</Display>
                <div style={{ textAlign: 'right' }}>
                  <Mono color={leader?.id === 't2' ? '#3cffd0' : '#949494'} size={10} tracking="1.5px">
                    {g.teams[1].name}
                  </Mono>
                  <div style={{ marginTop: 2 }}><Display size={56}>{s.t2}</Display></div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid #313131' }}>
                <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
                  Mène {g.rounds.length + 1} · {g.spectators} spectateurs · jusqu'à {g.target}
                </Mono>
                <Icon name="chevR" size={16} color="#fff"/>
              </div>
            </div>
          </div>
        );
      })}

      {/* Archived list */}
      {tab !== 'live' && (
        <div style={{ padding: '18px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <Display size={28}>Historique</Display>
            <Mono color="#949494" size={10} tracking="1.5px" weight={500}>{archived.length} parties</Mono>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {archived.map((g, i) => (
              <div key={g.id} onClick={() => onOpen(g.id)} style={{
                display: 'grid', gridTemplateColumns: '64px 1fr auto auto', gap: 12,
                padding: '14px 0', borderBottom: i === archived.length - 1 ? 'none' : '1px solid #313131',
                cursor: 'pointer', alignItems: 'center',
              }}>
                <div>
                  <Mono color="#949494" size={10} tracking="1.5px">{g.date.split(' ').slice(0,2).join(' ')}</Mono>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, lineHeight: 1.15, color: '#fff' }}>
                    {g.name}
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Boule size={10} fill={TEAM_COLORS[g.teams[0].color].bg}/>
                    <Mono color="#949494" size={10} tracking="1.1px" weight={500}>
                      {g.teams[0].name} {g.finalScore[0]}–{g.finalScore[1]} {g.teams[1].name}
                    </Mono>
                    <Boule size={10} fill={TEAM_COLORS[g.teams[1].color].bg}/>
                  </div>
                </div>
                <Mono color={g.winner === 't1' ? '#3cffd0' : '#5200ff'} size={11} tracking="1.5px">
                  {g.winner === 't1' ? 'WIN A' : 'WIN B'}
                </Mono>
                {onDelete && (
                  <TrashButton onClick={() => onDelete(g.id)}/>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Create game screen
// ─────────────────────────────────────────────────────────────
const MIN_PLAYERS_PER_TEAM = 1;
const MAX_PLAYERS_PER_TEAM = 3;

function uiFormatFromTeamSizes(a, b) {
  if (a === 1 && b === 1) return 'teteATete';
  if (a === 2 && b === 2) return 'doublette';
  if (a === 3 && b === 3) return 'triplette';
  if ((a === 1 && b === 2) || (a === 2 && b === 1)) return 'unContreDeux';
  return 'doublette';
}

const CreateScreen = ({ onCancel, onCreate, playerSuggestions = [] }) => {
  const [target, setTarget] = React.useState(13);
  const [bestOf, setBestOf] = React.useState(1);
  const [name, setName] = React.useState('Tournoi du soir');
  const [place, setPlace] = React.useState('Boulodrome de Saint-Tropez');
  const [teamA, setTeamA] = React.useState({ name: 'Les Mistraliens', color: 'mint', players: [''] });
  const [teamB, setTeamB] = React.useState({ name: 'Ocre Boys', color: 'violet', players: [''] });

  const handleLaunch = () => {
    const pa = teamA.players.map((p) => p.trim()).filter(Boolean);
    const pb = teamB.players.map((p) => p.trim()).filter(Boolean);
    const safePa = pa.length ? pa : ['Joueur 1'];
    const safePb = pb.length ? pb : ['Joueur 1'];
    onCreate?.({
      name: name.trim() || 'Partie',
      place: place.trim(),
      formatUi: uiFormatFromTeamSizes(safePa.length, safePb.length),
      target,
      bestOf,
      teamA: { name: teamA.name.trim() || 'Équipe A', color: teamA.color, players: safePa },
      teamB: { name: teamB.name.trim() || 'Équipe B', color: teamB.color, players: safePb },
    });
  };

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader kicker="NOUVELLE PARTIE" title="On lance ?" onBack={onCancel}/>

      <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Teams */}
        <section>
          <Mono color="#949494" size={10} tracking="1.5px">Équipes</Mono>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <TeamCard team={teamA} onChange={setTeamA} accent="A" suggestions={playerSuggestions}/>
            <div style={{ textAlign: 'center' }}>
              <Mono color="#5200ff" size={11} tracking="1.8px" weight={700}>VS</Mono>
            </div>
            <TeamCard team={teamB} onChange={setTeamB} accent="B" suggestions={playerSuggestions}/>
          </div>
        </section>

        {/* Rules */}
        <section>
          <Mono color="#949494" size={10} tracking="1.5px">Règles</Mono>
          <div style={{ background: 'var(--canvas-black)', border: '1px solid #fff', borderRadius: 20, padding: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #313131' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: '#fff' }}>Score à atteindre</div>
                <Mono color="#949494" size={9} tracking="1.5px" weight={500}>POINTS POUR GAGNER</Mono>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[11, 13, 15, 21].map(n => (
                  <button key={n} onClick={() => setTarget(n)} style={{
                    width: 36, height: 36, border: `1px solid ${target === n ? 'var(--jelly-mint)' : '#313131'}`,
                    background: target === n ? 'var(--jelly-mint)' : 'transparent',
                    color: target === n ? '#000' : '#fff', borderRadius: '50%', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  }}>{n}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: '#fff' }}>Format des manches</div>
                <Mono color="#949494" size={9} tracking="1.5px" weight={500}>BEST OF</Mono>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 3, 5].map(n => (
                  <button key={n} onClick={() => setBestOf(n)} style={{
                    minWidth: 56, height: 36, border: `1px solid ${bestOf === n ? '#fff' : '#313131'}`,
                    background: bestOf === n ? '#fff' : 'transparent',
                    color: bestOf === n ? '#000' : '#fff', borderRadius: 40, cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
                    padding: '0 12px', textTransform: 'uppercase',
                  }}>{n === 1 ? 'Unique' : `BO${n}`}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Meta */}
        <section>
          <Mono color="#949494" size={10} tracking="1.5px">Détails</Mono>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <Field label="Nom" value={name} onChange={setName}/>
            <Field label="Lieu" value={place} onChange={setPlace} icon="location"/>
          </div>
        </section>

        <div style={{ marginTop: 6 }}>
          <PillBtn variant="primary" wide icon="arrow" onClick={handleLaunch}>Lancer la partie</PillBtn>
        </div>
      </div>
    </div>
  );
};

function PlayerInput({ value, onChange, placeholder, suggestions, color }) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    const used = new Set();
    const list = [];
    for (const s of suggestions) {
      if (!s) continue;
      const k = s.toLowerCase();
      if (used.has(k)) continue;
      if (q && !k.includes(q)) continue;
      used.add(k);
      list.push(s);
      if (list.length >= 8) break;
    }
    return list;
  }, [value, suggestions]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDocPointer = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('touchstart', onDocPointer);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('touchstart', onDocPointer);
    };
  }, [open]);

  const exactExisting = filtered.some((s) => s.toLowerCase() === (value || '').trim().toLowerCase());
  const showCreateHint = open && (value || '').trim().length > 0 && !exactExisting;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        style={{
          width: '100%', background: 'transparent', border: 0, outline: 0, color,
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase',
        }}
      />
      {open && (filtered.length > 0 || showCreateHint) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
          background: '#131313', border: '1px solid #313131', borderRadius: 14,
          padding: 4, maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        }}>
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent', border: 0, color: '#fff',
                padding: '8px 10px', cursor: 'pointer', borderRadius: 8,
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(60,255,208,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >{s}</button>
          ))}
          {showCreateHint && (
            <div style={{
              padding: '8px 10px', color: '#3cffd0',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase',
              borderTop: filtered.length > 0 ? '1px solid #313131' : 0,
            }}>
              + Créer « {value.trim()} »
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TeamCard = ({ team, onChange, accent, suggestions = [] }) => {
  const c = TEAM_COLORS[team.color];
  const minPlayers = MIN_PLAYERS_PER_TEAM;
  const maxPlayers = MAX_PLAYERS_PER_TEAM;
  const setName = (v) => onChange({ ...team, name: v });
  const setPlayer = (idx, v) => {
    const players = [...team.players];
    players[idx] = v;
    onChange({ ...team, players });
  };
  const addPlayer = () => {
    if (team.players.length >= maxPlayers) return;
    onChange({ ...team, players: [...team.players, ''] });
  };
  const removePlayer = (idx) => {
    if (team.players.length <= minPlayers) return;
    onChange({ ...team, players: team.players.filter((_, i) => i !== idx) });
  };
  return (
    <div style={{
      background: c.bg, color: c.fg, borderRadius: 24, padding: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, marginRight: 8 }}>
          <Mono color={c.fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} size={10} tracking="1.5px">
            ÉQUIPE {accent}
          </Mono>
          <input value={team.name} onChange={(e) => setName(e.target.value)} style={{
            display: 'block', width: '100%', marginTop: 6,
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
            lineHeight: 1, color: c.fg, background: 'transparent', border: 0, outline: 0,
          }}/>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {Object.keys(TEAM_COLORS).filter(k => k !== 'white').map(col => (
            <button key={col} type="button" onClick={() => onChange({...team, color: col})} style={{
              width: 18, height: 18, borderRadius: '50%', cursor: 'pointer',
              background: TEAM_COLORS[col].bg, border: `1.5px solid ${team.color === col ? '#000' : 'transparent'}`,
              padding: 0,
            }}/>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {team.players.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: c.fg === '#fff' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
            color: c.fg, borderRadius: 40, padding: '6px 10px',
          }}>
            <Icon name="user" size={11} color={c.fg}/>
            <PlayerInput
              value={p}
              onChange={(v) => setPlayer(i, v)}
              placeholder={`Joueur ${i + 1}`}
              suggestions={suggestions}
              color={c.fg}
            />
            <button type="button" disabled={team.players.length <= minPlayers} onClick={() => removePlayer(i)} style={{
              background: 'transparent', border: 0, color: c.fg, cursor: team.players.length <= minPlayers ? 'not-allowed' : 'pointer',
              opacity: team.players.length <= minPlayers ? 0.35 : 1, fontSize: 14, padding: '0 4px',
            }} aria-label="Retirer">×</button>
          </div>
        ))}
        <button type="button" disabled={team.players.length >= maxPlayers} onClick={addPlayer} style={{
          background: 'transparent', border: `1px dashed ${c.fg}`,
          color: c.fg, borderRadius: 40, padding: '6px 12px', cursor: team.players.length >= maxPlayers ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          letterSpacing: '1.1px', textTransform: 'uppercase', opacity: team.players.length >= maxPlayers ? 0.4 : 1,
        }}>+ Joueur</button>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, icon }) => (
  <div style={{
    background: 'var(--canvas-black)', border: '1px solid #fff', borderRadius: 8,
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
  }}>
    {icon && <Icon name={icon} size={16} color="#949494"/>}
    <div style={{ flex: 1 }}>
      <Mono color="#949494" size={9} tracking="1.5px" weight={500}>{label.toUpperCase()}</Mono>
      <input value={value} onChange={e => onChange(e.target.value)} style={{
        display: 'block', width: '100%', background: 'transparent', border: 0, outline: 0,
        color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 16, marginTop: 2, padding: 0,
      }}/>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Stats screen — agrégation des parties réelles de l'utilisateur
// ─────────────────────────────────────────────────────────────
function gameDateValue(g) {
  const raw = g._raw;
  return new Date(raw?.finished_at || raw?.started_at || raw?.created_at || 0).getTime();
}

function aggregatePlayerStats(games) {
  const map = new Map();
  const finished = games
    .filter((g) => g.status === 'archived' && g.winner)
    .sort((a, b) => gameDateValue(a) - gameDateValue(b));

  const streak = new Map();
  const bestStreak = new Map();

  for (const g of finished) {
    g.teams.forEach((team) => {
      const isWinning = team.id === g.winner;
      for (const playerName of team.players || []) {
        const name = (playerName || '').trim();
        if (!name) continue;

        if (!map.has(name)) map.set(name, { name, played: 0, wins: 0 });
        const s = map.get(name);
        s.played += 1;
        if (isWinning) {
          s.wins += 1;
          const next = (streak.get(name) || 0) + 1;
          streak.set(name, next);
          if (next > (bestStreak.get(name) || 0)) bestStreak.set(name, next);
        } else {
          streak.set(name, 0);
        }
      }
    });
  }

  const rows = Array.from(map.values()).map((s) => ({
    ...s,
    ratio: s.played ? Math.round((s.wins / s.played) * 100) : 0,
    bestStreak: bestStreak.get(s.name) || 0,
  }));
  rows.sort((a, b) => (b.ratio - a.ratio) || (b.wins - a.wins) || (b.played - a.played));
  return rows;
}

const StatsScreen = ({ games = [] }) => {
  const stats = React.useMemo(() => aggregatePlayerStats(games), [games]);
  const totalGames = games.length;
  const finished = games.filter((g) => g.status === 'archived').length;
  const live = games.filter((g) => g.status === 'live').length;
  const top = stats[0];
  const bestStreakRow = stats.reduce((acc, r) => (r.bestStreak > (acc?.bestStreak || 0) ? r : acc), null);

  if (totalGames === 0) {
    return (
      <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
        <ScreenHeader kicker="STATS" title="Le palmarès."/>
        <div style={{ padding: '24px 18px', color: '#949494', fontSize: 14, lineHeight: 1.6 }}>
          <Mono color="#949494" size={11} tracking="1.5px">AUCUNE PARTIE POUR LE MOMENT</Mono>
          <p style={{ marginTop: 12 }}>
            Lance une partie depuis l'onglet « Parties ». Les stats des joueurs s'agrègent dès la première partie terminée.
          </p>
        </div>
      </div>
    );
  }

  const ratioOverall = top ? top.ratio : 0;

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader kicker="STATS" title="Le palmarès."/>

      <div style={{ padding: '14px 18px 24px' }}>
        <div style={{ background: '#ffec3b', color: '#000', borderRadius: 24, padding: 22, marginBottom: 14 }}>
          <Mono color="rgba(0,0,0,0.65)" size={10} tracking="1.5px">
            VOS PARTIES · {totalGames}
          </Mono>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div>
              <Display size={64}>{finished}</Display>
              <Mono color="#000" size={11} tracking="1.5px" weight={700}>TERMINÉES</Mono>
            </div>
            <div>
              <Display size={64}>{live}</Display>
              <Mono color="#000" size={11} tracking="1.5px" weight={700}>EN COURS</Mono>
            </div>
          </div>
          {bestStreakRow && bestStreakRow.bestStreak >= 2 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.2)' }}>
              <Mono color="rgba(0,0,0,0.7)" size={10} tracking="1.5px" weight={500}>
                MEILLEURE SÉRIE · {bestStreakRow.name.toUpperCase()} · {bestStreakRow.bestStreak} VICTOIRES D'AFFILÉE
              </Mono>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, marginTop: 22 }}>
          <Display size={28}>Joueurs</Display>
          <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
            {stats.length} JOUEUR{stats.length > 1 ? 'S' : ''}
          </Mono>
        </div>

        {stats.length === 0 ? (
          <Mono color="#949494" size={12} style={{ display: 'block', marginTop: 16, lineHeight: 1.6 }}>
            Aucune partie terminée pour le moment. Termine une partie pour voir le classement s'enrichir.
          </Mono>
        ) : (
          <div>
            {stats.map((p, i) => (
              <div key={p.name} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr auto auto', gap: 12,
                padding: '14px 0', borderBottom: i === stats.length - 1 ? 'none' : '1px solid #313131',
                alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 0.9, color: i === 0 ? '#3cffd0' : '#fff' }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: '#fff' }}>{p.name}</div>
                  {p.bestStreak >= 2 && (
                    <Mono color="#949494" size={9} tracking="1.5px" weight={500}>
                      MEILLEURE SÉRIE · {p.bestStreak}
                    </Mono>
                  )}
                </div>
                <Mono color="#949494" size={10} tracking="1.1px" weight={500}>{p.wins}/{p.played}</Mono>
                <div style={{ minWidth: 48, textAlign: 'right' }}>
                  <Display size={20} color={p.ratio >= 60 ? '#3cffd0' : '#fff'}>{p.ratio}%</Display>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { HomeScreen, CreateScreen, StatsScreen };
