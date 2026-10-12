/**
 * Neon Arcade Universe - Main Application Entry
 */

import React from 'react';
import { ArcadeProvider, useArcade } from './context/ArcadeContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/ToastContainer';
import { LobbyView } from './views/LobbyView';
import { GameView } from './views/GameView';
import { LeaderboardsView } from './views/LeaderboardsView';
import { ProfileView } from './views/ProfileView';
import { Gamepad2, Volume2, Shield, Sparkles } from 'lucide-react';

const ArcadeMain: React.FC = () => {
  const { activeView, crtEffectEnabled, soundEnabled, toggleSound } = useArcade();

  return (
    <div className={`min-h-screen bg-[#05050d] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black ${crtEffectEnabled ? 'crt-overlay crt-vignette' : ''}`}>
      {/* Top Navbar */}
      <Navbar />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'lobby' && <LobbyView />}
        {activeView === 'game' && <GameView />}
        {activeView === 'leaderboards' && <LeaderboardsView />}
        {activeView === 'profile' && <ProfileView />}
      </main>

      {/* Retro Arcade Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950/90 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="text-cyan-400" size={18} />
            <span className="font-heading font-black text-slate-300 tracking-wider">
              NEON ARCADE UNIVERSE
            </span>
            <span className="text-[10px] text-slate-600">v2.0 • 6 CABIN MACHINES</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <Sparkles size={12} className="text-cyan-400" /> Web Audio Synthesizer
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Shield size={12} className="text-purple-400" /> Firebase Cloud Firestore
            </span>
          </div>

          <div className="text-[10px] text-slate-600">
            © 2026 Retro-Modern Arcade Platform • All Rights Reserved
          </div>
        </div>
      </footer>

      {/* Global Modals & Notifications */}
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ArcadeProvider>
      <ArcadeMain />
    </ArcadeProvider>
  );
}
