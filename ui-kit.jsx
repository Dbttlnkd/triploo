// Triploo — shared UI primitives in the Verge dialect.
import React from 'react';
import { I18N, Icon } from './app-state.jsx';

const Eyebrow = ({ children, color = 'var(--jelly-mint)', size = 11 }) => (
  <span style={{
    fontFamily: 'var(--font-sans)', fontSize: size, fontWeight: 400,
    letterSpacing: '1.8px', textTransform: 'uppercase', color,
  }}>{children}</span>
);

const Mono = ({ children, color = 'var(--text-secondary)', size = 11, tracking = '1.1px', weight = 700 }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: size, fontWeight: weight,
    letterSpacing: tracking, textTransform: 'uppercase', color,
  }}>{children}</span>
);

const Whisper = ({ children, color = 'var(--text-secondary)', size = 13 }) => (
  <span style={{
    fontFamily: 'var(--font-sans)', fontSize: size, fontWeight: 300,
    letterSpacing: '1.9px', textTransform: 'uppercase', color, lineHeight: 1.2,
  }}>{children}</span>
);

const Display = ({ children, size = 60, color = '#fff', style = {} }) => (
  <span style={{
    fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 900,
    lineHeight: 0.95, letterSpacing: '1.07px', color, ...style,
  }}>{children}</span>
);

// Big round buttons for one-thumb operation. Used in scoring.
const ScoreButton = ({ value, onClick, color, fg = '#000', size = 'lg', subtitle }) => {
  const [pressed, setPressed] = React.useState(false);
  const dim = size === 'lg' ? 76 : size === 'md' ? 60 : 48;
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        width: dim, height: dim, border: 0, borderRadius: '50%',
        background: pressed ? 'rgba(140,140,140,0.87)' : color, color: fg,
        fontFamily: 'var(--font-display)', fontWeight: 900,
        fontSize: dim * 0.42, lineHeight: 1, cursor: 'pointer',
        transition: 'background 120ms ease',
        opacity: pressed ? 0.6 : 1, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >+{value}</button>
  );
};

// Mono pill button (the Verge's signature CTA)
const PillBtn = ({ children, onClick, variant = 'primary', wide = false, icon, disabled = false }) => {
  const [hover, setHover] = React.useState(false);
  const base = {
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
    letterSpacing: '1.5px', textTransform: 'uppercase',
    padding: '14px 22px', border: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 30, transition: 'all 150ms ease',
    width: wide ? '100%' : 'auto', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    opacity: disabled ? 0.4 : 1,
  };
  const s = {
    primary: hover && !disabled
      ? { ...base, background: 'rgba(255,255,255,0.2)', color: '#000', boxShadow: 'inset 0 0 0 1px #c2c2c2' }
      : { ...base, background: 'var(--jelly-mint)', color: '#000' },
    violet: hover && !disabled
      ? { ...base, background: 'rgba(255,255,255,0.2)', color: '#fff', boxShadow: 'inset 0 0 0 1px #c2c2c2' }
      : { ...base, background: 'var(--verge-ultraviolet)', color: '#fff' },
    ghost: hover && !disabled
      ? { ...base, background: 'rgba(255,255,255,0.08)', color: '#fff', boxShadow: 'inset 0 0 0 1px #fff' }
      : { ...base, background: 'transparent', color: '#fff', boxShadow: 'inset 0 0 0 1px #fff' },
    danger: { ...base, background: 'transparent', color: 'var(--jelly-mint)', boxShadow: 'inset 0 0 0 1px var(--jelly-mint)', borderRadius: 40 },
  };
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={disabled ? undefined : onClick}
      style={s[variant]}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

// A boule — used decoratively in headers, in the photo result, in tile art.
const Boule = ({ size = 18, fill = '#3cffd0', stroke = '#000', label, jack = false }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: jack ? '#ffec3b' : fill,
      boxShadow: jack ? 'inset 0 0 0 1.5px #131313' : `inset 0 0 0 1px ${stroke}`,
      flexShrink: 0,
    }} />
    {label && <Mono color="#fff" size={11}>{label}</Mono>}
  </span>
);

// Status bar for scoring — nudges the page toward "live broadcast"
const LiveDot = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span style={{
      width: 8, height: 8, borderRadius: '50%', background: '#3cffd0',
      animation: 'triploo-pulse 1400ms ease-in-out infinite',
    }} />
    <Mono color="#3cffd0" size={11}>LIVE</Mono>
  </span>
);

// Generic card. 1px hairline border, no shadow.
const Card = ({ children, accent, padding = 20, onClick, style = {} }) => {
  const accentBg = accent && TEAM_COLORS[accent];
  const isAccent = !!accentBg;
  return (
    <div
      onClick={onClick}
      style={{
        background: isAccent ? accentBg.bg : 'var(--canvas-black)',
        color: isAccent ? accentBg.fg : '#fff',
        border: isAccent ? `1px solid ${accentBg.bg}` : '1px solid #fff',
        borderRadius: 20, padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'color 150ms ease',
        ...style,
      }}
    >{children}</div>
  );
};

// Top mobile chrome for screens (mono kicker + big editorial title)
const ScreenHeader = ({ kicker, title, right, onBack, accent = 'var(--jelly-mint)' }) => (
  <header style={{ padding: '20px 18px 14px', borderBottom: '1px dashed var(--purple-rule)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      {onBack ? (
        <button onClick={onBack} style={{
          background: 'transparent', border: 0, color: '#fff', cursor: 'pointer',
          padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="back" size={16}/>
          <Mono color="#fff" size={11}>Retour</Mono>
        </button>
      ) : <div />}
      {right}
    </div>
    <Eyebrow color={accent}>{kicker}</Eyebrow>
    <div style={{ marginTop: 4 }}>
      <Display size={44} style={{ letterSpacing: '0.5px', lineHeight: 0.92 }}>{title}</Display>
    </div>
  </header>
);

// Bottom tab bar (mono labels, hazard-mint underline on active)
const TabBar = ({ active, onChange, lang = 'fr' }) => {
  const t = I18N[lang];
  const tabs = [
    { id: 'home', icon: 'grid', label: t.parties },
    { id: 'live', icon: 'radio', label: t.enJeu },
    { id: 'photo', icon: 'camera', label: t.quiPointe },
    { id: 'stats', icon: 'spark', label: t.statistiques },
  ];
  return (
    <nav style={{
      borderTop: '1px solid #fff', background: 'var(--canvas-black)',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      padding: '10px 0 14px',
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            padding: '8px 4px', color: isActive ? '#3cffd0' : '#949494',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            boxShadow: isActive ? 'inset 0 -1px 0 0 #3cffd0' : 'none',
            transition: 'color 120ms ease',
          }}>
            <Icon name={tab.icon} size={20} />
            <Mono color={isActive ? '#3cffd0' : '#949494'} size={10} tracking="1.4px">
              {tab.label}
            </Mono>
          </button>
        );
      })}
    </nav>
  );
};

// Mini score pill (used in lists)
const ScorePill = ({ a, b, target = 13 }) => (
  <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
    <Display size={28} color="#fff">{a}</Display>
    <Mono color="#949494" size={11}>—</Mono>
    <Display size={28} color="#fff">{b}</Display>
    <Mono color="#949494" size={10} tracking="1.5px" weight={500}>/{target}</Mono>
  </div>
);

export {
  Eyebrow, Mono, Whisper, Display, ScoreButton, PillBtn, Boule, LiveDot,
  Card, ScreenHeader, TabBar, ScorePill,
};
