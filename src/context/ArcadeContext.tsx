import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, testFirestoreConnection } from '../firebase/config';
import { ArcadeService } from '../firebase/arcadeService';
import { UserProfile, GameId, AVATARS } from '../types/arcade';
import { sound } from '../utils/audio';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface ArcadeContextType {
  user: User | null;
  profile: UserProfile;
  isGuest: boolean;
  isLoading: boolean;
  activeView: 'lobby' | 'game' | 'leaderboards' | 'profile';
  selectedGameId: GameId;
  soundEnabled: boolean;
  crtEffectEnabled: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  toasts: Toast[];
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setActiveView: (view: 'lobby' | 'game' | 'leaderboards' | 'profile') => void;
  selectGame: (gameId: GameId) => void;
  toggleSound: () => void;
  toggleCrtEffect: () => void;
  refreshProfile: () => Promise<void>;
  updateAvatar: (avatarId: string) => Promise<void>;
  logout: () => Promise<void>;
  addToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  recordFinishedGame: (params: {
    gameId: GameId;
    gameName: string;
    score: number;
    mode: 'solo' | 'versus_ai';
    result?: 'win' | 'loss' | 'solo';
    aiOpponentName?: string;
    aiScore?: number;
    detail?: string;
  }) => Promise<{ isNewHighScore: boolean }>;
}

const GUEST_KEY = 'neon_arcade_guest_profile';

function getInitialGuestProfile(): UserProfile {
  const saved = localStorage.getItem(GUEST_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const guest: UserProfile = {
    userId: `guest_${randomSuffix}`,
    username: `Guest_${randomSuffix}`,
    displayName: `Guest #${randomSuffix}`,
    avatarId: 'pixel_knight',
    totalGamesPlayed: 0,
    totalScore: 0,
    wins: 0,
    losses: 0,
    highScores: {},
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
  return guest;
}

const ArcadeContext = createContext<ArcadeContextType | null>(null);

export const ArcadeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(getInitialGuestProfile);
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'lobby' | 'game' | 'leaderboards' | 'profile'>('lobby');
  const [selectedGameId, setSelectedGameId] = useState<GameId>('claw');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.isEnabled());
  const [crtEffectEnabled, setCrtEffectEnabled] = useState<boolean>(() => {
    return localStorage.getItem('arcade_crt') !== 'false';
  });
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Test connection on boot as mandated
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Listen to Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        try {
          let userProf = await ArcadeService.getUserProfile(currentUser.uid);
          if (!userProf) {
            // Wait brief moment or fetch again
            userProf = {
              userId: currentUser.uid,
              username: currentUser.displayName || `Player_${currentUser.uid.slice(0, 5)}`,
              avatarId: 'cyber_ninja',
              totalGamesPlayed: 0,
              totalScore: 0,
              wins: 0,
              losses: 0,
              highScores: {},
            };
          }
          setProfile(userProf);
          addToast(`Logged in as ${userProf.username}!`, 'success');
        } catch {
          // Keep current profile
        }
      } else {
        setIsGuest(true);
        setProfile(getInitialGuestProfile());
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    sound.playSelect();
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    sound.playClick();
    setAuthModalOpen(false);
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
    setCrtEffectEnabled(prev => {
      const next = !prev;
      localStorage.setItem('arcade_crt', String(next));
      return next;
    });
  };

  const refreshProfile = async () => {
    if (user) {
      const updated = await ArcadeService.getUserProfile(user.uid);
      if (updated) setProfile(updated);
    }
  };

  const updateAvatar = async (avatarId: string) => {
    sound.playSelect();
    if (user) {
      await ArcadeService.updateAvatar(user.uid, avatarId);
      setProfile(prev => ({ ...prev, avatarId }));
      addToast('Avatar updated!', 'success');
    } else {
      const updated = { ...profile, avatarId };
      setProfile(updated);
      localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
      addToast('Guest avatar changed!', 'info');
    }
  };

  const logout = async () => {
    sound.playClick();
    await ArcadeService.logout();
    addToast('Signed out. Switched to Guest mode.', 'info');
  };

  const recordFinishedGame = async (params: {
    gameId: GameId;
    gameName: string;
    score: number;
    mode: 'solo' | 'versus_ai';
    result?: 'win' | 'loss' | 'solo';
    aiOpponentName?: string;
    aiScore?: number;
    detail?: string;
  }) => {
    const currentHigh = profile.highScores[params.gameId] || 0;
    const isNewHighScore = params.score > currentHigh;

    if (!isGuest && user) {
      try {
        await ArcadeService.recordGameResult({
          ...params,
          profile,
        });
        await refreshProfile();
        addToast(
          isNewHighScore
            ? `NEW HIGH SCORE: ${params.score} in ${params.gameName}!`
            : `Score recorded: ${params.score} pts!`,
          'success'
        );
      } catch (err) {
        console.error('Failed to record score:', err);
      }
    } else {
      // Guest local update
      const newHighScores = { ...profile.highScores };
      if (isNewHighScore) {
        newHighScores[params.gameId] = params.score;
      }
      const updated: UserProfile = {
        ...profile,
        totalGamesPlayed: (profile.totalGamesPlayed || 0) + 1,
        totalScore: (profile.totalScore || 0) + params.score,
        highScores: newHighScores,
        wins: params.result === 'win' ? (profile.wins || 0) + 1 : profile.wins,
        losses: params.result === 'loss' ? (profile.losses || 0) + 1 : profile.losses,
      };
      setProfile(updated);
      localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
      addToast(
        `Guest Score: ${params.score}! Log in to enter the Global Leaderboards!`,
        'warning'
      );
    }

    return { isNewHighScore };
  };

  return (
    <ArcadeContext.Provider
      value={{
        user,
        profile,
        isGuest,
        isLoading,
        activeView,
        selectedGameId,
        soundEnabled,
        crtEffectEnabled,
        authModalOpen,
        authModalMode,
        toasts,
        openAuthModal,
        closeAuthModal,
        setActiveView,
        selectGame,
        toggleSound,
        toggleCrtEffect,
        refreshProfile,
        updateAvatar,
        logout,
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
