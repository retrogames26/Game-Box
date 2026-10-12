import React, { createContext, useContext, useEffect, useState } from 'react';
import { ArcadeService } from '../firebase/arcadeService';
import { PlayerRecord, GameId, GAMES_CATALOG } from '../types/arcade';
import { sound } from '../utils/audio';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface ArcadeContextType {
  player: PlayerRecord;
  isLoading: boolean;
  activeView: 'lobby' | 'game' | 'leaderboards' | 'profile';
  selectedGameId: GameId;
  soundEnabled: boolean;
  crtEffectEnabled: boolean;
  usernameModalOpen: boolean;
  toasts: Toast[];
  openUsernameModal: () => void;
  closeUsernameModal: () => void;
  setUsername: (username: string, avatarId?: string) => Promise<void>;
  updateAvatar: (avatarId: string) => Promise<void>;
  setActiveView: (view: 'lobby' | 'game' | 'leaderboards' | 'profile') => void;
  selectGame: (gameId: GameId) => void;
  toggleSound: () => void;
  toggleCrtEffect: () => void;
  refreshPlayer: () => Promise<void>;
  addToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  recordFinishedGame: (params: {
    gameId: GameId;
    score: number;
    mode: 'solo' | 'versus_ai';
    result?: 'win' | 'loss' | 'draw' | 'solo';
    aiScore?: number;
    detail?: string;
  }) => Promise<{ isNewHighScore: boolean }>;
}

const ArcadeContext = createContext<ArcadeContextType | null>(null);

export const ArcadeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const playerId = ArcadeService.getOrCreatePlayerId();
  const initialUsername = ArcadeService.getStoredUsername() || '';
  const initialAvatar = ArcadeService.getStoredAvatar();

  const [player, setPlayer] = useState<PlayerRecord>({
    playerId,
    username: initialUsername || 'ArcadePlayer',
    avatarId: initialAvatar,
    gamesPlayed: 0,
    totalWins: 0,
    totalScore: 0,
    highScores: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'lobby' | 'game' | 'leaderboards' | 'profile'>('lobby');
  const [selectedGameId, setSelectedGameId] = useState<GameId>('claw');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.isEnabled());
  const [crtEffectEnabled, setCrtEffectEnabled] = useState<boolean>(() => {
    return localStorage.getItem('arcade_crt') !== 'false';
  });
  const [usernameModalOpen, setUsernameModalOpen] = useState<boolean>(!initialUsername);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Initialize player data on startup
  useEffect(() => {
    async function init() {
      try {
        const p = await ArcadeService.getOrInitPlayer(player.username, player.avatarId);
        setPlayer(p);
      } catch (err) {
        console.warn('Initializing player from local storage:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const openUsernameModal = () => {
    sound.playSelect();
    setUsernameModalOpen(true);
  };

  const closeUsernameModal = () => {
    sound.playClick();
    setUsernameModalOpen(false);
  };

  const setUsername = async (newUsername: string, avatarId?: string) => {
    const clean = newUsername.trim();
    if (!clean) return;
    sound.playSelect();
    ArcServiceUpdate: {
      ArcadeService.setStoredUsername(clean);
      if (avatarId) ArcadeService.setStoredAvatar(avatarId);
      await ArcadeService.updateUsername(clean);
      if (avatarId) await ArcadeService.updateAvatar(avatarId);
      const updated = await ArcadeService.getOrInitPlayer(clean, avatarId || player.avatarId);
      setPlayer(updated);
    }
    setUsernameModalOpen(false);
    addToast(`Arcade Tag set to "${clean}"!`, 'success');
  };

  const updateAvatar = async (avatarId: string) => {
    sound.playSelect();
    await ArcadeService.updateAvatar(avatarId);
    setPlayer((prev) => ({ ...prev, avatarId }));
    addToast('Avatar updated!', 'success');
  };

  const selectGame = (gameId: GameId) => {
    sound.playInsertCoin();
    setSelectedGameId(gameId);
    setActiveView('game');
  };

  const toggleSound = () => {
    const next = sound.toggleSound();
    setSoundEnabled(next);
  };

  const toggleCrtEffect = () => {
    sound.playClick();
    setCrtEffectEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('arcade_crt', String(next));
      return next;
    });
  };

  const refreshPlayer = async () => {
    const updated = await ArcadeService.getOrInitPlayer(player.username, player.avatarId);
    setPlayer(updated);
  };

  const recordFinishedGame = async (params: {
    gameId: GameId;
    score: number;
    mode: 'solo' | 'versus_ai';
    result?: 'win' | 'loss' | 'draw' | 'solo';
    aiScore?: number;
    detail?: string;
  }) => {
    const gameMeta = GAMES_CATALOG.find((g) => g.id === params.gameId);
    const gameName = gameMeta ? gameMeta.title : params.gameId;

    const res = await ArcadeService.recordGameResult({
      ...params,
      player,
    });

    await refreshPlayer();

    if (res.isNewHighScore) {
      addToast(`NEW HIGH SCORE: ${params.score} in ${gameName}! Saved to Global Leaderboards!`, 'success');
    } else {
      addToast(`Game score ${params.score} saved to Global Leaderboard!`, 'info');
    }

    return res;
  };

  return (
    <ArcadeContext.Provider
      value={{
        player,
        isLoading,
        activeView,
        selectedGameId,
        soundEnabled,
        crtEffectEnabled,
        usernameModalOpen,
        toasts,
        openUsernameModal,
        closeUsernameModal,
        setUsername,
        updateAvatar,
        setActiveView,
        selectGame,
        toggleSound,
        toggleCrtEffect,
        refreshPlayer,
        addToast,
        recordFinishedGame,
      }}
    >
      {children}
    </ArcadeContext.Provider>
  );
};

export const useArcade = () => {
  const context = useContext(ArcadeContext);
  if (!context) throw new Error('useArcade must be used within ArcadeProvider');
  return context;
};
