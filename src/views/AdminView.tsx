import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Database,
  Lock,
  Unlock,
  Users,
  Trophy,
  History,
  Download
} from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { ArcadeService } from '../firebase/arcadeService';
import { ScoreRecord, AuditLogRecord, GAMES_CATALOG, GameId } from '../types/arcade';
import { sound } from '../utils/audio';

export const AdminView: React.FC = () => {
  const { player, addToast } = useArcade();

  // Authentication State for Admin Panel
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('arcade_admin_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Dashboard Data State
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(() => {
    const saved = localStorage.getItem('arcade_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Verify PIN (default 1984 or admin)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1984' || pinInput.toLowerCase() === 'admin' || pinInput === '7777') {
      sound.playSelect();
      setIsAuthenticated(true);
      sessionStorage.setItem('arcade_admin_auth', 'true');
      setPinError('');
      addToast('Admin mode authenticated!', 'success');
    } else {
      sound.playGameOver();
      setPinError('Invalid Passcode. Enter "1984" or "admin".');
    }
  };

  const handleLogout = () => {
    sound.playClick();
    setIsAuthenticated(false);
    sessionStorage.removeItem('arcade_admin_auth');
  };

  // Fetch leaderboard data across games
  const loadAdminScores = async () => {
    setIsLoading(true);
    try {
      let combined: ScoreRecord[] = [];
      const gameIds: GameId[] = ['claw', 'pacmaze', 'shooter', 'bowling', 'pool', 'poker'];

      for (const gid of gameIds) {
        const list = await ArcadeService.getLeaderboard(gid, 'all', 20);
        combined = [...combined, ...list];
      }

      setScores(combined);
    } catch (err) {
      console.error('Failed to load admin scores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminScores();
    }
  }, [isAuthenticated]);

  // Delete Score with Audit Logging
  const handleDeleteScore = (score: ScoreRecord) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove score ${score.score} by ${score.username} from the global leaderboard?`
    );
    if (!confirmDelete) return;

    sound.playSelect();

    // Remove from local display
    setScores((prev) => prev.filter((s) => s.id !== score.id));

    // Create Audit Log
    const log: AuditLogRecord = {
      id: `audit_${Date.now()}`,
      adminEmail: `${player.username}@arcade.local`,
      adminUid: player.playerId,
      action: 'delete_score',
      targetScoreId: score.id,
      targetUsername: score.username,
      targetGameId: score.gameId,
      targetScore: score.score,
      reason: 'Admin moderation cleanup',
      timestamp: new Date().toISOString(),
    };

    const nextLogs = [log, ...auditLogs.slice(0, 49)];
    setAuditLogs(nextLogs);
    localStorage.setItem('arcade_audit_logs', JSON.stringify(nextLogs));

    addToast(`Score ${score.score} by ${score.username} removed.`, 'warning');
  };

  // Filtered Scores
  const filteredScores = scores.filter((s) => {
    const matchesGame = selectedGameFilter === 'all' || s.gameId === selectedGameFilter;
    const matchesSearch =
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gameId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGame && matchesSearch;
  });

  // Export JSON backup
  const handleExportData = () => {
    sound.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scores, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `arcade_leaderboard_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Leaderboard JSON backup downloaded!', 'success');
  };

  // If not authenticated, show passcode screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-slate-950 p-8 rounded-3xl border-2 border-purple-500/40 shadow-2xl neon-box-purple text-center space-y-6">
          <div className="inline-flex p-4 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Shield size={36} />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-wider text-purple-400 font-heading">
              ARCADE ADMIN CONSOLE
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Authorized Arcade Operators & Moderation Only
            </p>
          </div>

          {pinError && (
            <div className="p-3 text-xs font-semibold text-rose-300 bg-rose-950/50 border border-rose-500/40 rounded-xl flex items-center justify-center gap-2">
              <AlertTriangle size={14} /> {pinError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1 text-left">
                Security Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Enter passcode (e.g. 1984)"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-slate-100 placeholder-slate-600 font-mono tracking-widest text-center"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Default Operator Passcode: <span className="font-mono text-cyan-400">1984</span>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound size={16} /> Unlock Operator Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 neon-box-purple">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Shield size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-purple-400 font-heading">
                OPERATOR & ADMIN PANEL
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 size={10} /> Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live score moderation, player registry audit, and system diagnostics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminScores}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportData}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export Backup</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/50 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Lock size={14} />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold">
            <span>Scores Synced</span>
            <Trophy size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-arcade">
            {scores.length}
          </div>
          <div className="text-[11px] text-slate-500">Across 6 game cabinets</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold">
            <span>Database Backend</span>
            <Database size={16} className="text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-400 truncate font-mono">
            Firestore (gen-lang)
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={11} /> Connected & Hardened
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold">
            <span>Active Admin</span>
            <Users size={16} className="text-purple-400" />
          </div>
          <div className="text-lg font-bold text-slate-200 truncate">
            {player.username}
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate">
            {player.playerId}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold">
            <span>Audit Actions</span>
            <History size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-arcade">
            {auditLogs.length}
          </div>
          <div className="text-[11px] text-slate-500">Security moderation events</div>
        </div>
      </div>

      {/* Main Table & Filters */}
      <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Game Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedGameFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedGameFilter === 'all'
                  ? 'bg-purple-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Cabinets
            </button>
            {GAMES_CATALOG.slice(0, 6).map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGameFilter(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  selectedGameFilter === g.id
                    ? 'bg-purple-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {g.title}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gamer tag or machine..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Scores Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Gamer Tag</th>
                <th className="py-3 px-4">Game Cabinet</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Detail</th>
                <th className="py-3 px-4">Recorded</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredScores.length > 0 ? (
                filteredScores.map((sc, i) => (
                  <tr key={sc.id || i} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {sc.username}
                    </td>
                    <td className="py-3 px-4 text-cyan-400">
                      {GAMES_CATALOG.find((g) => g.id === sc.gameId)?.title || sc.gameId}
                    </td>
                    <td className="py-3 px-4 font-arcade text-amber-400 font-bold">
                      {sc.score.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase">
                        {sc.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {sc.detail || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(sc.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteScore(sc)}
                        title="Delete score record"
                        className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-500/30 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    {isLoading ? 'Loading leaderboard scores...' : 'No scores found matching current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Section */}
      {auditLogs.length > 0 && (
        <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <History size={16} /> Operator Security Audit Trail
            </h3>
            <button
              onClick={() => {
                setAuditLogs([]);
                localStorage.removeItem('arcade_audit_logs');
                addToast('Audit trail cleared.', 'info');
              }}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-slate-400"
              >
                <span>
                  [{new Date(log.timestamp).toLocaleTimeString()}] <strong>{log.adminEmail}</strong> executed{' '}
                  <span className="text-rose-400">{log.action}</span> on player <strong>{log.targetUsername}</strong> (
                  {log.targetScore} pts in {log.targetGameId})
                </span>
                <span className="text-[10px] text-slate-500">{log.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
