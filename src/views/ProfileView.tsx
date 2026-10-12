import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Trophy,
  Calendar,
  Flame,
  Award,
  Sparkles,
  Edit3,
  History,
  Check,
  ShieldCheck
} from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { ArcadeService } from '../firebase/arcadeService';
import { ScoreRecord, AVATARS, GAMES_CATALOG } from '../types/arcade';
import { sound } from '../utils/audio';

export const ProfileView: React.FC = () => {
  const { player, updateAvatar, openUsernameModal } = useArcade();
  const [history, setHistory] = useState<ScoreRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    setIsLoadingHistory(true);
    ArcadeService.getPlayerScores(player.playerId)
      .then((items) => setHistory(items))
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingHistory(false));
  }, [player.playerId]);

  const currentAvatar = AVATARS.find((a) => a.id === player.avatarId) || AVATARS[0];
  const winRate =
    player.gamesPlayed > 0
      ? Math.round(((player.totalWins || 0) / player.gamesPlayed) * 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Player Header Card */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-slate-900/90 border-2 border-purple-500/40 neon-box-purple shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl bg-gradient-to-br ${currentAvatar.bgGradient} border-2 ${currentAvatar.borderClass} shadow-xl shadow-purple-500/20`}
            >
              {currentAvatar.emoji}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-wide">
                {player.username}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full flex items-center gap-1 font-arcade">
                <ShieldCheck size={12} /> BROWSER ARCADE TAG
              </span>
            </div>

            <p className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-2">
              <Calendar size={14} /> Created:{' '}
              {player.createdAt ? new Date(player.createdAt).toLocaleDateString() : 'Today'}
            </p>

            <div className="pt-2">
              <button
                onClick={openUsernameModal}
                className="py-2.5 px-4 rounded-xl font-bold uppercase text-xs tracking-wider text-slate-950 bg-gradient-to-r from-purple-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 shadow-md shadow-purple-500/25 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Edit3 size={14} /> Change Display Tag
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-1 shadow-lg">
          <Gamepad2 size={22} className="mx-auto text-purple-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Total Games</div>
          <div className="text-2xl font-black text-purple-400 font-arcade">
            {player.gamesPlayed || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-1 shadow-lg">
          <Trophy size={22} className="mx-auto text-amber-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Lifetime Points</div>
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
          <Flame size={22} className="mx-auto text-rose-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Win Rate</div>
          <div className="text-2xl font-black text-rose-400 font-arcade">
            {winRate}%
          </div>
        </div>
      </div>

      {/* Avatar Customization Drawer */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-200 text-base font-heading uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={18} /> Choose Gamer Avatar
        </h3>
        <p className="text-xs text-slate-400">
          Pick your retro avatar displayed across all 6 arcade games and scoreboards.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 pt-2">
          {AVATARS.map((av) => {
            const isSelected = player.avatarId === av.id;
            return (
              <button
                key={av.id}
                onClick={() => updateAvatar(av.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/20 scale-105 ring-2 ring-cyan-400'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:scale-102'
                }`}
              >
                <span className="text-3xl">{av.emoji}</span>
                <span className="text-[11px] font-bold text-slate-300 mt-2 truncate w-full text-center">
                  {av.name}
                </span>
                {isSelected && (
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-cyan-400 font-semibold">
                    <Check size={12} /> Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* High Scores per Game Machine */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-200 text-base font-heading uppercase tracking-wider flex items-center gap-2">
          <Trophy className="text-amber-400" size={18} /> Personal Bests by Machine
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES_CATALOG.map((g) => {
            const best = player.highScores[g.id] || 0;
            return (
              <div
                key={g.id}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-bold text-slate-200">{g.title}</div>
                  <div className="text-[10px] text-slate-400">{g.category}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-amber-400 font-arcade">
                    {best.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500">POINTS</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player's Own Score History */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-200 text-base font-heading uppercase tracking-wider flex items-center gap-2">
          <History className="text-purple-400" size={18} /> Verified Score History (This Browser)
        </h3>

        {isLoadingHistory ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading Firestore score records...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No completed games recorded yet. Play any machine to record your first score!
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((sc) => {
              const gmeta = GAMES_CATALOG.find((g) => g.id === sc.gameId);
              return (
                <div
                  key={sc.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sc.result === 'win'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : sc.result === 'loss'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {sc.result || 'SOLO'}
                    </span>
                    <span className="font-bold text-slate-200">{gmeta?.title || sc.gameId}</span>
                    <span className="text-slate-500 hidden sm:inline">{sc.detail}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-amber-400 font-arcade">
                      {sc.score.toLocaleString()} PTS
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      {sc.createdAt ? new Date(sc.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
