import React, { useState, useEffect } from 'react';
import { X, UserPlus, LogIn, Sparkles, CheckCircle2, AlertCircle, Shield, Gamepad2 } from 'lucide-react';
import { useArcade } from '../context/ArcadeContext';
import { ArcadeService } from '../firebase/arcadeService';
import { AVATARS } from '../types/arcade';
import { sound } from '../utils/audio';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authModalMode, closeAuthModal, refreshProfile, addToast } = useArcade();
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('cyber_ninja');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(authModalMode);
    setErrorMsg('');
  }, [authModalMode, authModalOpen]);

  // Debounced username availability check
  useEffect(() => {
    if (mode !== 'register') return;
    const clean = username.trim();
    if (clean.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(clean)) {
      setUsernameAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const available = await ArcadeService.isUsernameAvailable(clean);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, mode]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    sound.playSelect();

    try {
      if (mode === 'register') {
        if (!username || username.trim().length < 3) {
          throw new Error('Please choose a gamer username with at least 3 characters.');
        }
        if (usernameAvailable === false) {
          throw new Error('This username is already taken or invalid. Choose another.');
        }
        await ArcadeService.registerUser(email, password, username, selectedAvatar);
        addToast(`Welcome to the arcade, ${username}!`, 'success');
      } else {
        await ArcadeService.loginWithEmail(email, password);
        addToast('Welcome back, player!', 'success');
      }
      await refreshProfile();
      closeAuthModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/email-already-in-use')) {
        setErrorMsg('An account with this email already exists.');
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setErrorMsg('Invalid email or password.');
      } else if (msg.includes('auth/weak-password')) {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(msg.replace(/^Error:\s*/, ''));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    sound.playSelect();
    try {
      await ArcadeService.loginWithGoogle();
      addToast('Google login successful!', 'success');
      await refreshProfile();
      closeAuthModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg.replace(/^Error:\s*/, ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl neon-box-cyan text-slate-100 overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-cyan-400 p-1.5 rounded-lg bg-slate-900 border border-slate-800 transition"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl shadow-lg shadow-cyan-500/20">
            <Gamepad2 className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 font-heading">
              {mode === 'register' ? 'ARCADE REGISTRATION' : 'PLAYER LOGIN'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'register' ? 'Create your gamer profile to save high scores' : 'Insert token and resume your legacy'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 mb-4 text-xs font-medium text-pink-300 bg-pink-950/40 border border-pink-500/40 rounded-xl">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-pink-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              {/* Unique Gamer Tag */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                  Gamer Username <span className="text-pink-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. CyberViper88"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900/90 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-slate-100 placeholder-slate-600 font-medium"
                  />
                  <div className="absolute right-3 top-3 text-xs">
                    {isCheckingUsername ? (
                      <span className="text-amber-400 animate-pulse">Checking...</span>
                    ) : usernameAvailable === true ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={14} /> Available
                      </span>
                    ) : usernameAvailable === false ? (
                      <span className="text-pink-400 flex items-center gap-1 font-semibold">
                        <AlertCircle size={14} /> Taken
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">3-20 characters: letters, numbers, and underscores only</p>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
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
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition ${
                        selectedAvatar === av.id
                          ? 'border-cyan-400 bg-cyan-950/50 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400'
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
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              Email Address <span className="text-pink-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@neonarcade.io"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-900/90 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-slate-100 placeholder-slate-600 font-medium"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              Secret Password <span className="text-pink-400">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-900/90 border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none text-slate-100 placeholder-slate-600 font-medium"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (mode === 'register' && usernameAvailable === false)}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 hover:from-cyan-300 hover:to-teal-200 transition shadow-lg shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-spin text-sm">⟳</span>
            ) : mode === 'register' ? (
              <>
                <UserPlus size={18} /> Register Gamer Profile
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In & Play
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            <span className="px-3 bg-slate-950">OR CONNECT WITH</span>
          </div>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200 text-sm font-semibold transition flex items-center justify-center gap-2.5 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Mode Toggle Footer */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'register' ? (
            <p>
              Already an arcade veteran?{' '}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMode('login');
                }}
                className="font-bold text-cyan-400 hover:underline"
              >
                Log In Here
              </button>
            </p>
          ) : (
            <p>
              New challenger?{' '}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMode('register');
                }}
                className="font-bold text-pink-400 hover:underline"
              >
                Claim Your Gamer Tag
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
