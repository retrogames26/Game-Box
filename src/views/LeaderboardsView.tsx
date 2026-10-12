import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Play, Bot, Sparkles, RefreshCw, Crown, User as UserIcon } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { ArcadeService } from '../firebase/arcadeService';
import { ScoreRecord, GameId, GAMES_CATALOG, AVATARS } from '../types/arcade';
import { sound } from '../utils/audio';

export const LeaderboardsView: React.FC = () => {
  const { selectedGameId, selectGame } = useArcade();
  const [activeGameId, setActiveGameId] = useState<GameId>(selectedGameId || 'claw');
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Subscribe to live leaderboard updates from Firestore
    const unsubscribe = ArcadeService.subscribeLeaderboard(
      activeGameId,
      (newScores) => {
        setScores(newScores);
        setIsLoading(false);
      },
      30
    );

    return () => unsubscribe();
  }, [activeGameId]);

  const currentGame = GAMES_CATALOG.find((g) => g.id === activeGameId) || GAMES_CATALOG[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title & Marquee */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 neon-box-yellow">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Trophy size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-400 font-heading tracking-wider">
              GLOBAL ARCADE HALL OF FAME
            </h1>
            <p className="text-xs text-slate-400">
              Live verified high scores persisted across all registered players
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playInsertCoin();
            selectGame(activeGameId);
          }}
          className="py-3 px-5 rounded-2xl font-black uppercase text-xs tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
        >
          <Play size={16} fill="currentColor" /> Play {currentGame.title}
        </button>
      </div>

      {/* Game Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {GAMES_CATALOG.map((g) => {
          const isSelected = g.id === activeGameId;
          return (
            <button
              key={g.id}
              onClick={() => {
                sound.playClick();
                setActiveGameId(g.id);
              }}
              className={`px-4 py-3 rounded-2xl font-bold uppercase text-xs whitespace-nowrap tracking-wider transition flex items-center gap-2 border ${
                isSelected
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>{g.title}</span>
            </button>
          );
        })}
      </div>

      {/* Podium for Top 3 */}
      {scores.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Silver (2nd) */}
          <div className="order-2 md:order-1 p-5 rounded-3xl bg-slate-900/80 border border-slate-700 flex flex-col items-center justify-center text-center space-y-3">
            <Medal size={32} className="text-slate-300" />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-slate-800 border-2 border-slate-400">
              {AVATARS.find((a) => a.id === scores[1]?.avatarId)?.emoji || '👾'}
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-slate-400">#2 Silver Medalist</div>
              <div className="text-base font-black text-slate-200">{scores[1]?.username}</div>
              <div className="text-lg font-black text-amber-400 font-arcade mt-1">
                {scores[1]?.score.toLocaleString()} PTS
              </div>
            </div>
          </div>

          {/* Gold (1st) */}
          <div className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-400 flex flex-col items-center justify-center text-center space-y-3 shadow-xl shadow-amber-500/20">
            <Crown size={38} className="text-amber-400 animate-bounce" />
            <div className="w-18 h-18 rounded-2xl flex items-center justify-center text-4xl bg-amber-950/80 border-2 border-amber-400 shadow-lg shadow-amber-500/30">
              {AVATARS.find((a) => a.id === scores[0]?.avatarId)?.emoji || '👑'}
            </div>
            <div>
              <div className="text-xs uppercase font-black tracking-widest text-amber-300">
                #1 GRAND CHAMPION
              </div>
              <div className="text-lg font-black text-white">{scores[0]?.username}</div>
              <div className="text-2xl font-black text-amber-400 font-arcade mt-1">
                {scores[0]?.score.toLocaleString()} PTS
              </div>
            </div>
          </div>

          {/* Bronze (3rd) */}
          <div className="order-3 p-5 rounded-3xl bg-slate-900/80 border border-amber-900/40 flex flex-col items-center justify-center text-center space-y-3">
            <Medal size={32} className="text-amber-600" />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-slate-800 border-2 border-amber-600">
              {AVATARS.find((a) => a.id === scores[2]?.avatarId)?.emoji || '🎮'}
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-slate-400">#3 Bronze Medalist</div>
              <div className="text-base font-black text-slate-200">{scores[2]?.username}</div>
              <div className="text-lg font-black text-amber-400 font-arcade mt-1">
                {scores[2]?.score.toLocaleString()} PTS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm font-heading">
              {currentGame.title} Rankings
            </h3>
          </div>
          <span className="text-xs text-slate-500">{scores.length} verified submissions</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm animate-pulse">
            Connecting to Firestore leaderboard...
          </div>
        ) : scores.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Trophy className="mx-auto text-slate-600" size={40} />
            <div className="text-slate-300 font-bold">No scores posted yet!</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first legend to set the high score on this machine and claim your spot on the podium!
            </p>
            <button
              onClick={() => selectGame(activeGameId)}
              className="mt-2 py-2.5 px-6 rounded-xl font-bold uppercase text-xs bg-amber-400 text-slate-950 hover:bg-amber-300 transition"
            >
              Play & Set Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Game Details</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {scores.map((sc, index) => {
                  const avatar = AVATARS.find((a) => a.id === sc.avatarId) || AVATARS[0];
                  return (
                    <tr
                      key={sc.id || index}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-arcade ${
                            index === 0
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : index === 1
                              ? 'bg-slate-300 text-slate-950 font-bold'
                              : index === 2
                              ? 'bg-amber-700 text-white font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{avatar.emoji}</span>
                          <span className="font-bold text-slate-200 group-hover:text-amber-300 transition">
                            {sc.username}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {sc.mode === 'versus_ai' ? 'VS AI' : 'SOLO'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {sc.detail || 'Standard Match'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-amber-400 font-arcade text-sm">
                          {sc.score.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
