export type GameId =
  | 'claw'
  | 'pacmaze'
  | 'shooter'
  | 'bowling'
  | 'pool'
  | 'poker'
  | 'snake'
  | 'breakout'
  | 'pong'
  | 'whack';

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

export interface ScoreSubmissionPrompt {
  gameId: GameId;
  gameName: string;
  score: number;
  personalBest: number;
  mode: 'solo' | 'versus_ai';
  result?: 'win' | 'loss' | 'draw' | 'solo';
  aiScore?: number;
  detail?: string;
  onPlayAgain: () => void;
  onDismiss: () => void;
}

export interface AuditLogRecord {
  id: string;
  adminEmail: string;
  adminUid: string;
  action: 'delete_score' | 'ban_player';
  targetScoreId: string;
  targetUsername: string;
  targetGameId: string;
  targetScore: number;
  reason: string;
  timestamp: string;
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
    description: 'Control the physical mechanical claw horizontally along the rail, drop into the prize bed, and hoist rare plushies to the delivery chute!',
    controls: ['A / D or Left / Right: Move Crane', 'Space or Down Arrow: Drop Claw', 'Mobile: Left/Right & Drop Buttons'],
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
    title: 'Neon Bottle Shooter',
    tagline: 'Carnival Shooting Gallery',
    category: 'Target Gallery',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    icon: 'Crosshair',
    difficulty: 'Medium',
    description: 'Aim with laser precision at shelves of glowing carnival bottles! Break glass bottles, reload your magazine, score combos, and challenge Sharpshooter-AI!',
    controls: ['Mouse / Touch / Crosshair: Aim Target', 'Click / Tap / Space: Fire Rifle', 'R or Reload Button: Refill Magazine'],
    versusAiName: 'Sharpshooter-AI',
    versusAiTitle: 'Carnival Marksman AI',
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
    description: 'Authentic 10-pin bowling with full frame-by-frame strike/spare scoring, aim curve, and power meter. Play solo or battle StrikeBot 3000!',
    controls: ['Left / Right Arrows or Slider: Adjust Stance', 'Press & Release Space: Time Throw Power', 'A / D: Add Hook Spin'],
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
    controls: ['Mouse / Touch: Aim Cue Stick', 'Power Bar: Adjust Strike Force', 'Click SHOOT Button or Table to Strike'],
    versusAiName: 'Hustler-AI',
    versusAiTitle: 'Master Cue AI',
    sortOrder: 'desc',
  },
  {
    id: 'poker',
    title: 'Neon Hold\'em Poker',
    tagline: 'Multiplayer & AI High Stakes',
    category: 'Card Strategy',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    icon: 'Club',
    difficulty: 'Hard',
    description: 'Free Texas Hold\'em entertainment with virtual chips! Real online multiplayer rooms (Create/Join Room) or Solo vs 3 AI rivals, complete 52-card deck, and strict betting rounds!',
    controls: ['Fold / Check / Call / Raise Buttons', 'Virtual Chip Bet Slider', 'Create / Join Multiplayer Room Code'],
    versusAiName: 'CyberShark & Table AI',
    versusAiTitle: 'Virtual Cardmasters',
    sortOrder: 'desc',
  },
  {
    id: 'snake',
    title: 'Cyber Neon Snake',
    tagline: 'Grid Byte Devourer',
    category: 'Arcade Classic',
    accentColor: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.6)',
    icon: 'Activity',
    difficulty: 'Easy',
    description: 'Guide the glowing neon cyber-snake, devour energy nodes to grow, avoid wall & tail collisions, and challenge AI Python-Core in a high-score showdown!',
    controls: ['WASD / Arrow Keys: Move Direction', 'Virtual D-Pad on mobile', 'Space: Boost Speed'],
    versusAiName: 'Python-Core AI',
    versusAiTitle: 'Neural Serpent AI',
    sortOrder: 'desc',
  },
  {
    id: 'breakout',
    title: 'Neon Cyber Bricks',
    tagline: 'Paddle Demolition Matrix',
    category: 'Arcade Classic',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    icon: 'Layers',
    difficulty: 'Medium',
    description: 'Smash through multi-hit armored neon bricks, trigger power-ups and multi-balls, deflect at sharp angles, and battle Reflector-AI for the top score!',
    controls: ['Mouse / Touch / A & D: Slide Paddle', 'Space / Tap: Launch Ball', 'P: Pause Game'],
    versusAiName: 'Reflector-AI',
    versusAiTitle: 'Paddle Defense Unit',
    sortOrder: 'desc',
  },
  {
    id: 'pong',
    title: 'Neon Cyber Pong',
    tagline: 'Twin Paddle Vector Duel',
    category: 'Retro Sports',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    icon: 'Divide',
    difficulty: 'Medium',
    description: 'The classic high-speed duel! Curved vector spin reflections, rally acceleration, local 2-player or VS Vector-Pong AI mode with independent scoring.',
    controls: ['W / S or Up / Down or Touch: Move Paddle', 'Local 2P: Left (W/S) & Right (Arrows)'],
    versusAiName: 'Vector-Pong 9',
    versusAiTitle: 'Adaptive Paddle AI',
    sortOrder: 'desc',
  },
  {
    id: 'whack',
    title: 'Whack-A-Cyber-Mole',
    tagline: 'Reflex Hammer Arena',
    category: 'Reflex Arcade',
    accentColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.6)',
    icon: 'Hammer',
    difficulty: 'Medium',
    description: 'Fast-paced carnival reaction game! Whack emerging neon cyber-moles across 9 burrow pads, hit golden bonus moles, avoid hazards, and out-react Reflex-Bot!',
    controls: ['Click / Tap Burrow Holes 1-9', 'Keys 1-9 on Numpad / Top Row', '45-Second Timed Round'],
    versusAiName: 'Reflex-Bot',
    versusAiTitle: 'High-Speed Reflex AI',
    sortOrder: 'desc',
  },
];
