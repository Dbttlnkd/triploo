// Triploo — shared app state, demo data, helpers
import React from 'react';

const I18N = {
  fr: {
    parties: 'Parties',
    enCours: 'En cours',
    archives: 'Archives',
    nouvellePartie: 'Nouvelle partie',
    rejoindre: 'Rejoindre',
    score: 'Score',
    mene: 'Mène',
    menes: 'Mènes',
    fin: 'Fin de partie',
    pointA: 'au point',
    cochonnet: 'Cochonnet',
    quiPointe: 'Qui pointe ?',
    spectateurs: 'Spectateurs',
    inviter: 'Inviter',
    historique: 'Historique',
    statistiques: 'Stats',
    annuler: 'Annuler',
    valider: 'Valider',
    suivante: 'Mène suivante',
    teteATete: 'Tête-à-tête',
    doublette: 'Doublette',
    triplette: 'Triplette',
    equipe: 'Équipe',
    joueurs: 'Joueurs',
    lieu: 'Lieu',
    nomPartie: 'Nom de la partie',
    enJeu: 'En jeu',
    termine: 'Terminée',
    victoire: 'VICTOIRE',
    defaite: 'Défaite',
    parties_jouees: 'Parties jouées',
    ratio: 'Ratio',
    points: 'points',
    contre: 'contre',
    lancer: 'Lancer la partie',
    photoTerrain: 'Photo du terrain',
    analyser: 'Analyser',
    classement: 'Classement des boules',
    enLive: 'EN LIVE',
    derniereMene: 'Dernière mène',
    streamCode: 'Code spectateur',
  },
  en: {
    parties: 'Games',
    enCours: 'Active',
    archives: 'Archive',
    nouvellePartie: 'New game',
    rejoindre: 'Join',
    score: 'Score',
    mene: 'End',
    menes: 'Ends',
    fin: 'Game over',
    pointA: 'leading',
    cochonnet: 'Jack',
    quiPointe: "Who's holding?",
    spectateurs: 'Spectators',
    inviter: 'Invite',
    historique: 'History',
    statistiques: 'Stats',
    annuler: 'Cancel',
    valider: 'Confirm',
    suivante: 'Next end',
    teteATete: 'Singles',
    doublette: 'Doubles',
    triplette: 'Triples',
    equipe: 'Team',
    joueurs: 'Players',
    lieu: 'Place',
    nomPartie: 'Game name',
    enJeu: 'Live',
    termine: 'Finished',
    victoire: 'WIN',
    defaite: 'Loss',
    parties_jouees: 'Games played',
    ratio: 'Win rate',
    points: 'points',
    contre: 'vs',
    lancer: 'Start the game',
    photoTerrain: 'Field photo',
    analyser: 'Analyze',
    classement: 'Boule ranking',
    enLive: 'LIVE',
    derniereMene: 'Last end',
    streamCode: 'Spectator code',
  }
};

// Demo data — a partie in progress, plus archived ones for stats
const DEMO_GAMES = [
  {
    id: 'g1',
    name: 'Coupe du Pin',
    place: 'Boulodrome de Saint-Tropez',
    date: '29 AVR 2026',
    format: 'doublette',
    target: 13,
    status: 'live',
    teams: [
      { id: 't1', name: 'Les Mistraliens', color: 'mint', players: ['Jean-Mi', 'Bruno'] },
      { id: 't2', name: 'Ocre Boys', color: 'violet', players: ['Karim', 'Sandra'] },
    ],
    rounds: [
      { team: 't1', points: 2 },
      { team: 't2', points: 1 },
      { team: 't1', points: 3 },
      { team: 't2', points: 2 },
      { team: 't1', points: 1 },
      { team: 't2', points: 3 },
      { team: 't1', points: 2 }, // 8-6 currently
    ],
    spectators: 4,
    startedAt: '14:32',
  },
  {
    id: 'g2',
    name: 'Tournoi du marché',
    place: 'Place des Lices',
    date: '27 AVR 2026',
    format: 'triplette',
    target: 13,
    status: 'archived',
    teams: [
      { id: 't1', name: 'La Galère', color: 'yellow', players: ['Lulu', 'Marco', 'Yann'] },
      { id: 't2', name: 'Pastis Crew', color: 'pink', players: ['Élise', 'Thierry', 'Nadia'] },
    ],
    rounds: [
      { team: 't1', points: 1 }, { team: 't2', points: 3 }, { team: 't1', points: 2 },
      { team: 't2', points: 1 }, { team: 't1', points: 3 }, { team: 't2', points: 2 },
      { team: 't2', points: 4 }, { team: 't1', points: 1 }, // 7-13 (loss)
    ],
    winner: 't2',
    finalScore: [7, 13],
  },
  {
    id: 'g3',
    name: 'Apéro du dimanche',
    place: 'Cours Lafayette, Toulon',
    date: '20 AVR 2026',
    format: 'doublette',
    target: 13,
    status: 'archived',
    teams: [
      { id: 't1', name: 'Les Mistraliens', color: 'mint', players: ['Jean-Mi', 'Bruno'] },
      { id: 't2', name: 'Boulistes du Var', color: 'orange', players: ['Patricia', 'Hugo'] },
    ],
    winner: 't1',
    finalScore: [13, 9],
  },
  {
    id: 'g4',
    name: 'Match de quartier',
    place: 'Boulodrome de la Plaine',
    date: '14 AVR 2026',
    format: 'teteATete',
    target: 11,
    status: 'archived',
    teams: [
      { id: 't1', name: 'Jean-Mi', color: 'mint', players: ['Jean-Mi'] },
      { id: 't2', name: 'Karim', color: 'electric', players: ['Karim'] },
    ],
    winner: 't1',
    finalScore: [11, 8],
  },
];

