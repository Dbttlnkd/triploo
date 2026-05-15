// Triploo — Home screen (Parties list) + Create + Stats
import React from 'react';
import { I18N, TEAM_COLORS, Icon, currentScore } from './app-state.jsx';
import {
  Mono, Eyebrow, Display, PillBtn, Boule, Card, ScreenHeader,
} from './ui-kit.jsx';
import { fetchEventMembers } from './lib/auth.js';

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

const HomeScreen = ({
  games,
  events = [],
  onOpen,
  onNew,
  onSpectate,
  onDelete,
  onOpenEvent,
  onCreateEvent,
  onDeleteEvent,
  onOpenAccount,
  myDisplayName = '',
  lang = 'fr',
}) => {
  const t = I18N[lang];
  const live = games.filter(g => g.status === 'live');
  const archived = games.filter(g => g.status === 'archived');
  const [tab, setTab] = React.useState('all');

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%', paddingBottom: 24 }}>
      {/* Wordmark masthead */}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <img
            src="/triploo-logo.png"
            alt="Triploo"
            style={{ display: 'block', height: 124, width: 'auto', maxWidth: '100%' }}
          />
          {(myDisplayName || onOpenAccount) && (
            <button
              type="button"
              onClick={onOpenAccount}
              aria-label="Mon compte"
              style={{
                marginTop: 8, flexShrink: 0,
                background: 'transparent', border: '1px solid #309875', color: '#fff',
                borderRadius: 40, padding: '8px 12px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '1.2px',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3cffd0' }}/>
              <span style={{ textTransform: 'none', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {myDisplayName || 'Compte'}
              </span>
            </button>
          )}
        </div>
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
            }}>Crée une partie en 20 secondes.</div>
            <div style={{ marginTop: 8 }}>
              <Mono color="rgba(0,0,0,0.72)" size={10} tracking="1.2px" weight={700}>
                1 VS 1 · 2 VS 2 · 3 VS 3 · 1 VS 2
              </Mono>
            </div>
            <div style={{ marginTop: 14 }}>
              <button onClick={onNew} style={{
                background: '#000', color: '#3cffd0', border: 0, borderRadius: 30,
                padding: '12px 18px', fontFamily: 'var(--font-mono)', fontSize: 12,
                fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="plus" size={14}/> Nouvelle partie
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

      {/* Events section */}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <Display size={24}>Événements</Display>
          {onCreateEvent && (
            <button
              type="button"
              onClick={onCreateEvent}
              style={{
                background: 'transparent', border: 0, color: '#3cffd0', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase', padding: 0,
              }}
            >
              + Nouveau
            </button>
          )}
        </div>
        {events.length === 0 ? (
          <Mono color="#949494" size={12} style={{ display: 'block', lineHeight: 1.6 }}>
            Aucun événement. Crées-en un pour regrouper plusieurs parties dans un même palmarès.
          </Mono>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map((ev) => {
              const eventGames = games.filter((g) => g.eventId === ev.id);
              const liveCount = eventGames.filter((g) => g.status === 'live').length;
              const archivedCount = eventGames.filter((g) => g.status === 'archived').length;
              const isLive = ev.status === 'live';
              return (
                <div
                  key={ev.id}
                  onClick={() => onOpenEvent?.(ev.id)}
                  style={{
                    background: 'var(--canvas-black)', border: '1px solid #fff',
                    borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Mono color={isLive ? '#3cffd0' : '#949494'} size={9} tracking="1.5px">
                      {isLive ? 'EN COURS' : 'TERMINÉ'}
                    </Mono>
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 17,
                      color: '#fff', marginTop: 4, lineHeight: 1.1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ev.name}</div>
                    <div style={{ marginTop: 4 }}>
                      <Mono color="#949494" size={10} tracking="1.1px" weight={500}>
                        {archivedCount + liveCount} partie{archivedCount + liveCount > 1 ? 's' : ''}
                        {liveCount > 0 ? ` · ${liveCount} live` : ''}
                        {ev.place ? ` · ${ev.place}` : ''}
                      </Mono>
                    </div>
                  </div>
                  {onDeleteEvent && (
                    <TrashButton onClick={() => onDeleteEvent(ev.id)}/>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '18px 18px 8px', display: 'flex', gap: 6 }}>
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

const CreateScreen = ({
  onCancel,
  onCreate,
  playerSuggestions = [],
  defaultName = 'Partie #1',
  events = [],
  defaultEventId = null,
  eventLocked = false,
  myUserId = null,
  myDisplayName = '',
}) => {
  const [target, setTarget] = React.useState(13);
  const [bestOf, setBestOf] = React.useState(1);
  const [name, setName] = React.useState(defaultName);
  const [place, setPlace] = React.useState('');
  const [placeBusy, setPlaceBusy] = React.useState(false);
  const [teamA, setTeamA] = React.useState({ name: 'Les Mistraliens', color: 'mint', players: [''], playerUserIds: [null] });
  const [teamB, setTeamB] = React.useState({ name: 'Ocre Boys', color: 'violet', players: [''], playerUserIds: [null] });
  const [eventId, setEventId] = React.useState(defaultEventId);
  const [eventMembers, setEventMembers] = React.useState([]);
  const liveEvents = React.useMemo(() => events.filter((e) => e.status === 'live'), [events]);

  React.useEffect(() => {
    if (!eventId) { setEventMembers([]); return undefined; }
    let cancelled = false;
    fetchEventMembers(eventId)
      .then((m) => { if (!cancelled) setEventMembers(m); })
      .catch(() => { if (!cancelled) setEventMembers([]); });
    return () => { cancelled = true; };
  }, [eventId]);

  const mergedSuggestions = React.useMemo(() => {
    const seen = new Set();
    const out = [];

    const myName = (myDisplayName || '').trim();
    if (myUserId && myName) {
      out.push({ name: myName, userId: myUserId, isMember: true, isMe: true });
      seen.add(myName.toLowerCase());
    }
    for (const m of eventMembers) {
      const label = (m.displayName || '').trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: label, userId: m.userId, isMember: true, isMe: m.userId === myUserId });
    }
    for (const n of playerSuggestions) {
      const label = (n || '').trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: label, userId: null, isMember: false });
    }
    return out;
  }, [eventMembers, playerSuggestions, myUserId, myDisplayName]);

  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    let cancelled = false;
    setPlaceBusy(true);
    const onSuccess = async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14&addressdetails=1`;
        const r = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
        if (!r.ok) throw new Error(`reverse-geocode ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        const a = data.address || {};
        const city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || '';
        const country = a.country || '';
        const human = [city, country].filter(Boolean).join(', ');
        setPlace((prev) => (prev ? prev : human));
      } catch {
        // best-effort: keep field empty if geocoding fails
      } finally {
        if (!cancelled) setPlaceBusy(false);
      }
    };
    const onError = () => { if (!cancelled) setPlaceBusy(false); };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 8000, maximumAge: 60000 });
    return () => { cancelled = true; };
  }, []);

  const buildTeamPlayers = (team) => {
    const out = [];
    (team.players || []).forEach((rawName, i) => {
      const trimmed = (rawName || '').trim();
      if (!trimmed) return;
      out.push({ name: trimmed, userId: team.playerUserIds?.[i] || null });
    });
    return out;
  };

  const handleLaunch = () => {
    const pa = buildTeamPlayers(teamA);
    const pb = buildTeamPlayers(teamB);
    const safePa = pa.length ? pa : [{ name: 'Joueur 1', userId: null }];
    const safePb = pb.length ? pb : [{ name: 'Joueur 1', userId: null }];
    onCreate?.({
      name: name.trim() || 'Partie',
      place: place.trim(),
      formatUi: uiFormatFromTeamSizes(safePa.length, safePb.length),
      target,
      bestOf,
      teamA: { name: teamA.name.trim() || 'Équipe A', color: teamA.color, players: safePa },
      teamB: { name: teamB.name.trim() || 'Équipe B', color: teamB.color, players: safePb },
      eventId: eventId || null,
    });
  };

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader kicker="NOUVELLE PARTIE" title="On lance ?" onBack={onCancel}/>

      <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {liveEvents.length > 0 && (
          <section>
            <Mono color="#949494" size={10} tracking="1.5px">Événement</Mono>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <button
                type="button"
                disabled={eventLocked}
                onClick={() => setEventId(null)}
                style={{
                  background: !eventId ? '#fff' : 'transparent',
                  color: !eventId ? '#000' : '#fff',
                  border: '1px solid #fff', borderRadius: 40, padding: '8px 14px',
                  cursor: eventLocked ? 'not-allowed' : 'pointer', opacity: eventLocked ? 0.5 : 1,
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '1.4px', textTransform: 'uppercase',
                }}
              >
                Aucun
              </button>
              {liveEvents.map((ev) => {
                const active = eventId === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    disabled={eventLocked && !active}
                    onClick={() => !eventLocked && setEventId(ev.id)}
                    style={{
                      background: active ? 'var(--jelly-mint)' : 'transparent',
                      color: active ? '#000' : '#fff',
                      border: `1px solid ${active ? 'var(--jelly-mint)' : '#fff'}`,
                      borderRadius: 40, padding: '8px 14px',
                      cursor: eventLocked && !active ? 'not-allowed' : 'pointer',
                      opacity: eventLocked && !active ? 0.4 : 1,
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      letterSpacing: '1.4px', textTransform: 'uppercase',
                    }}
                  >{ev.name}</button>
                );
              })}
            </div>
            {eventLocked && eventId && (
              <Mono color="#949494" size={10} tracking="1.2px" style={{ display: 'block', marginTop: 8 }}>
                Partie rattachée à cet événement
              </Mono>
            )}
          </section>
        )}

        {/* Teams */}
        <section>
          <Mono color="#949494" size={10} tracking="1.5px">Équipes</Mono>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <TeamCard team={teamA} onChange={setTeamA} accent="A" suggestions={mergedSuggestions} otherTeam={teamB}/>
            <div style={{ textAlign: 'center' }}>
              <Mono color="#5200ff" size={11} tracking="1.8px" weight={700}>VS</Mono>
            </div>
            <TeamCard team={teamB} onChange={setTeamB} accent="B" suggestions={mergedSuggestions} otherTeam={teamA}/>
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
            <Field
              label="Lieu"
              value={place}
              onChange={setPlace}
              icon="location"
              placeholder={placeBusy ? 'Localisation…' : 'Boulodrome, ville…'}
            />
          </div>
        </section>

        <div style={{ marginTop: 6 }}>
          <PillBtn variant="primary" wide icon="arrow" onClick={handleLaunch}>Lancer la partie</PillBtn>
        </div>
      </div>
    </div>
  );
};

