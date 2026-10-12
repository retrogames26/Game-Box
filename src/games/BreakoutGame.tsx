import React, { useState, useEffect, useRef } from 'react';
import { Layers, Play, Pause, RotateCcw, Heart, Bot, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface Brick {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  points: number;
  hits: number;
  maxHits: number;
  isDestroyed: boolean;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export const BreakoutGame: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CANVAS_W = 640;
  const CANVAS_H = 480;

  // Game States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');

  // Player Stats
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [bricksLeft, setBricksLeft] = useState(0);

  // AI Opponent Stats
  const [aiScore, setAiScore] = useState(0);
  const [aiBricksBroken, setAiBricksBroken] = useState(0);

  // Paddle state
  const paddleRef = useRef({
    x: 270,
    y: 440,
    width: 100,
    height: 14,
    speed: 8,
  });

  // Ball array (supports multiball)
  const ballsRef = useRef<Ball[]>([
    { x: 320, y: 420, vx: 4, vy: -4, radius: 6, color: '#38bdf8' },
  ]);

  const bricksRef = useRef<Brick[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const keysRef = useRef<{ [k: string]: boolean }>({});

  const [announcement, setAnnouncement] = useState('Smash armored neon bricks, deflect at sharp angles, and clear the matrix!');

  // Helper: Build Brick Grid
  const generateBricks = (lvl: number) => {
    const list: Brick[] = [];
    const rows = 4 + Math.min(3, lvl);
    const cols = 9;
    const padding = 8;
    const brickW = (CANVAS_W - 60 - (cols - 1) * padding) / cols;
    const brickH = 20;

    const rowColors = [
      { color: '#f43f5e', glow: '#fb7185', hits: 3, points: 150 }, // Red high armor
      { color: '#f59e0b', glow: '#fcd34d', hits: 2, points: 100 }, // Yellow medium
      { color: '#10b981', glow: '#6ee7b7', hits: 1, points: 60 },  // Green
      { color: '#06b6d4', glow: '#67e8f9', hits: 1, points: 50 },  // Cyan
      { color: '#a855f7', glow: '#d8b4fe', hits: 2, points: 120 }, // Purple
      { color: '#ec4899', glow: '#f472b6', hits: 1, points: 80 },  // Pink
      { color: '#3b82f6', glow: '#93c5fd', hits: 1, points: 50 },  // Blue
    ];

    for (let r = 0; r < rows; r++) {
      const style = rowColors[r % rowColors.length];
      for (let c = 0; c < cols; c++) {
        list.push({
          id: `brk_${r}_${c}`,
          x: 30 + c * (brickW + padding),
          y: 60 + r * (brickH + padding),
          width: brickW,
          height: brickH,
          color: style.color,
          glowColor: style.glow,
          points: style.points,
          hits: style.hits,
          maxHits: style.hits,
          isDestroyed: false,
        });
      }
    }

    bricksRef.current = list;
    setBricksLeft(list.length);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'p' || e.key === 'P') {
        setIsPaused((p) => !p);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse & Touch movement
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isPaused || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    paddleRef.current.x = Math.max(10, Math.min(CANVAS_W - paddleRef.current.width - 10, mx - paddleRef.current.width / 2));
  };

  // AI Opponent simulation in VS AI mode
  useEffect(() => {
    if (!isPlaying || isPaused || gameOver || gameMode !== 'versus_ai') return;

    const aiInterval = setInterval(() => {
      // AI breaks a brick with calculated probability
      const remainingBricks = bricksRef.current.filter((b) => !b.isDestroyed);
      if (remainingBricks.length === 0) return;

      const randomBrick = remainingBricks[Math.floor(Math.random() * remainingBricks.length)];
      setAiScore((s) => s + randomBrick.points);
      setAiBricksBroken((b) => b + 1);
    }, 2400);

    return () => clearInterval(aiInterval);
  }, [isPlaying, isPaused, gameOver, gameMode]);

  // Main Game Physics Loop
  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // 1. Clear Screen
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Neon grid background lines
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }

      // Outer Glow Border
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Update Paddle with Keyboard keys
      const p = paddleRef.current;
      const keys = keysRef.current;
      if (keys['arrowleft'] || keys['a']) {
        p.x = Math.max(10, p.x - p.speed);
      }
      if (keys['arrowright'] || keys['d']) {
        p.x = Math.min(CANVAS_W - p.width - 10, p.x + p.speed);
      }

      // Draw Paddle
      ctx.save();
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, p.height, 6);
      ctx.fill();

      // Paddle highlight bar
      ctx.fillStyle = '#ffedd5';
      ctx.fillRect(p.x + 8, p.y + 2, p.width - 16, 3);
      ctx.restore();

      // 3. Draw Bricks
      let activeBricks = 0;
      bricksRef.current.forEach((b) => {
        if (!b.isDestroyed) {
          activeBricks++;
          ctx.save();
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.glowColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.width, b.height, 4);
          ctx.fill();

          // Crack indicators if damaged
          if (b.hits < b.maxHits) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(b.x + b.width * 0.4, b.y + 2, 2, b.height - 4);
          }

          // Shimmer reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(b.x + 2, b.y + 2, b.width - 4, 3);
          ctx.restore();
        }
      });

      // Advance Level if all bricks destroyed
      if (activeBricks === 0 && bricksRef.current.length > 0) {
        sound.playWinFanfare();
        confetti({ particleCount: 50, spread: 60 });
        setLevel((lvl) => {
          const nextLvl = lvl + 1;
          generateBricks(nextLvl);
          // Reset ball to paddle
          ballsRef.current = [
            { x: p.x + p.width / 2, y: p.y - 12, vx: 4 + nextLvl * 0.5, vy: -4 - nextLvl * 0.5, radius: 6, color: '#38bdf8' },
          ];
          return nextLvl;
        });
        setAnnouncement(`LEVEL UP! Cleared grid! Welcome to Level ${level + 1}!`);
      }

      // 4. Update Balls
      for (let i = ballsRef.current.length - 1; i >= 0; i--) {
        const ball = ballsRef.current[i];
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Bounce off left/right walls
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx *= -1;
          sound.playPaddleBounce();
        } else if (ball.x + ball.radius > CANVAS_W) {
          ball.x = CANVAS_W - ball.radius;
          ball.vx *= -1;
          sound.playPaddleBounce();
        }

        // Bounce off ceiling
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy *= -1;
          sound.playPaddleBounce();
        }

        // Bounce off player paddle
        if (
          ball.y + ball.radius >= p.y &&
          ball.y - ball.radius <= p.y + p.height &&
          ball.x >= p.x - 4 &&
          ball.x <= p.x + p.width + 4 &&
          ball.vy > 0
        ) {
          sound.playPaddleBounce();
          // Angle depends on where on paddle ball lands (-1 to 1)
          const hitPos = (ball.x - (p.x + p.width / 2)) / (p.width / 2);
          const currentSpeed = Math.hypot(ball.vx, ball.vy);
          ball.vx = hitPos * currentSpeed * 0.85;
          ball.vy = -Math.sqrt(Math.max(4, currentSpeed * currentSpeed - ball.vx * ball.vx));
          ball.y = p.y - ball.radius;
        }

        // Check Brick collisions
        for (const b of bricksRef.current) {
          if (!b.isDestroyed) {
            if (
              ball.x + ball.radius >= b.x &&
              ball.x - ball.radius <= b.x + b.width &&
              ball.y + ball.radius >= b.y &&
              ball.y - ball.radius <= b.y + b.height
            ) {
              // Collision detected
              ball.vy *= -1;
              b.hits--;

              if (b.hits <= 0) {
                b.isDestroyed = true;
                sound.playBrickBreak();
                setScore((s) => s + b.points);
                setBricksLeft((bl) => Math.max(0, bl - 1));
              } else {
                sound.playPaddleBounce();
                setScore((s) => s + Math.round(b.points / 2));
              }
              break;
            }
          }
        }

        // Ball fell off the bottom
        if (ball.y - ball.radius > CANVAS_H) {
          ballsRef.current.splice(i, 1);
        }
      }

      // Check if all balls lost
      if (ballsRef.current.length === 0) {
        sound.playPlayerHit();
        setLives((prevLives) => {
          const nextLives = prevLives - 1;
          if (nextLives <= 0) {
            endGame();
          } else {
            // Respawn ball on paddle
            ballsRef.current = [
              { x: p.x + p.width / 2, y: p.y - 12, vx: 4, vy: -4, radius: 6, color: '#38bdf8' },
            ];
            setAnnouncement(`Ball lost! ${nextLives} lives remaining.`);
          }
          return nextLives;
        });
      }

      // Draw Balls
      ballsRef.current.forEach((ball) => {
        ctx.save();
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isPaused, gameOver, level]);

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
      if (score >= 800) {
        sound.playWinFanfare();
        confetti({ particleCount: 80, spread: 60 });
      }
    }

    recordFinishedGame({
      gameId: 'breakout',
      score,
      mode: gameMode,
      result,
      aiScore: gameMode === 'versus_ai' ? aiScore : undefined,
      detail: `Level ${level} completed (${score} pts)`,
    });
  };

  const startBreakout = () => {
    sound.playInsertCoin();
    setScore(0);
    setLives(3);
    setLevel(1);
    setAiScore(0);
    setAiBricksBroken(0);
    paddleRef.current.x = 270;
    ballsRef.current = [
      { x: 320, y: 420, vx: 4, vy: -4, radius: 6, color: '#38bdf8' },
    ];
    generateBricks(1);
    setGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    setAnnouncement('Breakout active! Deflect balls and smash the armored brick wall.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-orange-500/30 neon-box-yellow shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40">
            <Layers size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-orange-400 font-heading">
              NEON CYBER BRICKS
            </h1>
            <p className="text-xs text-slate-400">
              Paddle Demolition Matrix • {gameMode === 'versus_ai' ? 'VS Reflector-AI' : 'Solo Arcade'}
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
              gameMode === 'solo' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400'
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
              gameMode === 'versus_ai' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Reflector-AI
          </button>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Paddle Lives</div>
            <div className="text-sm font-bold text-rose-400 font-arcade">
              {'❤️ '.repeat(lives) || 'DEAD'}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Level</div>
            <div className="text-lg font-bold text-amber-400 font-arcade">
              LVL {level}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
            <div className="text-2xl font-black text-orange-400 font-arcade">
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

      {/* Screen Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative select-none">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerMove={handlePointerMove}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950 cursor-pointer touch-none"
          />

          {/* Start Screen */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Layers className="text-orange-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-black text-orange-400 font-heading">
                BRICK MATRIX READY
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Slide your paddle using mouse, touch, or A/D keys. Keep balls alive, crack armored multi-hit bricks, and progress through escalating stages!
              </p>
              <button
                onClick={startBreakout}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-orange-400 to-amber-300 hover:from-orange-300 shadow-xl shadow-orange-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> LAUNCH PADDLE & BALL
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-orange-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-orange-400 font-heading">
                PADDLE BREACHED
              </h2>
              <div className="text-sm font-arcade text-amber-400">
                FINAL SCORE: {score} PTS (Level {level})
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  Reflector-AI: <strong className="text-pink-400">{aiScore} pts</strong> —{' '}
                  <span className="font-bold text-orange-300">
                    {score > aiScore ? 'VICTORY! YOU OUT-SCORED THE AI!' : score < aiScore ? 'AI DEFENSE PREVAILED' : 'EQUAL TIE!'}
                  </span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={startBreakout}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-orange-500 text-slate-950 hover:bg-orange-400 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/25"
                >
                  <RotateCcw size={14} /> Play Again
                </button>
                <button
                  onClick={openUsernameModal}
                  className="py-3 px-6 rounded-xl font-bold text-xs bg-slate-900 text-slate-300 border border-slate-700 hover:border-orange-400 transition cursor-pointer"
                >
                  Change Player Tag ({player.username})
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 text-xs font-bold text-orange-400 flex items-center gap-1.5">
            <Sparkles size={14} /> {announcement}
          </div>
        </div>

        {/* Side Panel Guide */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400 mb-3 flex items-center gap-2">
              <Layers size={16} /> Demolition Matrix
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Bricks Remaining</span>
                <span className="text-orange-400 font-bold font-arcade">{bricksLeft}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Stage</span>
                <span className="text-amber-400 font-bold font-arcade">Wave {level}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Deflection Angle</span>
                <span className="text-cyan-400 font-bold">Dynamic Curve</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="font-bold text-slate-300 uppercase text-[10px]">Brick Armor Levels:</div>
            <div className="text-rose-400">• Red Bricks: 3 Hits (150 pts)</div>
            <div className="text-amber-400">• Yellow Bricks: 2 Hits (100 pts)</div>
            <div className="text-emerald-400">• Green & Cyan: 1 Hit (50-60 pts)</div>
            <div>• Slide paddle edges to impart high angular velocity!</div>
          </div>
        </div>
      </div>
    </div>
  );
};
