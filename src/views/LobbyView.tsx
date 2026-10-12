import React, { useState, useEffect } from 'react';
import {
  Play,
  Trophy,
  Bot,
  Flame,
  Sparkles,
  Star,
  Gamepad2,
  Edit3,
  Award,
  CircleDot,
  Disc,
  Club,
  History
} from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { GAMES_CATALOG, GameId, ScoreRecord } from '../types/arcade';
import { ArcadeService } from '../firebase/arcadeService';
import { sound } from '../utils/audio';

export const LobbyView: React.FC = () => {
  const { selectGame, player, setActiveView, openUsernameModal } = useArcade();
  const [recentScores, setRecentScores] = useState<ScoreRecord[]>([]);

  useEffect(() => {
    ArcadeService.getPlayerScores(player.playerId).then(scores => {
      setRecentScores(scores);
    });
  }, [player.playerId]);

  // Find player's highest scoring game
  let highestGameTitle = 'None yet';
  let highestGameScore = 0;
  for (const [gid, sc] of Object.entries(player.highScores || {})) {
    if (sc > highestGameScore) {
      highestGameScore = sc;
      const gmeta = GAMES_CATALOG.find(g => g.id === gid);
      if (gmeta) highestGameTitle = gmeta.title;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero Marquee Section - ARCADE CLUB */}
      <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 border-2 border-purple-500/40 neon-box-purple">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-purple-400" /> CLASSIC 1980s ARCADE HALL
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white font-heading">
            WELCOME TO{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              ARCADE CLUB.
            </span>
          </h1>

          {/* Prominent Player Gamer Tag Display & Edit */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="p-3 bg-slate-900/90 border border-purple-500/40 rounded-2xl flex items-center gap-3 shadow-lg">
              <span className="text-xs uppercase font-bold text-slate-400">Active Player:</span>
              <span className="text-lg font-black text-cyan-300 font-heading tracking-wide">
                {player.username}
              </span>
              <button
                onClick={openUsernameModal}
                className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Edit3 size={12} /> Edit Tag
              </button>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Insert your virtual token into 10 authentic retro arcade games: Claw Machine, Pac-Maze, Neon Bottle Shooter, 10-Frame Bowling, Cyber 8-Ball Pool, Texas Hold'em Poker, Cyber Snake, Cyber Bricks, Cyber Pong, and Whack-a-Mole!
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => {
                sound.playInsertCoin();
                selectGame('claw');
              }}
              className="py-3.5 px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider text-slate-950 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 shadow-lg shadow-purple-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Play size={18} fill="currentColor" /> Play Featured: Claw Machine
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveView('leaderboards');
              }}
              className="py-3.5 px-6 rounded-2xl font-bold uppercase text-xs sm:text-sm tracking-wider text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <Trophy size={18} className="text-amber-400" /> Global Leaderboards
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Player Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-1 shadow-lg">
          <Gamepad2 size={22} className="mx-auto text-purple-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Total Games Played</div>
          <div className="text-2xl font-black text-purple-400 font-arcade">
            {player.gamesPlayed || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-1 shadow-lg">
          <Trophy size={22} className="mx-auto text-amber-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Total Cumulative Score</div>
          <div className="text-2xl font-black text-amber-400 font-arcade">
            {(player.totalScore || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-1 shadow-lg">
          <Award size={22} className="mx-auto text-emerald-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">AI Matches Won</div>
          <div className="text-2xl font-black text-emerald-400 font-arcade">
            {player.totalWins || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-1 shadow-lg">
          <Star size={22} className="mx-auto text-cyan-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Top Scoring Title</div>
          <div className="text-sm font-black text-cyan-400 truncate max-w-full font-heading">
            {highestGameTitle}
          </div>
          <div className="text-[10px] text-slate-400 font-arcade">
            {highestGameScore.toLocaleString()} PTS
          </div>
        </div>
      </div>

      {/* Six Playable Arcade Cabinets Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-100 font-heading tracking-wider flex items-center gap-2">
              <Gamepad2 className="text-purple-400" size={24} /> ARCADE CABINET ROW
            </h2>
            <p className="text-xs text-slate-400">Select any machine to play with keyboard or touch controls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES_CATALOG.map((game) => {
            const personalBest = player.highScores[game.id] || 0;

            return (
              <div
                key={game.id}
                className="group relative rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-400/60 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl overflow-hidden shadow-lg"
              >
                {/* Header Accent Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2"
                  style={{ backgroundColor: game.accentColor }}
                />

                <div className="space-y-4">
                  {/* Category & Difficulty Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {game.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        game.difficulty === 'Easy'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : game.difficulty === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {game.difficulty}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-xl font-black text-slate-100 group-hover:text-purple-300 transition font-heading">
                      {game.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      {game.tagline}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>

                  {/* AI Rival & Personal Record */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Bot size={14} className="text-cyan-400" /> AI Opponent:
                      </span>
                      <span className="font-bold text-slate-200">{game.versusAiName}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Star size={14} className="text-amber-400" /> Your Best:
                      </span>
                      <span className="font-bold text-amber-400 font-arcade">
                        {personalBest.toLocaleString()} PTS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Launch Machine Button */}
                <button
                  type="button"
                  onClick={() => selectGame(game.id)}
                  className="mt-6 w-full py-3.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider text-slate-950 transition flex items-center justify-center gap-2 group-hover:scale-[1.02] shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: game.accentColor,
                    boxShadow: `0 4px 14px ${game.glowColor}`,
                  }}
                >
                  <Play size={16} fill="currentColor" /> INSERT TOKEN & PLAY
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recently Played Games Section */}
      {recentScores.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-base font-heading uppercase tracking-wider flex items-center gap-2">
              <History className="text-cyan-400" size={18} /> Recently Finished Matches
            </h3>
            <span className="text-xs text-slate-500">Live from Firestore</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentScores.slice(0, 4).map(sc => {
              const gmeta = GAMES_CATALOG.find(g => g.id === sc.gameId);
              return (
                <div
                  key={sc.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{gmeta?.title || sc.gameId}</div>
                    <div className="text-[10px] text-slate-500">{sc.detail || 'Standard Match'}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-900">
                    <span className="text-xs font-black text-amber-400 font-arcade">
                      {sc.score.toLocaleString()} PTS
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {sc.mode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
