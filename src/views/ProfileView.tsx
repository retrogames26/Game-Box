import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Trophy,
  Gamepad2,
  Calendar,
  Flame,
  Award,
  Sparkles,
  LogIn,
  LogOut,
  History,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { ArcadeService } from '../firebase/arcadeService';
import { GameMatchHistory, AVATARS, GAMES_CATALOG } from '../types/arcade';
import { sound } from '../utils/audio';

export const ProfileView: React.FC = () => {
  const { profile, isGuest, user, updateAvatar, openAuthModal, logout } = useArcade();
  const [history, setHistory] = useState<GameMatchHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (user && !isGuest) {
      setIsLoadingHistory(true);
      ArcadeService.getUserMatchHistory(user.uid)
        .then((items) => setHistory(items))
        .catch(() => {})
        .finally(() => setIsLoadingHistory(false));
    }
  }, [user, isGuest]);

  const currentAvatar = AVATARS.find((a) => a.id === profile.avatarId) || AVATARS[0];
  const winRate =
    profile.wins + profile.losses > 0
      ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Player Header Card */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-slate-900/90 border border-purple-500/30 neon-box-purple overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Display */}
          <div className="relative group">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl bg-gradient-to-br ${currentAvatar.bgGradient} border-2 ${currentAvatar.borderClass} shadow-xl shadow-purple-500/20`}
            >
              {currentAvatar.emoji}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-wide">
                {profile.username}
              </h1>
              {isGuest ? (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-arcade">
                  GUEST SESSION
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full flex items-center gap-1 font-arcade">
                  <ShieldCheck size={12} /> VERIFIED GAMER
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-2">
              <Calendar size={14} /> Joined:{' '}
              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Today'}
            </p>

            {/* Guest Conversion CTA */}
            {isGuest && (
              <div className="pt-2">
                <button
                  onClick={() => openAuthModal('register')}
                  className="py-2.5 px-4 rounded-xl font-bold uppercase text-xs tracking-wider text-slate-950 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-300 hover:to-rose-300 shadow-md shadow-pink-500/25 transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogIn size={14} /> Claim Permanent Gamer Tag & Save Scores
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isGuest ? (
              <button
                onClick={() => openAuthModal('login')}
                className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={logout}
                className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition flex items-center gap-1.5"
              >
                <LogOut size={14} /> Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
          <Gamepad2 size={22} className="mx-auto text-cyan-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Total Games</div>
          <div className="text-2xl font-black text-cyan-400 font-arcade">
            {profile.totalGamesPlayed || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
          <Trophy size={22} className="mx-auto text-amber-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Total Points</div>
          <div className="text-2xl font-black text-amber-400 font-arcade">
            {(profile.totalScore || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
          <Award size={22} className="mx-auto text-emerald-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">AI Battles Won</div>
          <div className="text-2xl font-black text-emerald-400 font-arcade">
            {profile.wins || 0}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
          <Flame size={22} className="mx-auto text-pink-400 mb-1" />
          <div className="text-[11px] uppercase font-bold text-slate-400">Win Rate</div>
          <div className="text-2xl font-black text-pink-400 font-arcade">
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
          Pick your retro persona shown on game scoreboards and the global leaderboard.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 pt-2">
          {AVATARS.map((av) => {
            const isSelected = profile.avatarId === av.id;
            return (
              <button
                key={av.id}
                onClick={() => updateAvatar(av.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition ${
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
          <Trophy className="text-amber-400" size={18} /> Best Scores by Machine
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES_CATALOG.map((g) => {
            const best = profile.highScores[g.id] || 0;
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

      {/* Recent Match History */}
      {!isGuest && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="font-bold text-slate-200 text-base font-heading uppercase tracking-wider flex items-center gap-2">
            <History className="text-purple-400" size={18} /> Personal Match History
          </h3>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No recorded matches yet. Play any arcade machine to populate your match log!
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.result === 'win'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : m.result === 'loss'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {m.result || 'SOLO'}
                    </span>
                    <span className="font-bold text-slate-200">{m.gameName}</span>
                    {m.aiOpponentName && m.aiOpponentName !== 'None' && (
                      <span className="text-slate-500">vs {m.aiOpponentName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-amber-400 font-arcade">
                      {m.score.toLocaleString()} pts
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      {m.playedAt ? new Date(m.playedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
