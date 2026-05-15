// Triploo — Account screen: display name, account upgrade, sign out
import React from 'react';
import {
  Mono, Eyebrow, Display, PillBtn, ScreenHeader,
} from './ui-kit.jsx';
import {
  setMyDisplayName,
  upgradeToUsername,
  validateUsername,
  signOut,
  fetchMyProfile,
  isPermanentAccount,
} from './lib/auth.js';

export const AccountScreen = ({ profile, onBack, onProfileRefresh, onSignedOut }) => {
  const [name, setName] = React.useState(profile?.display_name || '');
  const [nameBusy, setNameBusy] = React.useState(false);
  const [nameToast, setNameToast] = React.useState(null);
  const [nameErr, setNameErr] = React.useState(null);

  const [permanent, setPermanent] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [upgradeBusy, setUpgradeBusy] = React.useState(false);
  const [upgradeToast, setUpgradeToast] = React.useState(null);
  const [upgradeErr, setUpgradeErr] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    isPermanentAccount().then((v) => { if (!cancelled) setPermanent(v); }).catch(() => {});
    return () => { cancelled = true; };
  }, [profile?.id, upgradeToast]);

  const saveName = async () => {
    setNameErr(null);
    setNameToast(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameErr('Choisis un nom.');
      return;
    }
    setNameBusy(true);
    try {
      await setMyDisplayName(trimmed);
      await onProfileRefresh?.();
      setNameToast('Nom mis à jour.');
      setTimeout(() => setNameToast(null), 2200);
    } catch (e) {
      setNameErr(e?.message || String(e));
    } finally {
      setNameBusy(false);
    }
  };

  const upgrade = async (e) => {
    e?.preventDefault?.();
    setUpgradeErr(null);
    setUpgradeToast(null);
    const u = username.trim().toLowerCase();
    const formatErr = validateUsername(u);
    if (formatErr) { setUpgradeErr(formatErr); return; }
    if (!password || password.length < 6) {
      setUpgradeErr('Mot de passe : 6 caractères minimum');
      return;
    }
    setUpgradeBusy(true);
    try {
      await upgradeToUsername(u, password);
      setUpgradeToast('Compte créé. Tu peux te connecter sur un autre appareil avec ce pseudo et ce mot de passe.');
      setUsername('');
      setPassword('');
      await onProfileRefresh?.();
    } catch (err) {
      setUpgradeErr(err?.message || String(err));
    } finally {
      setUpgradeBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined' && !window.confirm("Se déconnecter ? Au prochain lancement tu repars d'une session vide tant que tu ne te reconnectes pas.")) return;
    try {
      await signOut();
      onSignedOut?.();
    } catch (e) {
      setNameErr(e?.message || String(e));
    }
  };

  return (
    <div style={{ background: 'var(--canvas-black)', minHeight: '100%' }}>
      <ScreenHeader kicker="COMPTE" title="Toi" onBack={onBack}/>

      <div style={{ padding: '14px 18px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Display name */}
        <section style={{ border: '1px solid #309875', borderRadius: 24, padding: 18 }}>
          <Eyebrow color="#3cffd0">TON PSEUDO PUBLIC</Eyebrow>
          <p style={{ marginTop: 8, color: '#949494', fontSize: 13, lineHeight: 1.5 }}>
            Affiché aux autres membres de tes événements.
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="Alice"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12, border: '1px solid #fff',
                background: '#070707', color: '#fff', fontSize: 16, outline: 'none', minWidth: 0,
              }}
            />
            <button
              type="button"
              disabled={nameBusy}
              onClick={saveName}
              style={{
                background: 'var(--jelly-mint)', color: '#000', border: 0, borderRadius: 30,
                padding: '12px 18px', cursor: nameBusy ? 'wait' : 'pointer', opacity: nameBusy ? 0.7 : 1,
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '1.4px', textTransform: 'uppercase', flexShrink: 0,
              }}
            >
              {nameBusy ? '…' : 'Enregistrer'}
            </button>
          </div>
          {nameErr && <Mono color="#ff5e5e" size={12} style={{ display: 'block', marginTop: 10 }}>{nameErr}</Mono>}
          {nameToast && <Mono color="#3cffd0" size={11} style={{ display: 'block', marginTop: 10 }}>{nameToast}</Mono>}
        </section>

        {/* Account upgrade / status */}
        <section style={{ border: '1px solid #309875', borderRadius: 24, padding: 18 }}>
          <Eyebrow color="#3cffd0">COMPTE PERMANENT</Eyebrow>
          {permanent ? (
            <>
              <p style={{ marginTop: 8, color: '#fff', fontSize: 14, lineHeight: 1.5 }}>
                Ton compte est lié. Tu peux te reconnecter sur un autre appareil avec ton pseudo
                {profile?.username ? ` (${profile.username})` : ''} et ton mot de passe.
              </p>
            </>
          ) : (
            <>
              <p style={{ marginTop: 8, color: '#949494', fontSize: 13, lineHeight: 1.5 }}>
                Pour l'instant tu es en session anonyme. Si tu vides ton historique de navigation
                ou changes d'appareil, tu perds l'accès à tes parties.
                Crée un compte pour les retrouver partout.
              </p>
              <form onSubmit={upgrade} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label>
                  <Mono color="#949494" size={10} tracking="1.2px">PSEUDO</Mono>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex. alice_42"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={20}
                    style={{
                      display: 'block', width: '100%', marginTop: 6, padding: '12px 14px',
                      borderRadius: 12, border: '1px solid #fff', background: '#070707', color: '#fff',
                      fontSize: 16, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </label>
                <label>
                  <Mono color="#949494" size={10} tracking="1.2px">MOT DE PASSE</Mono>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6 caractères minimum"
                    autoComplete="new-password"
                    style={{
                      display: 'block', width: '100%', marginTop: 6, padding: '12px 14px',
                      borderRadius: 12, border: '1px solid #fff', background: '#070707', color: '#fff',
                      fontSize: 16, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </label>
                {upgradeErr && <Mono color="#ff5e5e" size={12} style={{ display: 'block', lineHeight: 1.5 }}>{upgradeErr}</Mono>}
                {upgradeToast && <Mono color="#3cffd0" size={11} style={{ display: 'block', lineHeight: 1.5 }}>{upgradeToast}</Mono>}
                <button
                  type="submit"
                  disabled={upgradeBusy}
                  style={{
                    marginTop: 4, width: '100%', padding: '14px 18px', borderRadius: 30, border: 0,
                    background: 'var(--jelly-mint)', color: '#000', fontFamily: 'var(--font-mono)',
                    fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
                    cursor: upgradeBusy ? 'wait' : 'pointer', opacity: upgradeBusy ? 0.7 : 1,
                  }}
                >
                  {upgradeBusy ? '…' : 'Créer mon compte'}
                </button>
              </form>
            </>
          )}
        </section>

        <button
          type="button"
          onClick={handleSignOut}
          style={{
            background: 'transparent', border: '1px solid #313131', color: '#ff7a7a',
            borderRadius: 30, padding: '12px 18px', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
            letterSpacing: '1.4px', textTransform: 'uppercase',
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};
