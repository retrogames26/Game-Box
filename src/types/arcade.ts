export type GameId = 'claw' | 'pacmaze' | 'shooter' | 'breakout' | 'racer' | 'lander';

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
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName?: string;
  avatarId: string;
  totalGamesPlayed: number;
  totalScore: number;
  wins: number;
  losses: number;
  highScores: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScoreRecord {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  avatarId?: string;
  score: number;
  mode?: 'solo' | 'versus_ai';
  detail?: string;
  createdAt?: string;
}

export interface GameMatchHistory {
  id: string;
  gameId: string;
  gameName: string;
  score: number;
  result?: 'win' | 'loss' | 'solo';
  aiOpponentName?: string;
  aiScore?: number;
  playedAt?: string;
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
    description: 'Control the high-precision robotic grabber, line up the claws, and snatch rare neon holographic prizes for mega ticket points!',
    controls: ['A / D or Left / Right Arrows: Move Claw', 'Space or Down Arrow: Drop Claw', 'Touch / Mouse drag also supported'],
    versusAiName: 'RoboClaw 3000',
    versusAiTitle: 'AI Crane Grandmaster',
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
    description: 'Navigate glowing neon corridors, devour cyber pellets, snatch power nodes, and turn the tables on smart roaming AI hunters!',
    controls: ['WASD or Arrow Keys: Turn Direction', 'Virtual D-Pad on touch devices', 'P: Pause Game'],
    versusAiName: 'Ghost AI Core',
    versusAiTitle: 'Adaptive Hunter AI',
  },
  {
    id: 'shooter',
    title: 'Galactic Cyber Defender',
    tagline: 'Top-Down Star Arena',
    category: 'Action Shooter',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    icon: 'Crosshair',
    difficulty: 'Hard',
    description: 'Pilot an agile Starfighter through enemy drone swarms, collect weapon upgrades, blast dreadnought bosses, and rack up combo multipliers!',
    controls: ['WASD / Arrows: Thrusters & Move', 'Mouse / Touch: Aim & Auto-Fire', 'Space: Super Nova Bomb'],
    versusAiName: 'Viper-7 Ace',
    versusAiTitle: 'Top Gun Combat AI',
  },
  {
    id: 'breakout',
    title: 'Neon Cyber Bricks',
    tagline: 'Paddle Velocity Demolition',
    category: 'Arcade Classic',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    icon: 'Shield',
    difficulty: 'Medium',
    description: 'Smash through neon brick matrices with multi-ball cascades, laser cannons, and speed boosters before the energy balls escape!',
    controls: ['Mouse / Touch / A & D: Slide Paddle', 'Space: Launch / Fire Lasers', 'P: Pause'],
    versusAiName: 'Matrix Reflector',
    versusAiTitle: 'Paddle Defense Unit',
  },
  {
    id: 'racer',
    title: 'Synthwave Highway 84',
    tagline: 'High-Speed Neon Drift',
    category: 'Arcade Racing',
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.6)',
    icon: 'Car',
    difficulty: 'Hard',
    description: 'Scream down a neon grid highway at 280 km/h, draft behind speedsters for slipstream boosts, dodge reckless traffic, and beat the clock!',
    controls: ['A / D or Left / Right: Steer', 'W / Up: Accelerate', 'Shift / Space: Nitro Turbo Boost'],
    versusAiName: 'Shadow-GT',
    versusAiTitle: 'Cyber Street Champion',
  },
  {
    id: 'lander',
    title: 'Astro Gravity Lander',
    tagline: 'Lunar Orbital Physics',
    category: 'Precision Physics',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    icon: 'Rocket',
    difficulty: 'Hard',
    description: 'Manage thrusters and inertial gravity to touch down smoothly on narrow mountain pads, rescue astronaut pods, and conserve rocket fuel!',
    controls: ['W or Up Arrow: Main Thruster', 'A / D or Left / Right: RCS Rotation', 'Space: Stabilizer Thruster'],
    versusAiName: 'Apollo-Drone 9',
    versusAiTitle: 'Precision Orbit AI',
  },
];
