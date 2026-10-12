import React from 'react';
import {
  Gamepad2,
  Trophy,
  User as UserIcon,
  Volume2,
  VolumeX,
  Tv,
  Edit3,
  Sparkles
} from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { AVATARS } from '../types/arcade';
import { sound } from '../utils/audio';

export const Navbar: React.FC = () => {
  const {
    player,
    activeView,
    setActiveView,
    soundEnabled,
    toggleSound,
    crtEffectEnabled,
    toggleCrtEffect,
    openUsernameModal
  } = useArcade();

  const currentAvatar = AVATARS.find(a => a.id === player.avatarId) || AVATARS[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-purple-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo - ARCADE CLUB */}
        <div
          onClick={() => {
            sound.playClick();
            setActiveView('lobby');
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-500 shadow-md shadow-purple-500/30 group-hover:shadow-cyan-500/40 transition-all duration-300 transform group-hover:scale-105">
            <Gamepad2 className="text-white" size={24} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 font-heading">
                ARCADE CLUB
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded font-arcade">
                1984
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wider hidden sm:block">
              VIRTUAL RETRO MULTIPLAYER HALL
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setActiveView('lobby');
            }}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'lobby'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Gamepad2 size={16} />
            <span>Games</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveView('leaderboards');
            }}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'leaderboards'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Trophy size={16} />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveView('profile');
            }}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'profile'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserIcon size={16} />
            <span>Profile</span>
          </button>
        </nav>

        {/* Controls & Player Profile Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-slate-900/80 border-slate-700 text-cyan-400 hover:border-cyan-500'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* CRT Overlay Toggle */}
          <button
            onClick={toggleCrtEffect}
            title={crtEffectEnabled ? 'Disable CRT Scanlines' : 'Enable CRT Scanlines'}
            className={`p-2 rounded-xl border transition hidden sm:flex cursor-pointer ${
              crtEffectEnabled
                ? 'bg-slate-900/80 border-purple-500/40 text-purple-300 shadow-sm shadow-purple-500/20'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Tv size={18} />
          </button>

          {/* Player Badge with Edit Button */}
          <div
            onClick={openUsernameModal}
            title="Click to edit arcade gamer tag"
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 cursor-pointer transition shadow-inner group"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br ${currentAvatar.bgGradient} border ${currentAvatar.borderClass} shadow`}
            >
              {currentAvatar.emoji}
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-200 max-w-[90px] sm:max-w-[130px] truncate group-hover:text-purple-300">
                  {player.username}
                </span>
                <Edit3 size={11} className="text-slate-500 group-hover:text-cyan-400" />
              </div>
              <span className="text-[10px] text-cyan-400 font-arcade tracking-tight">
                {(player.totalScore || 0).toLocaleString()} PTS
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
