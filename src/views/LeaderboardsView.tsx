import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Play, Crown, Calendar, Sparkles, Filter, User as UserIcon } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { ArcadeService } from '../firebase/arcadeService';
import { ScoreRecord, GameId, GAMES_CATALOG, AVATARS } from '../types/arcade';
import { sound } from '../utils/audio';

export const LeaderboardsView: React.FC = () => {
  const { selectedGameId, selectGame, player } = useArcade();
  const [activeGameId, setActiveGameId] = useState<GameId>(selectedGameId || 'claw');
  const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'weekly'>('all');
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    ArcadeService.getLeaderboard(activeGameId, timeFilter, 10)
      .then((data) => {
        setScores(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Leaderboard fetch error:', err);
        setIsLoading(false);
      });
  }, [activeGameId, timeFilter]);

  const currentGame = GAMES_CATALOG.find((g) => g.id === activeGameId) || GAMES_CATALOG[0];

  // Current player's rank in this list
  const playerRankIndex = scores.findIndex((s) => s.playerId === player.playerId);
  const playerPersonalBest = player.highScores[activeGameId] || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title & Marquee */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 neon-box-yellow shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Trophy size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-400 font-heading tracking-wider">
              ARCADE CLUB HALL OF FAME
            </h1>
            <p className="text-xs text-slate-400">
              Live Top 10 rankings fetched directly from Cloud Firestore
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

      {/* Game Selector Tabs */}
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
              className={`px-4 py-3 rounded-2xl font-bold uppercase text-xs whitespace-nowrap tracking-wider transition flex items-center gap-2 border cursor-pointer ${
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

      {/* Filter Tabs (All-Time, Daily, Weekly) & Player Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-amber-400" />
          <span className="text-xs font-bold text-slate-400 uppercase">Time Horizon:</span>
          {(['all', 'daily', 'weekly'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                sound.playClick();
                setTimeFilter(tf);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                timeFilter === tf
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tf === 'all' ? 'All-Time' : tf === 'daily' ? 'Today' : 'This Week'}
            </button>
          ))}
        </div>

        {/* Player's Current Standing Badge */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">Your Personal Record:</span>
          <span className="font-arcade text-amber-400 font-bold">
            {playerPersonalBest.toLocaleString()} PTS
          </span>
          {playerRankIndex >= 0 && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase">
              Rank #{playerRankIndex + 1}
            </span>
          )}
        </div>
      </div>

      {/* Top 3 Podiums */}
      {scores.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Silver #2 */}
          <div className="order-2 md:order-1 p-5 rounded-3xl bg-slate-900/80 border border-slate-700 flex flex-col items-center justify-center text-center space-y-3">
            <Medal size={32} className="text-slate-300" />
            <div className="text-base font-black text-slate-200">{scores[1]?.username}</div>
            <div className="text-xs uppercase font-bold text-slate-400">#2 Silver Medalist</div>
            <div className="text-xl font-black text-amber-400 font-arcade mt-1">
              {scores[1]?.score.toLocaleString()} PTS
            </div>
          </div>

          {/* Gold #1 */}
          <div className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-400 flex flex-col items-center justify-center text-center space-y-3 shadow-xl shadow-amber-500/20">
            <Crown size={38} className="text-amber-400 animate-bounce" />
            <div className="text-xs uppercase font-black tracking-widest text-amber-300">
              #1 ALL-TIME CHAMPION
            </div>
            <div className="text-xl font-black text-white">{scores[0]?.username}</div>
            <div className="text-2xl font-black text-amber-400 font-arcade mt-1">
              {scores[0]?.score.toLocaleString()} PTS
            </div>
          </div>

          {/* Bronze #3 */}
          <div className="order-3 p-5 rounded-3xl bg-slate-900/80 border border-amber-900/40 flex flex-col items-center justify-center text-center space-y-3">
            <Medal size={32} className="text-amber-600" />
            <div className="text-base font-black text-slate-200">{scores[2]?.username}</div>
            <div className="text-xs uppercase font-bold text-slate-400">#3 Bronze Medalist</div>
            <div className="text-xl font-black text-amber-400 font-arcade mt-1">
              {scores[2]?.score.toLocaleString()} PTS
            </div>
          </div>
        </div>
      )}

      {/* Official Top 10 Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm font-heading">
              {currentGame.title} — Official Top 10
            </h3>
          </div>
          <span className="text-xs text-slate-500">{scores.length} verified scores</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm animate-pulse">
            Querying Firestore scores...
          </div>
        ) : scores.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Trophy className="mx-auto text-slate-600" size={40} />
            <div className="text-slate-300 font-bold">No verified scores found for this filter.</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Play a round on this machine now to post the first score to Firestore!
            </p>
            <button
              onClick={() => selectGame(activeGameId)}
              className="mt-2 py-2.5 px-6 rounded-xl font-bold uppercase text-xs bg-amber-400 text-slate-950 hover:bg-amber-300 transition cursor-pointer"
            >
              Play Machine & Set Score
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Player Tag</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Game Detail</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Final Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {scores.map((sc, index) => {
                  const isCurrentPlayer = sc.playerId === player.playerId;

                  return (
                    <tr
                      key={sc.id || index}
                      className={`transition ${
                        isCurrentPlayer
                          ? 'bg-amber-500/15 border-l-4 border-l-amber-400'
                          : 'hover:bg-slate-800/40'
                      }`}
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
                          #{index + 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isCurrentPlayer ? 'text-amber-300' : 'text-slate-200'}`}>
                            {sc.username}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                              YOU
                            </span>
                          )}
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

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {sc.createdAt ? new Date(sc.createdAt).toLocaleDateString() : 'Recent'}
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
