import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, RotateCcw, Bot, Sparkles, Award, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface Point {
  x: number;
  y: number;
}

export const SnakeGame: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const GRID_SIZE = 20; // 20px per cell
  const COLS = 26;
  const ROWS = 22;

  // Game configuration
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');

  // Human player state
  const [score, setScore] = useState(0);
  const [applesEaten, setApplesEaten] = useState(0);
  const [speed, setSpeed] = useState(120);

  // AI Opponent state (strictly separated)
  const [aiScore, setAiScore] = useState(0);
  const [aiLength, setAiLength] = useState(3);
  const [aiIsAlive, setAiIsAlive] = useState(true);

  // Snake references for live game loop
  const snakeRef = useRef<Point[]>([
    { x: 8, y: 11 },
    { x: 7, y: 11 },
    { x: 6, y: 11 },
  ]);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 18, y: 11 });
  const goldenFoodRef = useRef<Point | null>(null);

  // AI Snake reference
  const aiSnakeRef = useRef<Point[]>([
    { x: 18, y: 5 },
    { x: 19, y: 5 },
    { x: 20, y: 5 },
  ]);
  const aiDirRef = useRef<Point>({ x: -1, y: 0 });

  const [announcement, setAnnouncement] = useState('Slither, devour glowing byte orbs, and grow your cyber tail!');

  // Spawn food safely
  const spawnFood = () => {
    let newX = Math.floor(Math.random() * COLS);
    let newY = Math.floor(Math.random() * ROWS);
    while (snakeRef.current.some((s) => s.x === newX && s.y === newY)) {
      newX = Math.floor(Math.random() * COLS);
      newY = Math.floor(Math.random() * ROWS);
    }
    foodRef.current = { x: newX, y: newY };

    // Chance for golden food
    if (Math.random() < 0.25) {
      goldenFoodRef.current = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } else {
      goldenFoodRef.current = null;
    }
  };

  // Keyboard controls (Arrow keys and WASD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cur = dirRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && cur.y === 0) {
        nextDirRef.current = { x: 0, y: -1 };
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && cur.y === 0) {
        nextDirRef.current = { x: 0, y: 1 };
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && cur.x === 0) {
        nextDirRef.current = { x: -1, y: 0 };
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && cur.x === 0) {
        nextDirRef.current = { x: 1, y: 0 };
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Direction changer buttons for mobile
  const setDirection = (dx: number, dy: number) => {
    const cur = dirRef.current;
    if (dx !== 0 && cur.x === 0) nextDirRef.current = { x: dx, y: 0 };
    if (dy !== 0 && cur.y === 0) nextDirRef.current = { x: 0, y: dy };
  };

  // Main game tick interval
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const interval = setInterval(() => {
      // 1. Update Direction
      dirRef.current = nextDirRef.current;
      const head = { ...snakeRef.current[0] };
      head.x += dirRef.current.x;
      head.y += dirRef.current.y;

      // 2. Wall Collisions
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        endGame();
        return;
      }

      // 3. Self Collisions
      if (snakeRef.current.some((seg) => seg.x === head.x && seg.y === head.y)) {
        endGame();
        return;
      }

      // 4. Food Collection
      let grew = false;
      let pointsAwarded = 0;
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        sound.playPellet();
        pointsAwarded += 100;
        setApplesEaten((a) => a + 1);
        spawnFood();
        grew = true;
        // Increase speed slightly
        setSpeed((prev) => Math.max(70, prev - 2));
      } else if (goldenFoodRef.current && head.x === goldenFoodRef.current.x && head.y === goldenFoodRef.current.y) {
        sound.playPowerPellet();
        pointsAwarded += 300;
        goldenFoodRef.current = null;
        grew = true;
      }

      if (pointsAwarded > 0) {
        setScore((s) => s + pointsAwarded);
      }

      const nextSnake = [head, ...snakeRef.current];
      if (!grew) {
        nextSnake.pop();
      }
      snakeRef.current = nextSnake;

      // 5. AI Snake step in VS AI mode
      if (gameMode === 'versus_ai' && aiIsAlive) {
        updateAiSnake();
      }

      // Render updated frame
      renderCanvas();
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, speed, gameMode, aiIsAlive]);

  // AI Snake Pathfinding Heuristic
  const updateAiSnake = () => {
    const aiHead = { ...aiSnakeRef.current[0] };
    const target = foodRef.current;

    // Determine direction towards target
    let targetDx = 0;
    let targetDy = 0;
    if (target.x > aiHead.x) targetDx = 1;
    else if (target.x < aiHead.x) targetDx = -1;
    else if (target.y > aiHead.y) targetDy = 1;
    else if (target.y < aiHead.y) targetDy = -1;

    // Avoid reversing directly
    if (targetDx !== 0 && aiDirRef.current.x === -targetDx) {
      targetDx = 0;
      targetDy = 1;
    }

    aiHead.x += targetDx;
    aiHead.y += targetDy;

    // Check AI boundaries
    if (aiHead.x < 0 || aiHead.x >= COLS || aiHead.y < 0 || aiHead.y >= ROWS) {
      setAiIsAlive(false);
      return;
    }

    let aiGrew = false;
    if (aiHead.x === foodRef.current.x && aiHead.y === foodRef.current.y) {
      setAiScore((s) => s + 100);
      setAiLength((l) => l + 1);
      spawnFood();
      aiGrew = true;
    }

    const nextAi = [aiHead, ...aiSnakeRef.current];
    if (!aiGrew) nextAi.pop();
    aiSnakeRef.current = nextAi;
  };

  // Canvas Drawing
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background & Subtle Grid
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * GRID_SIZE, 0);
      ctx.lineTo(c * GRID_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * GRID_SIZE);
      ctx.lineTo(canvas.width, r * GRID_SIZE);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw Standard Food
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
      foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Draw Golden Food
    if (goldenFoodRef.current) {
      ctx.save();
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(
        goldenFoodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
        goldenFoodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // Draw Player Snake
    snakeRef.current.forEach((seg, i) => {
      ctx.save();
      ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = i === 0 ? 12 : 6;
      ctx.beginPath();
      ctx.roundRect(
        seg.x * GRID_SIZE + 1.5,
        seg.y * GRID_SIZE + 1.5,
        GRID_SIZE - 3,
        GRID_SIZE - 3,
        i === 0 ? 5 : 3
      );
      ctx.fill();

      // Eyes on head
      if (i === 0) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(seg.x * GRID_SIZE + 6, seg.y * GRID_SIZE + 6, 2, 0, Math.PI * 2);
        ctx.arc(seg.x * GRID_SIZE + 14, seg.y * GRID_SIZE + 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw AI Snake (if active)
    if (gameMode === 'versus_ai' && aiIsAlive) {
      aiSnakeRef.current.forEach((seg, i) => {
        ctx.save();
        ctx.fillStyle = i === 0 ? '#f43f5e' : '#e11d48';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(
          seg.x * GRID_SIZE + 2,
          seg.y * GRID_SIZE + 2,
          GRID_SIZE - 4,
          GRID_SIZE - 4,
          4
        );
        ctx.fill();
        ctx.restore();
      });
    }
  };

  // End game
  const endGame = () => {
    setGameOver(true);
    setIsPlaying(false);
    sound.playGameOver();

    let result: 'win' | 'loss' | 'draw' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      if (score > aiScore) {
        result = 'win';
        sound.playWinFanfare();
        confetti({ particleCount: 90, spread: 70 });
      } else if (score < aiScore) {
        result = 'loss';
      } else {
        result = 'draw';
      }
    } else {
      if (score >= 600) {
        sound.playWinFanfare();
        confetti({ particleCount: 80, spread: 60 });
      }
    }

    recordFinishedGame({
      gameId: 'snake',
      score,
      mode: gameMode,
      result,
      aiScore: gameMode === 'versus_ai' ? aiScore : undefined,
      detail: `${applesEaten} bytes devoured (${score} pts)`,
    });
  };

  const startSnake = () => {
    sound.playInsertCoin();
    snakeRef.current = [
      { x: 8, y: 11 },
      { x: 7, y: 11 },
      { x: 6, y: 11 },
    ];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    aiSnakeRef.current = [
      { x: 18, y: 5 },
      { x: 19, y: 5 },
      { x: 20, y: 5 },
    ];
    setScore(0);
    setApplesEaten(0);
    setSpeed(120);
    setAiScore(0);
    setAiLength(3);
    setAiIsAlive(true);
    spawnFood();
    setGameOver(false);
    setIsPlaying(true);
    setAnnouncement('Slither smoothly! Use WASD or directional arrows.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 neon-box-cyan">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Activity size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-emerald-400 font-heading">
              CYBER NEON SNAKE
            </h1>
            <p className="text-xs text-slate-400">
              Grid Byte Devourer • {gameMode === 'versus_ai' ? 'VS Python-Core AI' : 'Solo High-Score Run'}
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
              gameMode === 'solo' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Run
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              gameMode === 'versus_ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Python-Core
          </button>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Bytes Eaten</div>
            <div className="text-sm font-bold text-emerald-400 font-arcade">
              {applesEaten}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Your Score</div>
            <div className="text-2xl font-black text-emerald-400 font-arcade">
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

      {/* Grid Canvas Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative select-none">
          <canvas
            ref={canvasRef}
            width={COLS * GRID_SIZE}
            height={ROWS * GRID_SIZE}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950 shadow-inner"
          />

          {/* Start Screen Overlay */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Activity className="text-emerald-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-black text-emerald-400 font-heading">
                SLITHER MATRIX ENGAGED
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Steer with WASD or Arrow Keys. Devour red data pellets and rare yellow quantum orbs. Avoid walls and your own growing tail!
              </p>
              <button
                onClick={startSnake}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 shadow-xl shadow-emerald-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> INSERT TOKEN & SLITHER
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-emerald-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-emerald-400 font-heading">
                SNAKE COLLISION TERMINATED
              </h2>
              <div className="text-sm font-arcade text-amber-400">
                FINAL SCORE: {score} PTS ({applesEaten} Bytes Devoured)
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  Python-Core AI: <strong className="text-pink-400">{aiScore} pts</strong> —{' '}
                  <span className="font-bold text-emerald-300">
                    {score > aiScore ? 'VICTORY! YOU OUT-GREW THE AI!' : score < aiScore ? 'AI SERPENT DOMINATED' : 'EQUAL TIE!'}
                  </span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={startSnake}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25"
                >
                  <RotateCcw size={14} /> Slither Again
                </button>
                <button
                  onClick={openUsernameModal}
                  className="py-3 px-6 rounded-xl font-bold text-xs bg-slate-900 text-slate-300 border border-slate-700 hover:border-emerald-400 transition cursor-pointer"
                >
                  Change Player Tag ({player.username})
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles size={14} /> {announcement}
          </div>
        </div>

        {/* Mobile On-Screen D-Pad & Stats */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
              <Activity size={16} /> Direction Controls
            </h3>

            {/* Virtual D-Pad for Touch and Mobile */}
            <div className="flex flex-col items-center gap-2 py-4">
              <button
                type="button"
                onClick={() => setDirection(0, -1)}
                className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 flex items-center justify-center text-lg active:scale-95 shadow cursor-pointer"
              >
                <ArrowUp size={24} />
              </button>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setDirection(-1, 0)}
                  className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 flex items-center justify-center text-lg active:scale-95 shadow cursor-pointer"
                >
                  <ArrowLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => setDirection(1, 0)}
                  className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 flex items-center justify-center text-lg active:scale-95 shadow cursor-pointer"
                >
                  <ArrowRight size={24} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDirection(0, 1)}
                className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 flex items-center justify-center text-lg active:scale-95 shadow cursor-pointer"
              >
                <ArrowDown size={24} />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="font-bold text-slate-300 uppercase text-[10px]">Snake Guidelines:</div>
            <div>• Red Orbs: Standard Byte (+100 pts)</div>
            <div>• Yellow Orbs: Quantum Bonus (+300 pts)</div>
            <div>• Speed gradually accelerates as tail expands.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