function PlayerInput({ value, userId, onChange, placeholder, suggestions, color, excludedUserIds }) {
  // suggestions: Array<{ name: string, userId?: string|null, isMember?: boolean }>
  // excludedUserIds: Set<string> — userIds already picked in OTHER slots; we
  //   filter them out so the same human can't be in two places at once.
  // onChange(name, userId): caller stores both halves
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    const used = new Set();
    const list = [];
    for (const s of suggestions) {
      if (!s?.name) continue;
      if (s.userId && excludedUserIds && excludedUserIds.has(s.userId)) continue;
      const k = s.name.toLowerCase();
      if (used.has(k)) continue;
      if (q && !k.includes(q)) continue;
      used.add(k);
      list.push(s);
      if (list.length >= 8) break;
    }
    return list;
  }, [value, suggestions, excludedUserIds]);

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

  const exactExisting = filtered.some((s) => s.name.toLowerCase() === (value || '').trim().toLowerCase());
  const showCreateHint = open && (value || '').trim().length > 0 && !exactExisting;
  const hasLink = Boolean(userId);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
      {hasLink && (
        <span
          title="Joueur lié à un compte"
          style={{
            flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: '#3cffd0',
            display: 'inline-block',
          }}
        />
      )}
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value, null); if (!open) setOpen(true); }}
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
              key={s.name + (s.userId || '')}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(s.name, s.userId || null); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                background: 'transparent', border: 0, color: '#fff',
                padding: '8px 10px', cursor: 'pointer', borderRadius: 8,
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(60,255,208,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {s.isMember && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3cffd0', flexShrink: 0 }}/>
              )}
              <span>{s.name}{s.isMe ? ' (toi)' : ''}</span>
              {s.isMember && (
                <span style={{ marginLeft: 'auto', color: '#3cffd0', fontSize: 9, letterSpacing: '1.2px' }}>
                  {s.isMe ? 'TOI' : 'MEMBRE'}
                </span>
              )}
            </button>
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

