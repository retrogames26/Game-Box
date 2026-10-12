export type GameId = 'claw' | 'pacmaze' | 'shooter' | 'bowling' | 'pool' | 'poker';

export interface GameMetadata {
  id: GameId;
  title: string;
  tagline: string;
  category: string;
  accentColor: string;
  glowColor: string;
  icon: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  controls: string[];
  versusAiName: string;
  versusAiTitle: string;
  sortOrder: 'desc' | 'asc';
  maxScorePossible?: number;
}

export interface PlayerRecord {
  playerId: string;
  username: string;
  avatarId: string;
  gamesPlayed: number;
  totalWins: number;
  totalScore: number;
  highScores: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreRecord {
  id: string;
  playerId: string;
  username: string;
  gameId: GameId;
  score: number;
  mode: 'solo' | 'versus_ai';
  result?: 'win' | 'loss' | 'draw' | 'solo';
  detail?: string;
  createdAt: string;
}

export interface MatchRecord {
  id: string;
  gameId: GameId;
  playerId: string;
  username: string;
  mode: 'solo' | 'versus_ai';
  playerScore: number;
  aiScore: number;
  winner: 'player' | 'ai' | 'draw' | 'solo';
  createdAt: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  borderClass: string;
  bgGradient: string;
}

export const AVATARS: AvatarOption[] = [
  { id: 'cyber_ninja', name: 'Cyber Ninja', emoji: '🥷', borderClass: 'border-cyan-400', bgGradient: 'from-cyan-900 to-blue-950' },
  { id: 'pixel_knight', name: 'Pixel Knight', emoji: '⚔️', borderClass: 'border-purple-400', bgGradient: 'from-purple-900 to-indigo-950' },
  { id: 'robo_ace', name: 'Robo Ace', emoji: '🤖', borderClass: 'border-emerald-400', bgGradient: 'from-emerald-900 to-teal-950' },
  { id: 'neon_cat', name: 'Neon Cat', emoji: '🐱', borderClass: 'border-pink-400', bgGradient: 'from-pink-900 to-fuchsia-950' },
  { id: 'arcade_wizard', name: 'Arcade Wizard', emoji: '🧙‍♂️', borderClass: 'border-amber-400', bgGradient: 'from-amber-900 to-yellow-950' },
  { id: 'synth_rider', name: 'Synth Rider', emoji: '🏍️', borderClass: 'border-red-400', bgGradient: 'from-red-900 to-rose-950' },
  { id: 'alien_invader', name: 'Pixel Alien', emoji: '👾', borderClass: 'border-lime-400', bgGradient: 'from-lime-900 to-green-950' },
  { id: 'mecha_pilot', name: 'Mecha Pilot', emoji: '🚀', borderClass: 'border-sky-400', bgGradient: 'from-sky-900 to-blue-950' },
];

export const GAMES_CATALOG: GameMetadata[] = [
  {
    id: 'claw',
    title: 'Cyber Claw Machine',
    tagline: 'Precision Crane Grabber',
    category: 'Arcade Physics',
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.6)',
    icon: 'Package',
    difficulty: 'Medium',
    description: 'Control the mechanical claw horizontally & vertically, time the drop, and snatch high-value neon plushies & holographic diamonds!',
    controls: ['A / D or Left / Right: Move Claw', 'Space / Down Arrow: Drop Claw', 'Mobile: On-screen buttons or slider'],
    versusAiName: 'RoboClaw 3000',
    versusAiTitle: 'AI Crane Grandmaster',
    sortOrder: 'desc',
  },
  {
    id: 'pacmaze',
    title: 'Neon Maze Runner',
    tagline: 'Cyber Ghost Chase',
    category: 'Retro Maze',
    accentColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.6)',
    icon: 'Ghost',
    difficulty: 'Medium',
    description: 'Navigate glowing neon corridors, devour cyber pellets, snatch power nodes, and defeat 4 AI hunters with distinct chase personalities!',
    controls: ['WASD / Arrow Keys: Move Direction', 'Virtual D-Pad on touch devices', 'P: Pause Game'],
    versusAiName: 'Ghost AI Core',
    versusAiTitle: 'Adaptive Hunter AI',
    sortOrder: 'desc',
  },
  {
    id: 'shooter',
    title: 'Galactic Cyber Defender',
    tagline: 'Top-Down Starfighter Arena',
    category: 'Action Shooter',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    icon: 'Crosshair',
    difficulty: 'Hard',
    description: 'Pilot an agile Starfighter through enemy drone swarms, collect weapon upgrades, detonate EMP bombs, and compete live against AI Ace Viper-7!',
    controls: ['WASD / Arrows: Thrusters & Move', 'Mouse / Touch: Aim & Auto-Fire', 'Space: Super Nova EMP Bomb'],
    versusAiName: 'Viper-7 Ace',
    versusAiTitle: 'Top Gun Combat AI',
    sortOrder: 'desc',
  },
  {
    id: 'bowling',
    title: 'Neon Alley Bowling',
    tagline: '10-Frame Strike Championship',
    category: 'Sports Arcade',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    icon: 'CircleDot',
    difficulty: 'Medium',
    description: 'Authentic 10-pin bowling with full frame-by-frame strike/spare scoring, aim curve, and power meter. Play solo or battle Bowler-Bot 3000!',
    controls: ['Mouse / Touch / Slider: Aim Ball', 'Hold & Release Space / Button: Power Meter', 'A / D: Add Hook Spin'],
    versusAiName: 'StrikeBot 3000',
    versusAiTitle: 'Precision AI Bowler',
    sortOrder: 'desc',
    maxScorePossible: 300,
  },
  {
    id: 'pool',
    title: 'Cyber 8-Ball Pool',
    tagline: 'Precision Billiards Physics',
    category: 'Physics Sports',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    icon: 'Disc',
    difficulty: 'Hard',
    description: 'Full 2D billiard table physics with cue aiming, trajectory guide, power pull-back, solids vs stripes, 8-ball win condition, and smart AI opponent!',
    controls: ['Mouse / Touch: Aim Cue Stick', 'Drag Power Meter & Release to Strike', 'Space: Take Shot'],
    versusAiName: 'Hustler-AI',
    versusAiTitle: 'Master Cue AI',
    sortOrder: 'desc',
  },
  {
    id: 'poker',
    title: 'Neon Hold\'em Poker',
    tagline: 'Virtual High-Stakes Showdown',
    category: 'Card Strategy',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    icon: 'Club',
    difficulty: 'Hard',
    description: 'Free Texas Hold\'em entertainment with virtual chips! Full 52-card deck, community board, authentic hand ranker, Fold/Check/Call/Raise, and 3 AI table rivals!',
    controls: ['Fold / Check / Call / Raise Buttons', 'Bet Slider for Virtual Chips', 'No Real Money (Free Virtual Chips)'],
    versusAiName: 'CyberShark & Table AI',
    versusAiTitle: 'Virtual Cardmasters',
    sortOrder: 'desc',
  },
];
