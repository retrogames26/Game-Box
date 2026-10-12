import React, { useState, useEffect, useRef } from 'react';
import { Hammer, Play, RotateCcw, Bot, Sparkles, Award, Zap, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface MoleHole {
  id: number;
  isOpen: boolean;
  type: 'standard' | 'golden' | 'bomb';
  points: number;
  timeLeft: number;
}

export const WhackMoleGame: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  // Match State
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');

  // Human Player Stats
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [molesWhacked, setMolesWhacked] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);

  // AI Opponent Stats (strictly separated)
  const [aiScore, setAiScore] = useState(0);
  const [aiWhacked, setAiWhacked] = useState(0);

  // 9 Burrow Holes State (3x3 grid)
  const [holes, setHoles] = useState<MoleHole[]>(() =>
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      isOpen: false,
      type: 'standard',
      points: 100,
      timeLeft: 0,
    }))
  );

  const [announcement, setAnnouncement] = useState('Whack emerging cyber-moles before they submerge! Avoid glitch bombs.');

  // Timer loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, gameOver]);

  // Mole Popup Spawner Cycle
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const spawner = setInterval(() => {
      setHoles((prevHoles) => {
        const closedIndices = prevHoles
          .map((h, idx) => (!h.isOpen ? idx : -1))
          .filter((idx) => idx !== -1);

        if (closedIndices.length === 0) return prevHoles;

        // Pick 1 to 2 holes to pop up
        const targetIdx = closedIndices[Math.floor(Math.random() * closedIndices.length)];
        const isGolden = Math.random() < 0.2;
        const isBomb = Math.random() < 0.15;

        const next = [...prevHoles];
        next[targetIdx] = {
          id: targetIdx,
          isOpen: true,
          type: isBomb ? 'bomb' : isGolden ? 'golden' : 'standard',
          points: isBomb ? -150 : isGolden ? 300 : 100,
          timeLeft: isGolden ? 900 : 1300,
        };

        return next;
      });
    }, 850);

    return () => clearInterval(spawner);
  }, [isPlaying, gameOver]);

  // Automatic Mole Submerge Timeout
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const submergeTimer = setInterval(() => {
      setHoles((prevHoles) =>
        prevHoles.map((h) => {
          if (!h.isOpen) return h;
          const nextTime = h.timeLeft - 100;
          if (nextTime <= 0) {
            // Submerged without being hit!
            if (h.type !== 'bomb') {
              setCombo(0);
              setMisses((m) => m + 1);
            }
            return { ...h, isOpen: false, timeLeft: 0 };
          }
          return { ...h, timeLeft: nextTime };
        })
      );
    }, 100);

    return () => clearInterval(submergeTimer);
  }, [isPlaying, gameOver]);

  // AI Opponent Reaction Cycle in VS AI Mode
  useEffect(() => {
    if (!isPlaying || gameOver || gameMode !== 'versus_ai') return;

    const aiInterval = setInterval(() => {
      // AI checks for open holes
      const openTargets = holes.filter((h) => h.isOpen && h.type !== 'bomb');
      if (openTargets.length === 0) return;

      // Reflex-Bot has ~75% reaction rate
      if (Math.random() < 0.75) {
        const target = openTargets[Math.floor(Math.random() * openTargets.length)];
        setAiScore((s) => s + target.points);
        setAiWhacked((w) => w + 1);

        // Submerge the hole AI hit
        setHoles((prev) =>
          prev.map((h) => (h.id === target.id ? { ...h, isOpen: false, timeLeft: 0 } : h))
        );
      }
    }, 1200);

    return () => clearInterval(aiInterval);
  }, [isPlaying, gameOver, gameMode, holes]);

  // Player Whack Action on hole
  const handleWhack = (holeIdx: number) => {
    if (!isPlaying || gameOver) return;
    const hole = holes[holeIdx];

    if (!hole.isOpen) {
      sound.playClick();
      setCombo(0);
      return;
    }

    // Whacked an open hole!
    if (hole.type === 'bomb') {
      sound.playGameOver();
      setCombo(0);
      setScore((s) => Math.max(0, s - 150));
      setAnnouncement('BOOM! Hit a glitch bomb! -150 pts penalty!');
    } else {
      sound.playPellet();
      const newCombo = combo + 1;
      setCombo(newCombo);
      const comboMult = newCombo >= 5 ? 2.0 : newCombo >= 3 ? 1.5 : 1.0;
      const pts = Math.round(hole.points * comboMult);

      setScore((s) => s + pts);
      setMolesWhacked((m) => m + 1);

      if (hole.type === 'golden') {
        sound.playPowerPellet();
        setAnnouncement(`GOLDEN MOLE! +${pts} pts (${newCombo}x Combo)!`);
      } else {
        setAnnouncement(`WHACK! +${pts} pts!`);
      }
    }

    // Submerge hole immediately
    setHoles((prev) =>
      prev.map((h) => (h.id === holeIdx ? { ...h, isOpen: false, timeLeft: 0 } : h))
    );
  };

  // Keyboard shortcut keys 1-9 for holes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        handleWhack(num - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, holes, combo]);

  const endGame = () => {
    setGameOver(true);
    setIsPlaying(false);
    sound.playGameOver();

    let result: 'win' | 'loss' | 'draw' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      if (score > aiScore) {
        result = 'win';
        sound.playWinFanfare();
        confetti({ particleCount: 100, spread: 80 });
      } else if (score < aiScore) {
        result = 'loss';
      } else {
        result = 'draw';
      }
    } else {
      if (score >= 1200) {
        sound.playWinFanfare();
        confetti({ particleCount: 90, spread: 70 });
      }
    }

    recordFinishedGame({
      gameId: 'whack',
      score,
      mode: gameMode,
      result,
      aiScore: gameMode === 'versus_ai' ? aiScore : undefined,
      detail: `${molesWhacked} moles whacked (${score} pts)`,
    });
  };

  const startWhack = () => {
    sound.playInsertCoin();
    setScore(0);
    setCombo(0);
    setMolesWhacked(0);
    setMisses(0);
    setTimeLeft(45);
    setAiScore(0);
    setAiWhacked(0);
    setHoles(
      Array.from({ length: 9 }, (_, i) => ({
        id: i,
        isOpen: false,
        type: 'standard',
        points: 100,
        timeLeft: 0,
      }))
    );
    setGameOver(false);
    setIsPlaying(true);
    setAnnouncement('Round live! Whack the emerging cyber-moles!');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 neon-box-purple shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <Hammer size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-rose-400 font-heading">
              WHACK-A-CYBER-MOLE
            </h1>
            <p className="text-xs text-slate-400">
              Reflex Hammer Arena • {gameMode === 'versus_ai' ? 'VS Reflex-Bot AI' : 'Solo High-Score'}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('solo');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              gameMode === 'solo' ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Arena
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              gameMode === 'versus_ai' ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Reflex-Bot
          </button>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Time Left</div>
            <div className={`text-lg font-bold font-arcade ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              {timeLeft}s
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Your Score</div>
            <div className="text-2xl font-black text-rose-400 font-arcade">
              {score}
            </div>
          </div>
          {gameMode === 'versus_ai' && (
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">AI Score</div>
              <div className="text-2xl font-black text-pink-400 font-arcade">
                {aiScore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main 3x3 Hole Burrow Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative select-none">
          {/* 3x3 Grid of Holes */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full max-w-lg aspect-square">
            {holes.map((hole) => (
              <button
                key={hole.id}
                type="button"
                onClick={() => handleWhack(hole.id)}
                className={`relative rounded-3xl border-4 transition-all duration-150 flex flex-col items-center justify-center overflow-hidden cursor-pointer active:scale-90 ${
                  hole.isOpen
                    ? hole.type === 'golden'
                      ? 'bg-amber-950/70 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.6)] animate-bounce'
                      : hole.type === 'bomb'
                      ? 'bg-red-950/80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                      : 'bg-rose-950/70 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Hole Index Key Indicator */}
                <span className="absolute top-2 left-3 text-[10px] font-bold text-slate-500 font-arcade">
                  [{hole.id + 1}]
                </span>

                {/* Emerging Mole Avatar */}
                {hole.isOpen ? (
                  <div className="flex flex-col items-center animate-fade-in">
                    <span className="text-5xl sm:text-6xl drop-shadow-md">
                      {hole.type === 'golden' ? '🐹' : hole.type === 'bomb' ? '💣' : '🦔'}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-arcade mt-1 px-1.5 py-0.5 rounded ${
                        hole.type === 'golden'
                          ? 'bg-amber-400 text-slate-950'
                          : hole.type === 'bomb'
                          ? 'bg-red-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {hole.type === 'golden' ? '+300 GOLD' : hole.type === 'bomb' ? 'BOMB!' : '+100'}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-4 bg-slate-950 rounded-full border border-slate-800/80 shadow-inner" />
                )}
              </button>
            ))}
          </div>

          {/* Start Screen Overlay */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Hammer className="text-rose-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-black text-rose-400 font-heading">
                BURROW ARENA READY
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Click or tap burrows (or use Keys 1-9 on keyboard). Whack glowing cyber-moles, catch golden moles for 3x points, and avoid glitch bombs!
              </p>
              <button
                onClick={startWhack}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-rose-400 to-amber-300 hover:from-rose-300 shadow-xl shadow-rose-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> INSERT TOKEN & WHACK
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-rose-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-rose-400 font-heading">
                ROUND COMPLETED
              </h2>
              <div className="text-lg font-arcade text-amber-400">
                FINAL SCORE: {score} PTS ({molesWhacked} Moles Whacked)
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  Reflex-Bot AI: <strong className="text-pink-400">{aiScore} pts</strong> —{' '}
                  <span className="font-bold text-rose-300">
                    {score > aiScore ? 'VICTORY! YOUR REFLEXES OUTPERFORMED THE AI!' : score < aiScore ? 'AI CLAIMED REFLEX DOMINANCE' : 'TIED DRAW!'}
                  </span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={startWhack}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-rose-500 text-slate-950 hover:bg-rose-400 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/25"
                >
                  <RotateCcw size={14} /> Whack Again
                </button>
                <button
                  onClick={openUsernameModal}
                  className="py-3 px-6 rounded-xl font-bold text-xs bg-slate-900 text-slate-300 border border-slate-700 hover:border-rose-400 transition cursor-pointer"
                >
                  Change Player Tag ({player.username})
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <Sparkles size={14} /> {announcement}
          </div>
        </div>

        {/* Side Panel Guide */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-2">
              <Hammer size={16} /> Reflex Telemetry
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Moles Whacked</span>
                <span className="text-rose-400 font-bold font-arcade">{molesWhacked}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Streak Combo</span>
                <span className="text-emerald-400 font-bold font-arcade">{combo}x</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Missed Targets</span>
                <span className="text-slate-500 font-arcade">{misses}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="font-bold text-slate-300 uppercase text-[10px]">Burrow Targets:</div>
            <div className="text-rose-400">• Standard Mole: 100 pts</div>
            <div className="text-amber-400">• Golden Mole: 300 pts bonus</div>
            <div className="text-red-400">• Glitch Bomb: -150 pts penalty!</div>
            <div>• Keyboard 1-9 directly triggers corresponding hole.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
