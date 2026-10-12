import React from 'react';
import { Play, Trophy, Bot, Flame, Sparkles, Star, Gamepad2, ArrowRight } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { GAMES_CATALOG, GameId } from '../types/arcade';
import { sound } from '../utils/audio';

export const LobbyView: React.FC = () => {
  const { selectGame, profile, setActiveView } = useArcade();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero Marquee Section */}
      <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 border border-cyan-500/30 neon-box-cyan">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-cyan-400" /> RETRO-MODERN ARCADE HALL
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white font-heading">
            STEP UP TO THE{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-pink-500">
              CABINET.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            6 fully functional arcade games with authentic physics engines, custom Web Audio synthesis, real-time AI rivals, and persistent Firebase global leaderboards.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => {
                sound.playInsertCoin();
                selectGame('claw');
              }}
              className="py-3.5 px-6 rounded-2xl font-bold uppercase text-xs sm:text-sm tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Play size={18} fill="currentColor" /> Play Featured: Claw Machine
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveView('leaderboards');
              }}
              className="py-3.5 px-6 rounded-2xl font-bold uppercase text-xs sm:text-sm tracking-wider text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <Trophy size={18} className="text-amber-400" /> View Leaderboards
            </button>
          </div>
        </div>
      </div>

      {/* Arcade Cabinets Grid (6 Games) */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-100 font-heading tracking-wider flex items-center gap-2">
              <Gamepad2 className="text-cyan-400" size={24} /> SELECT YOUR MACHINE
            </h2>
            <p className="text-xs text-slate-400">All games support Solo Play and Versus AI Challenge Mode</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES_CATALOG.map((game) => {
            const personalBest = profile.highScores[game.id] || 0;

            return (
              <div
                key={game.id}
                className="group relative rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-400/60 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl overflow-hidden"
              >
                {/* Top Glowing Header Accent */}
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
                    <h3 className="text-xl font-black text-slate-100 group-hover:text-cyan-300 transition font-heading">
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

                  {/* AI Rival & Personal Best Box */}
                  <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Bot size={14} className="text-cyan-400" /> AI Rival:
                      </span>
                      <span className="font-bold text-slate-200">{game.versusAiName}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Star size={14} className="text-amber-400" /> Your Record:
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
    </div>
  );
};
