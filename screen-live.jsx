// Triploo — Live scoring screen (the moment of truth)
import React from 'react';
import { TEAM_COLORS, Icon } from './app-state.jsx';
import {
  Mono, Display, LiveDot, PillBtn, ScoreButton, Boule,
} from './ui-kit.jsx';

const LiveScreen = ({
  game,
  onBack,
  onShare,
  layout = 'split',
  lang = 'fr',
  onAddRound,
  onUndoRound,
  onGameFinished,
}) => {
  const [pendingTeam, setPendingTeam] = React.useState(null); // 't1' | 't2'
  const [showEnd, setShowEnd] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const finishedRef = React.useRef(false);

  const rounds = game.rounds || [];

  const score = React.useMemo(() => {
    const o = { t1: 0, t2: 0 };
    rounds.forEach((r) => { o[r.team] += r.points; });
    return o;
  }, [rounds]);

  React.useEffect(() => {
    setShowEnd(false);
    setPendingTeam(null);
    finishedRef.current = false;
  }, [game.id]);

  React.useEffect(() => {
    if ((score.t1 >= game.target || score.t2 >= game.target) && !showEnd) {
      const tmr = setTimeout(() => setShowEnd(true), 800);
      return () => clearTimeout(tmr);
    }
  }, [score.t1, score.t2, game.target, showEnd]);

  React.useEffect(() => {
    if (!showEnd || !onGameFinished || finishedRef.current) return;
    finishedRef.current = true;
    Promise.resolve(onGameFinished(game.id, score)).catch(() => {});
  }, [showEnd, game.id, score, onGameFinished]);

  const submit = async (points) => {
    if (!pendingTeam || busy) return;
    if (onAddRound) {
      setBusy(true);
      try {
        await onAddRound(pendingTeam, points);
      } finally {
        setBusy(false);
      }
    }
    setPendingTeam(null);
  };

  const undo = async () => {
    if (rounds.length === 0 || busy) return;
    if (onUndoRound) {
      setBusy(true);
      try {
        await onUndoRound();
      } finally {
        setBusy(false);
      }
    }
  };

  if (showEnd) return <EndScreen game={game} rounds={rounds} score={score} onBack={onBack} onShare={onShare}/>;

  const leader = score.t1 > score.t2 ? 't1' : (score.t2 > score.t1 ? 't2' : null);
  const cA = TEAM_COLORS[game.teams[0].color];
  const cB = TEAM_COLORS[game.teams[1].color];

  return (
    <div style={{
      background: 'var(--canvas-black)', minHeight: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Compact top bar */}
      <div style={{ padding: '14px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ minWidth: 80 }} aria-hidden="true"/>
        <LiveDot/>
        <button onClick={onShare} style={{
          background: 'transparent', border: 0, color: '#fff', cursor: 'pointer',
          padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
          minWidth: 80, justifyContent: 'flex-end',
        }}>
          <Icon name="share" size={16}/>
          <Mono color="#fff" size={11}>Diffuser</Mono>
        </button>
      </div>

      <div style={{ padding: '4px 18px 6px' }}>
        <Mono color="#949494" size={10} tracking="1.5px" weight={500}>
          MÈNE {rounds.length + 1} · JUSQU'À {game.target} · {game.teams.length} ÉQUIPES
        </Mono>
      </div>

      {/* SPLIT — two halves of the screen, each team's color */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Team A panel */}
        <TeamPanel
          team={game.teams[0]}
          score={score.t1}
          target={game.target}
          isLeading={leader === 't1'}
          flipped={false}
          rounds={rounds.filter(r => r.team === 't1')}
          allRounds={rounds}
          teamId="t1"
          pendingActive={pendingTeam === 't1'}
          busy={busy}
          onTap={() => !busy && setPendingTeam('t1')}
          onSubmit={submit}
          onCancel={() => setPendingTeam(null)}
        />

        {/* Center divider with cochonnet + last mène */}
        <div style={{
          height: 56, background: '#131313', borderTop: '1px solid #fff', borderBottom: '1px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Boule size={14} jack/>
            <Mono color="#ffec3b" size={10} tracking="1.5px">COCHONNET</Mono>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Mono color="#949494" size={9} tracking="1.5px" weight={500}>DERNIÈRE MÈNE</Mono>
            <div style={{ marginTop: 1 }}>
              {rounds.length > 0 ? (
                <Mono color="#fff" size={11} tracking="1.5px">
                  +{rounds[rounds.length - 1].points} · {rounds[rounds.length - 1].team === 't1' ? game.teams[0].name : game.teams[1].name}
                </Mono>
              ) : (
                <Mono color="#949494" size={11} tracking="1.5px">À LANCER</Mono>
              )}
            </div>
          </div>
          <button onClick={undo} disabled={busy || rounds.length === 0} style={{
            background: 'transparent', border: 0, cursor: (rounds.length && !busy) ? 'pointer' : 'not-allowed',
            color: (rounds.length && !busy) ? '#fff' : '#494949', padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="undo" size={14} color={(rounds.length && !busy) ? '#fff' : '#494949'}/>
            <Mono color={(rounds.length && !busy) ? '#fff' : '#494949'} size={10}>UNDO</Mono>
          </button>
        </div>

        {/* Team B panel */}
        <TeamPanel
          team={game.teams[1]}
          score={score.t2}
          target={game.target}
          isLeading={leader === 't2'}
          flipped={true}
          rounds={rounds.filter(r => r.team === 't2')}
          allRounds={rounds}
          teamId="t2"
          pendingActive={pendingTeam === 't2'}
          busy={busy}
          onTap={() => !busy && setPendingTeam('t2')}
          onSubmit={submit}
          onCancel={() => setPendingTeam(null)}
        />
      </div>
    </div>
  );
};

const TeamPanel = ({ team, score, target, isLeading, flipped, rounds, allRounds, teamId, pendingActive, busy, onTap, onSubmit, onCancel }) => {
  const c = TEAM_COLORS[team.color];
  // Total mène contributions for this team — for the timeline
  const myMenes = allRounds.map((r, i) => ({...r, idx: i})).filter(r => r.team === teamId);

  return (
    <div style={{
      flex: 1, background: c.bg, color: c.fg, position: 'relative',
      display: 'flex', flexDirection: 'column',
      minHeight: 0,
    }}>
      {pendingActive ? (
        <ScoreInput onPick={onSubmit} onCancel={onCancel} fg={c.fg} bg={c.bg}/>
      ) : (
        <>
          {/* Team header */}
          <div style={{
            padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', flexDirection: flipped ? 'column-reverse' : 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'baseline' }}>
              <div>
                <Mono color={c.fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)'} size={10} tracking="1.5px">
                  ÉQUIPE · {team.name.toUpperCase()}
                </Mono>
                <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {team.players.map((p, i) => (
                    <Mono key={i} color={c.fg} size={10} tracking="1.1px" weight={700}>
                      {p}{i < team.players.length - 1 ? ' ·' : ''}
                    </Mono>
                  ))}
                </div>
              </div>
              {isLeading && (
                <div style={{
                  background: c.fg, color: c.bg, padding: '4px 10px', borderRadius: 30,
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>AU POINT</div>
              )}
            </div>
          </div>

          {/* The big score */}
          <button type="button" disabled={busy} onClick={onTap} style={{
            flex: 1, background: 'transparent', border: 0, color: c.fg,
            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.55 : 1, padding: '0 18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 14,
            position: 'relative', minHeight: 0,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 'clamp(96px, 30vw, 168px)', lineHeight: 0.85, letterSpacing: '-2px',
              color: c.fg,
            }}>{score}</div>
            <div style={{
              alignSelf: 'flex-end', paddingBottom: 30,
              opacity: 0.6,
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '1.5px', color: c.fg,
              }}>/{target}</div>
              <div style={{ marginTop: 6 }}>
                <Mono color={c.fg} size={9} tracking="1.5px" weight={500}>TAP +</Mono>
              </div>
            </div>
          </button>

          {/* Mène-by-mène timeline */}
          <div style={{
            padding: '0 18px 16px', display: 'flex', alignItems: 'center', gap: 6,
            flexWrap: 'wrap',
          }}>
            <Mono color={c.fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'} size={9} tracking="1.5px" weight={500}>
              MÈNES
            </Mono>
            {myMenes.length === 0 && (
              <Mono color={c.fg === '#fff' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} size={9} tracking="1.5px" weight={500}>
                · EN ATTENTE
              </Mono>
            )}
            {myMenes.map((m, i) => (
              <span key={i} style={{
                background: c.fg, color: c.bg, padding: '3px 8px', borderRadius: 20,
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.8px',
              }}>+{m.points}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ScoreInput = ({ onPick, onCancel, fg, bg }) => {
  return (
    <div style={{ flex: 1, padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mono color={fg} size={11} tracking="1.5px">COMBIEN DE POINTS ?</Mono>
        <button onClick={onCancel} style={{
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4, color: fg,
        }}>
          <Icon name="close" size={14} color={fg}/>
          <Mono color={fg} size={10}>ANNULER</Mono>
        </button>
      </div>
      <div style={{
        flex: 1, marginTop: 12, display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)',
        gap: 10,
      }}>
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button key={n} onClick={() => onPick(n)} style={{
            background: fg, color: bg, border: 0, borderRadius: 24, cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 56,
            lineHeight: 1, letterSpacing: '-1px',
          }}>+{n}</button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Mono color={fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} size={9} tracking="1.5px" weight={500}>
          MAX 6 POINTS · UNE BOULE PAR JOUEUR
        </Mono>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// End-of-game summary
// ─────────────────────────────────────────────────────────────
const EndScreen = ({ game, rounds, score, onBack }) => {
  const winnerId = score.t1 > score.t2 ? 't1' : score.t2 > score.t1 ? 't2' : 't1';
  const loserId = winnerId === 't1' ? 't2' : 't1';
  const winner = winnerId === 't1' ? game.teams[0] : game.teams[1];
  const loser = winnerId === 't1' ? game.teams[1] : game.teams[0];
  const wScore = winnerId === 't1' ? score.t1 : score.t2;
  const lScore = winnerId === 't1' ? score.t2 : score.t1;
  const wColor = TEAM_COLORS[winner.color];

  // Biggest mène, longest streak
  const maxMene = rounds.reduce((m, r) => r.points > m.points ? r : m, { points: 0, team: null });
  const fanny = lScore === 0;

  return (
    <div style={{
      background: wColor.bg, color: wColor.fg, minHeight: '100%',
      padding: 'calc(20px + env(safe-area-inset-top)) 18px 24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Mono color={wColor.fg} size={10} tracking="1.5px" weight={500}>FIN · {rounds.length} MÈNES</Mono>
      </div>

      <div style={{ marginTop: 32 }}>
        <Mono color={wColor.fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} size={11} tracking="1.9px" weight={400}>
          VICTOIRE
        </Mono>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 'clamp(40px, 12vw, 72px)',
          lineHeight: 0.92, marginTop: 10, color: wColor.fg, letterSpacing: '-1px',
          maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>{winner.name}</div>
      </div>

      <div style={{
        marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 'min(14px, 3vw)',
        maxWidth: '100%', flexWrap: 'nowrap',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 0.85,
          fontSize: 'clamp(64px, 22vw, 120px)', color: wColor.fg, letterSpacing: '-2px',
        }}>{wScore}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 0.85,
          fontSize: 'clamp(28px, 9vw, 48px)',
          color: wColor.fg === '#fff' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
        }}>—</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 0.85,
          fontSize: 'clamp(64px, 22vw, 120px)', letterSpacing: '-2px',
          color: wColor.fg === '#fff' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
        }}>{lScore}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <Mono color={wColor.fg} size={10} tracking="1.5px" weight={500}>
          {winner.name.toUpperCase()} CONTRE {loser.name.toUpperCase()}
        </Mono>
      </div>

      {fanny && (
        <div style={{
          marginTop: 24, background: '#131313', color: '#3cffd0', borderRadius: 20,
          padding: '16px 18px',
        }}>
          <Mono color="#3cffd0" size={11} tracking="1.9px">FANNY · 13 À 0</Mono>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500,
            color: '#fff', marginTop: 6, lineHeight: 1.3,
          }}>{loser.name} doit embrasser. C'est la règle.</div>
        </div>
      )}

      {/* Match meta */}
      <div style={{
        marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        <Stat color={wColor} value={`+${maxMene.points}`} label="PLUS GROSSE MÈNE"/>
        <Stat color={wColor} value={rounds.length} label="MÈNES JOUÉES"/>
      </div>

      {/* Mène trace */}
      <div style={{
        marginTop: 22, background: '#131313', color: '#fff', borderRadius: 20,
        padding: '18px 18px',
      }}>
        <Mono color="#3cffd0" size={11} tracking="1.5px">CHRONOLOGIE</Mono>
        <div style={{ marginTop: 12 }}>
          {rounds.map((r, i) => {
            const tc = r.team === 't1' ? TEAM_COLORS[game.teams[0].color] : TEAM_COLORS[game.teams[1].color];
            const cumA = rounds.slice(0, i+1).filter(x=>x.team==='t1').reduce((s,x)=>s+x.points,0);
            const cumB = rounds.slice(0, i+1).filter(x=>x.team==='t2').reduce((s,x)=>s+x.points,0);
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 60px', gap: 10,
                padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #313131',
                alignItems: 'center',
              }}>
                <Mono color="#949494" size={10} tracking="1.5px" weight={500}>M{i+1}</Mono>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%', background: tc.bg,
                  }}/>
                  <Mono color="#fff" size={11} tracking="1.1px">
                    +{r.points} {r.team === 't1' ? game.teams[0].name : game.teams[1].name}
                  </Mono>
                </div>
                <Mono color="#949494" size={10} tracking="1.5px" weight={500} style={{textAlign:'right'}}>
                  {cumA}–{cumB}
                </Mono>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PillBtn variant="ghost" wide icon="share">Partager le récap</PillBtn>
        <PillBtn variant="primary" wide icon="plus" onClick={onBack}>Nouvelle partie</PillBtn>
      </div>
    </div>
  );
};

const Stat = ({ value, label, color }) => (
  <div style={{
    border: `1px solid ${color.fg}`, borderRadius: 20, padding: '14px 16px',
  }}>
    <Display size={36} color={color.fg}>{value}</Display>
    <div style={{ marginTop: 4 }}>
      <Mono color={color.fg === '#fff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} size={9} tracking="1.5px" weight={500}>
        {label}
      </Mono>
    </div>
  </div>
);

export { LiveScreen, EndScreen };