const PLAYER_STATS = [
  { name: 'Jean-Mi', played: 24, wins: 17, ratio: 71, role: 'Pointeur' },
  { name: 'Bruno', played: 19, wins: 12, ratio: 63, role: 'Tireur' },
  { name: 'Karim', played: 22, wins: 13, ratio: 59, role: 'Milieu' },
  { name: 'Sandra', played: 18, wins: 11, ratio: 61, role: 'Pointeuse' },
  { name: 'Élise', played: 15, wins: 10, ratio: 67, role: 'Tireuse' },
  { name: 'Marco', played: 12, wins: 5, ratio: 42, role: 'Milieu' },
];

// Color helpers — map team color tokens to canvas palettes
const TEAM_COLORS = {
  mint:     { bg: '#3cffd0', fg: '#000', name: 'Mint' },
  violet:   { bg: '#5200ff', fg: '#fff', name: 'Ultraviolet' },
  yellow:   { bg: '#ffec3b', fg: '#000', name: 'Yellow' },
  pink:     { bg: '#ff5dc8', fg: '#000', name: 'Pink' },
  orange:   { bg: '#ff7a1a', fg: '#000', name: 'Orange' },
  electric: { bg: '#2b6df0', fg: '#fff', name: 'Electric' },
  white:    { bg: '#ffffff', fg: '#000', name: 'White' },
};

// Compute current score from rounds list
function currentScore(game) {
  const out = { t1: 0, t2: 0 };
  (game.rounds || []).forEach(r => { out[r.team] = (out[r.team] || 0) + r.points; });
  return out;
}

// Tiny SVG icons (Lucide-flavored, monoline 1.5px)
const Icon = ({ name, size = 18, color = 'currentColor', stroke = 1.6 }) => {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    back: <><path d="M19 12H5M11 19l-7-7 7-7"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></>,
    check: <><path d="M5 12l5 5L20 7"/></>,
    close: <><path d="M18 6L6 18M6 6l12 12"/></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4zM7 4H4v3a3 3 0 003 3M17 4h3v3a3 3 0 01-3 3"/></>,
    timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></>,
    location: <><path d="M12 22s8-7 8-13a8 8 0 10-16 0c0 6 8 13 8 13z"/><circle cx="12" cy="9" r="3"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></>,
    users: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0M16 4a4 4 0 010 8M22 21a7 7 0 00-5-6.7"/></>,
    undo: <><path d="M9 14l-4-4 4-4"/><path d="M5 10h9a6 6 0 010 12h-3"/></>,
    radio: <><circle cx="12" cy="12" r="3"/><path d="M16 8a6 6 0 010 8M8 8a6 6 0 000 8M19 5a10 10 0 010 14M5 5a10 10 0 000 14"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={color}/></>,
    chevR: <><path d="M9 6l6 6-6 6"/></>,
    chevD: <><path d="M6 9l6 6 6-6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></>,
    spark: <><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

export { I18N, DEMO_GAMES, PLAYER_STATS, TEAM_COLORS, currentScore, Icon };
