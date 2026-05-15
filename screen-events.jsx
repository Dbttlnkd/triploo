// Triploo — Events: create, detail, aggregated leaderboard
import React from 'react';
import { TEAM_COLORS, Icon } from './app-state.jsx';
import {
  Mono, Eyebrow, Display, PillBtn, ScreenHeader, Boule,
} from './ui-kit.jsx';

function reverseGeocode(lat, lon) {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`,
    { headers: { 'Accept-Language': 'fr' } },
  ).then((r) => {
    if (!r.ok) throw new Error('reverse-geocode failed');
    return r.json();
  });
}

function formatHumanAddress(addr = {}) {
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.county || '';
  const country = addr.country || '';
  return [city, country].filter(Boolean).join(', ');
}

const FieldRow = ({ label, value, onChange, placeholder, icon }) => (
  <div style={{
    background: 'var(--canvas-black)', border: '1px solid #fff', borderRadius: 8,
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
  }}>
    {icon && <Icon name={icon} size={16} color="#949494"/>}
    <div style={{ flex: 1 }}>
      <Mono color="#949494" size={9} tracking="1.5px" weight={500}>{label.toUpperCase()}</Mono>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{
        display: 'block', width: '100%', background: 'transparent', border: 0, outline: 0,
        color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 16, marginTop: 2, padding: 0,
      }}/>
    </div>
  </div>
);

export const CreateEventScreen = ({ onCancel, onCreate, defaultName = 'Événement #1' }) => {
  const [name, setName] = React.useState(defaultName);
  const [place, setPlace] = React.useState('');
  const [placeBusy, setPlaceBusy] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    let cancelled = false;
    setPlaceBusy(true);
    const onSuccess = async (pos) => {
      try {
        const data = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (cancelled) return;
        const human = formatHumanAddress(data.address || {});
        if (human) setPlace((prev) => prev ? prev : human);
      } catch {
        // best-effort
      } finally {
        if (!cancelled) setPlaceBusy(false);
      }
    };
    const onError = () => { if (!cancelled) setPlaceBusy(false); };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 8000, maximumAge: 60000 });
    return () => { cancelled = true; };
  }, []);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await onCreate({ name: name.trim() || 'Événement', place: place.trim() });
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader kicker="NOUVEL ÉVÉNEMENT" title="On organise ?" onBack={onCancel}/>
      <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ color: '#949494', fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          Un événement regroupe plusieurs parties. Le palmarès du jour s'agrège sur les parties qui y sont rattachées.
        </p>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Mono color="#949494" size={10} tracking="1.5px">Détails</Mono>
          <FieldRow label="Nom" value={name} onChange={setName}/>
          <FieldRow
            label="Lieu"
            value={place}
            onChange={setPlace}
            placeholder={placeBusy ? 'Localisation…' : 'Boulodrome, ville…'}
            icon="location"
          />
        </section>
        {err && (
          <Mono color="#ff5e5e" size={12} style={{ lineHeight: 1.5, display: 'block' }}>{err}</Mono>
        )}
        <div>
          <PillBtn variant="primary" wide icon="arrow" onClick={submit}>
            {busy ? 'Création…' : 'Créer l’événement'}
          </PillBtn>
        </div>
      </div>
    </div>
  );
};

function aggregateEventStats(games) {
  const finished = games
    .filter((g) => g.status === 'archived' && g.winner)
    .sort((a, b) => {
      const da = new Date(a._raw?.finished_at || a._raw?.started_at || a._raw?.created_at || 0).getTime();
      const db = new Date(b._raw?.finished_at || b._raw?.started_at || b._raw?.created_at || 0).getTime();
      return da - db;
    });

  const map = new Map();
  for (const g of finished) {
    g.teams.forEach((team) => {
      const isWinning = team.id === g.winner;
      for (const playerName of team.players || []) {
        const name = (playerName || '').trim();
        if (!name) continue;
        if (!map.has(name)) map.set(name, { name, played: 0, wins: 0 });
        const s = map.get(name);
        s.played += 1;
        if (isWinning) s.wins += 1;
      }
    });
  }
  const rows = Array.from(map.values()).map((s) => ({
    ...s,
    ratio: s.played ? Math.round((s.wins / s.played) * 100) : 0,
  }));
  rows.sort((a, b) => (b.wins - a.wins) || (b.ratio - a.ratio) || (b.played - a.played));
  return rows;
}

function TrashIcon({ color = '#949494' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}

export const EventDetailScreen = ({
  event, games, onBack, onAddGame, onOpenGame, onDeleteGame, onFinishEvent, onDeleteEvent,
}) => {
  if (!event) return null;
  const live = games.filter((g) => g.status === 'live');
  const archived = games.filter((g) => g.status === 'archived');
  const stats = React.useMemo(() => aggregateEventStats(games), [games]);
  const top = stats[0];
  const totalGames = games.length;

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader
        kicker={event.status === 'live' ? 'ÉVÉNEMENT · EN COURS' : 'ÉVÉNEMENT · TERMINÉ'}
        title={event.name}
        onBack={onBack}
      />
      <div style={{ padding: '14px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {event.place && (
          <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
            {event.place.toUpperCase()}
          </Mono>
        )}

        {/* Summary tile */}
        <div style={{ background: '#ffec3b', color: '#000', borderRadius: 24, padding: 22 }}>
          <Mono color="rgba(0,0,0,0.65)" size={10} tracking="1.5px">
            PALMARÈS DU JOUR · {totalGames} PARTIE{totalGames > 1 ? 'S' : ''}
          </Mono>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div>
              <Display size={48}>{archived.length}</Display>
              <Mono color="#000" size={11} tracking="1.5px" weight={700}>TERMINÉES</Mono>
            </div>
            <div>
              <Display size={48}>{live.length}</Display>
              <Mono color="#000" size={11} tracking="1.5px" weight={700}>EN COURS</Mono>
            </div>
          </div>
          {top && top.wins > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.2)' }}>
              <Mono color="rgba(0,0,0,0.7)" size={10} tracking="1.5px" weight={500}>
                LEADER · {top.name.toUpperCase()} · {top.wins} VICTOIRE{top.wins > 1 ? 'S' : ''}
              </Mono>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {stats.length > 0 ? (
          <section>
            <Display size={24}>Classement</Display>
            <div style={{ marginTop: 10 }}>
              {stats.map((p, i) => (
                <div key={p.name} style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr auto auto', gap: 12,
                  padding: '12px 0', borderBottom: i === stats.length - 1 ? 'none' : '1px solid #313131',
                  alignItems: 'center',
                }}>
                  <Display size={20} color={i === 0 ? '#3cffd0' : '#fff'}>{i + 1}</Display>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: '#fff' }}>{p.name}</div>
                  <Mono color="#949494" size={10} tracking="1.1px" weight={500}>{p.wins}/{p.played}</Mono>
                  <div style={{ minWidth: 48, textAlign: 'right' }}>
                    <Display size={20} color={p.ratio >= 60 ? '#3cffd0' : '#fff'}>{p.ratio}%</Display>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <Mono color="#949494" size={12} style={{ lineHeight: 1.6, display: 'block' }}>
            Aucune partie terminée pour le moment. Lance la première.
          </Mono>
        )}

        {/* Games list */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Display size={24}>Parties</Display>
            <Mono color="#949494" size={10} tracking="1.5px" weight={500}>{totalGames} AU TOTAL</Mono>
          </div>
          {totalGames === 0 ? (
            <Mono color="#949494" size={12} style={{ display: 'block', marginTop: 10, lineHeight: 1.6 }}>
              Aucune partie dans cet événement pour le moment.
            </Mono>
          ) : (
            <div style={{ marginTop: 10 }}>
              {games.map((g, i) => {
                const isLive = g.status === 'live';
                return (
                  <div key={g.id} onClick={() => onOpenGame?.(g)} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10,
                    padding: '12px 0', borderBottom: i === games.length - 1 ? 'none' : '1px solid #313131',
                    cursor: 'pointer', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                        {g.name}
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                        {g.teams[0] && <Boule size={9} fill={TEAM_COLORS[g.teams[0].color]?.bg}/>}
                        <Mono color="#949494" size={10} tracking="1.1px" weight={500}>
                          {isLive && g.teams[0] && g.teams[1]
                            ? `${g.teams[0].name} vs ${g.teams[1].name}`
                            : g.finalScore && g.teams[0] && g.teams[1]
                              ? `${g.teams[0].name} ${g.finalScore[0]}–${g.finalScore[1]} ${g.teams[1].name}`
                              : 'Partie'}
                        </Mono>
                        {g.teams[1] && <Boule size={9} fill={TEAM_COLORS[g.teams[1].color]?.bg}/>}
                      </div>
                    </div>
                    <Mono color={isLive ? '#3cffd0' : '#949494'} size={10} tracking="1.5px" weight={500}>
                      {isLive ? 'LIVE' : (g.winner === 't1' ? 'WIN A' : 'WIN B')}
                    </Mono>
                    {onDeleteGame && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteGame(g.id); }}
                        aria-label="Supprimer la partie"
                        style={{
                          background: 'transparent', border: 0, padding: 6, cursor: 'pointer',
                          color: '#949494', display: 'inline-flex', alignItems: 'center',
                        }}
                      >
                        <TrashIcon/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {event.status === 'live' && (
            <PillBtn variant="primary" wide icon="plus" onClick={onAddGame}>
              Nouvelle partie
            </PillBtn>
          )}
          {event.status === 'live' && live.length === 0 && archived.length > 0 && onFinishEvent && (
            <PillBtn variant="ghost" wide onClick={onFinishEvent}>
              Terminer l'événement
            </PillBtn>
          )}
          {onDeleteEvent && (
            <button
              type="button"
              onClick={onDeleteEvent}
              style={{
                background: 'transparent', border: '1px solid #313131', color: '#ff7a7a',
                borderRadius: 30, padding: '12px 18px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '1.5px', textTransform: 'uppercase',
              }}
            >
              Supprimer l'événement
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