const TeamCard = ({ team, onChange, accent, suggestions = [], otherTeam = null }) => {
  const c = TEAM_COLORS[team.color];
  const minPlayers = MIN_PLAYERS_PER_TEAM;
  const maxPlayers = MAX_PLAYERS_PER_TEAM;
  const playerUserIds = team.playerUserIds || team.players.map(() => null);
  const setName = (v) => onChange({ ...team, name: v });
  const setPlayer = (idx, name, userId) => {
    const players = [...team.players];
    const uids = [...playerUserIds];
    players[idx] = name;
    uids[idx] = userId || null;
    onChange({ ...team, players, playerUserIds: uids });
  };
  const addPlayer = () => {
    if (team.players.length >= maxPlayers) return;
    onChange({
      ...team,
      players: [...team.players, ''],
      playerUserIds: [...playerUserIds, null],
    });
  };
  const removePlayer = (idx) => {
    if (team.players.length <= minPlayers) return;
    onChange({
      ...team,
      players: team.players.filter((_, i) => i !== idx),
      playerUserIds: playerUserIds.filter((_, i) => i !== idx),
    });
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
              userId={playerUserIds[i]}
              onChange={(name, userId) => setPlayer(i, name, userId)}
              placeholder={`Joueur ${i + 1}`}
              suggestions={suggestions}
              color={c.fg}
              excludedUserIds={(() => {
                const ex = new Set();
                playerUserIds.forEach((u, j) => { if (u && j !== i) ex.add(u); });
                (otherTeam?.playerUserIds || []).forEach((u) => { if (u) ex.add(u); });
                return ex;
              })()}
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

const Field = ({ label, value, onChange, icon, placeholder }) => (
  <div style={{
    background: 'var(--canvas-black)', border: '1px solid #fff', borderRadius: 8,
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
  }}>
    {icon && <Icon name={icon} size={16} color="#949494"/>}
    <div style={{ flex: 1 }}>
      <Mono color="#949494" size={9} tracking="1.5px" weight={500}>{label.toUpperCase()}</Mono>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
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
    g.teams.forEach((team, i) => {
      const isWinning = team.id === g.winner;
      const teamPoints = Array.isArray(g.finalScore) ? (g.finalScore[i] || 0) : 0;
      const refs = team.playerRefs || (team.players || []).map((n) => ({ name: n, userId: null }));
      for (const ref of refs) {
        const name = (ref.name || '').trim();
        if (!name) continue;

        if (!map.has(name)) map.set(name, { name, played: 0, wins: 0, points: 0, userIds: new Set() });
        const s = map.get(name);
        s.played += 1;
        s.points += teamPoints;
        if (ref.userId) s.userIds.add(ref.userId);
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
    userIds: Array.from(s.userIds),
  }));
  rows.sort((a, b) =>
    (b.ratio - a.ratio) ||
    (b.points - a.points) ||
    (b.wins - a.wins) ||
    (b.played - a.played)
  );
  return rows;
}

function computePersonalStats(games, myUserId) {
  if (!myUserId) return null;
  const finished = games
    .filter((g) => g.status === 'archived' && g.winner)
    .sort((a, b) => gameDateValue(a) - gameDateValue(b));

  let played = 0;
  let wins = 0;
  let streak = 0;
  let bestStreak = 0;

  for (const g of finished) {
    // A user can technically appear in multiple teams of the same game if
    // the picker was misused. Collect every team where we're listed and
    // count the game as a win if any of those teams won — be charitable
    // about historical data anomalies.
    const mySides = [];
    g.teams.forEach((team) => {
      const refs = team.playerRefs || [];
      if (refs.some((r) => r.userId === myUserId)) mySides.push(team.id);
    });
    if (mySides.length === 0) continue;
    played += 1;
    if (mySides.includes(g.winner)) {
      wins += 1;
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
  }

  if (!played) return null;
  return { played, wins, ratio: Math.round((wins / played) * 100), bestStreak };
}

const StatsScreen = ({ games = [], myUserId = null }) => {
  const stats = React.useMemo(() => aggregatePlayerStats(games), [games]);
  const personal = React.useMemo(() => computePersonalStats(games, myUserId), [games, myUserId]);
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
        </div>
      </div>
    );
  }

  const ratioOverall = top ? top.ratio : 0;

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader kicker="STATS" title="Le palmarès."/>

      <div style={{ padding: '14px 18px 24px' }}>
        {personal && (
          <div style={{
            background: 'var(--canvas-black)', border: '1px solid #3cffd0',
            borderRadius: 24, padding: 22, marginBottom: 14,
          }}>
            <Mono color="#3cffd0" size={10} tracking="1.5px">
              TON BILAN · {personal.played} PARTIE{personal.played > 1 ? 'S' : ''}
            </Mono>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'block', lineHeight: 0.95 }}>
                  <Display size={36}>{personal.wins}</Display>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Mono color="#fff" size={10} tracking="1.4px" weight={700}>VICTOIRES</Mono>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'block', lineHeight: 0.95 }}>
                  <Display size={36} color={personal.ratio >= 60 ? '#3cffd0' : '#fff'}>{personal.ratio}%</Display>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Mono color="#fff" size={10} tracking="1.4px" weight={700}>RATIO</Mono>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'block', lineHeight: 0.95 }}>
                  <Display size={36}>{personal.bestStreak}</Display>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Mono color="#fff" size={10} tracking="1.4px" weight={700}>SÉRIE MAX</Mono>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: '#ffec3b', color: '#000', borderRadius: 24, padding: 22, marginBottom: 14 }}>
          <Mono color="rgba(0,0,0,0.65)" size={10} tracking="1.5px">
            VOS PARTIES · {totalGames}
          </Mono>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'block', lineHeight: 0.95 }}>
                <Display size={56}>{finished}</Display>
              </div>
              <div style={{ marginTop: 6 }}>
                <Mono color="#000" size={11} tracking="1.5px" weight={700}>TERMINÉES</Mono>
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'block', lineHeight: 0.95 }}>
                <Display size={56}>{live}</Display>
              </div>
              <div style={{ marginTop: 6 }}>
                <Mono color="#000" size={11} tracking="1.5px" weight={700}>EN COURS</Mono>
              </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.userIds.length > 0 && (
                      <span title="Joueur lié à un compte" style={{ width: 7, height: 7, borderRadius: '50%', background: '#3cffd0', flexShrink: 0 }}/>
                    )}
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: '#fff' }}>{p.name}</div>
                  </div>
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
