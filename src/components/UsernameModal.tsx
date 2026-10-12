import React, { useState, useEffect } from 'react';
import { Gamepad2, Sparkles, Check, X, ShieldAlert } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { AVATARS } from '../types/arcade';
import { sound } from '../utils/audio';

export const UsernameModal: React.FC = () => {
  const { player, usernameModalOpen, closeUsernameModal, setUsername } = useArcade();
  const [nameInput, setNameInput] = useState(player.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatarId || 'cyber_ninja');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (player.username) {
      setNameInput(player.username);
    }
    if (player.avatarId) {
      setSelectedAvatar(player.avatarId);
    }
  }, [player, usernameModalOpen]);

  if (!usernameModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) {
      setErrorMsg('Please enter an arcade username.');
      return;
    }
    if (clean.length < 2) {
      setErrorMsg('Username must be at least 2 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{2,24}$/.test(clean)) {
      setErrorMsg('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setUsername(clean, selectedAvatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-slate-950 border-2 border-purple-500/50 rounded-3xl shadow-2xl neon-box-purple text-slate-100 overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-amber-400" />

        {/* Close Button if user already has a username */}
        {player.username && (
          <button
            onClick={closeUsernameModal}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 transition"
          >
            <X size={18} />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-lg shadow-purple-500/30">
            <Gamepad2 className="text-white" size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 font-heading">
              CHOOSE ARCADE TAG
            </h2>
            <p className="text-xs text-slate-400">
              Welcome to ARCADE CLUB • Instant play, no password required
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
              Gamer Username <span className="text-pink-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={20}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder="e.g. PixelChamp, NeonViper"
              className="w-full px-4 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-slate-100 placeholder-slate-600 font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              2 to 20 characters (letters, numbers, underscores).
            </p>
          </div>

          {/* Avatar Choice */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
              Select Retro Avatar
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedAvatar(av.id);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                    selectedAvatar === av.id
                      ? 'border-cyan-400 bg-cyan-950/60 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">{av.emoji}</span>
                  <span className="text-[10px] text-slate-400 mt-1 truncate max-w-full font-medium">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Guest Identity Note */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <span>
              Your browser ID is paired with this device. No login or password needed. Scores will save to the Global Leaderboard under this tag.
            </span>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 hover:from-purple-300 hover:to-cyan-300 transition shadow-lg shadow-purple-500/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={18} /> ENTER THE ARCADE
          </button>
        </form>
      </div>
    </div>
  );
};
