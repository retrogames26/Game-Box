import React from 'react';
import { ArrowLeft, Gamepad2, Info, Keyboard, Sparkles, Trophy } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { GAMES_CATALOG, GameId } from '../types/arcade';
import { sound } from '../utils/audio';

import { ClawMachine } from '../games/ClawMachine';
import { PacMaze } from '../games/PacMaze';
import { ShootingArena } from '../games/ShootingArena';
import { Breakout } from '../games/Breakout';
import { NeonRacer } from '../games/NeonRacer';
import { LunarLander } from '../games/LunarLander';

export const GameView: React.FC = () => {
  const { selectedGameId, setActiveView, selectGame } = useArcade();

  const game = GAMES_CATALOG.find((g) => g.id === selectedGameId) || GAMES_CATALOG[0];

  const renderGameComponent = () => {
    switch (selectedGameId) {
      case 'claw':
        return <ClawMachine />;
      case 'pacmaze':
        return <PacMaze />;
      case 'shooter':
        return <ShootingArena />;
      case 'breakout':
        return <Breakout />;
      case 'racer':
        return <NeonRacer />;
      case 'lander':
        return <LunarLander />;
      default:
        return <ClawMachine />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            sound.playClick();
            setActiveView('lobby');
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft size={16} /> Exit to Lobby
        </button>

        {/* Quick Cabinet Selector Dropdown/Tabs */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {GAMES_CATALOG.map((g) => {
            const isCurrent = g.id === selectedGameId;
            return (
              <button
                key={g.id}
                onClick={() => selectGame(g.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  isCurrent
                    ? 'bg-slate-800 text-cyan-300 shadow border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {g.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Game */}
      <div className="flex justify-center">
        {renderGameComponent()}
      </div>

      {/* Control Guide & Lore Footer */}
      <div className="max-w-5xl mx-auto p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-900 text-cyan-400 border border-slate-800">
            <Keyboard size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Input Controls
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-0.5">
              {game.controls.map((ctrl, i) => (
                <span key={i}>• {ctrl}</span>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            setActiveView('leaderboards');
          }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/30 border border-amber-500/30 hover:bg-amber-900/40 transition"
        >
          <Trophy size={14} /> View Machine Leaderboard
        </button>
      </div>
    </div>
  );
};
