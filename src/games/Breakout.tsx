import React, { useState, useEffect, useRef } from 'react';
import { Shield, Play, RotateCcw, Bot, Sparkles, Zap, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface Brick {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: string;
  isBomb?: boolean;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface FallingPower {
  x: number;
  y: number;
  type: 'multiball' | 'laser' | 'expand' | 'floor';
}

export const Breakout: React.FC = () => {
  const { recordFinishedGame, openAuthModal, isGuest } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(1);
  const [aiScore, setAiScore] = useState(0);
  const [hasLasers, setHasLasers] = useState(false);

  // Game internal state
  const paddleRef = useRef({
    x: 250,
    y: 480,
    w: 100,
    h: 14,
    speed: 8,
    hasFloor: false,
    laserTime: 0,
  });

  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powersRef = useRef<FallingPower[]>([]);
  const lasersRef = useRef<{ x: number; y: number; vy: number }[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Bricks
  const initBricks = () => {
    const rows = 5;
    const cols = 9;
    const brickW = 58;
    const brickH = 20;
    const offsetX = 30;
    const offsetY = 50;
    const colors = ['#ec4899', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'];

    const newBricks: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isBomb = Math.random() < 0.08;
        const hp = r === 0 ? 2 : 1;
        newBricks.push({
          id: `b_${r}_${c}`,
          x: offsetX + c * (brickW + 8),
          y: offsetY + r * (brickH + 8),
          w: brickW,
          h: brickH,
          hp,
          maxHp: hp,
          color: isBomb ? '#ef4444' : colors[r % colors.length],
          isBomb,
        });
      }
    }
    bricksRef.current = newBricks;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        paddleRef.current.x = Math.max(0, paddleRef.current.x - 25);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        paddleRef.current.x = Math.min(620 - paddleRef.current.w, paddleRef.current.x + 25);
      } else if (e.key === ' ' && hasLasers) {
        // Fire laser
        sound.playLaser();
        lasersRef.current.push(
          { x: paddleRef.current.x + 10, y: paddleRef.current.y, vy: -9 },
          { x: paddleRef.current.x + paddleRef.current.w - 10, y: paddleRef.current.y, vy: -9 }
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasLasers]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    paddleRef.current.x = Math.max(0, Math.min(canvas.width - paddleRef.current.w, mx - paddleRef.current.w / 2));
  };

  // Main game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localScore = score;
    let localCombo = combo;
    let localAi = aiScore;

    const render = () => {
      ctx.fillStyle = '#05050d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // AI Rival Score Progress
      if (gameMode === 'versus_ai' && Math.random() < 0.05) {
        localAi += Math.floor(Math.random() * 30 + 10);
        setAiScore(localAi);
      }

      // Laser duration decay
      const p = paddleRef.current;
      if (hasLasers) {
        p.laserTime--;
        if (p.laserTime <= 0) setHasLasers(false);
      }

      // Draw Safety Floor if active
      if (p.hasFloor) {
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(0, canvas.height - 4, canvas.width, 4);
      }

      // Draw Paddle
      ctx.save();
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Neon accent lines
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 3);
      ctx.restore();

      // Update & Draw Lasers
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const lz = lasersRef.current[i];
        lz.y += lz.vy;

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(lz.x - 2, lz.y, 4, 12);

        // Collision with bricks
        for (let bIdx = bricksRef.current.length - 1; bIdx >= 0; bIdx--) {
          const br = bricksRef.current[bIdx];
          if (lz.x >= br.x && lz.x <= br.x + br.w && lz.y >= br.y && lz.y <= br.y + br.h) {
            sound.playBrickBreak();
            br.hp--;
            lasersRef.current.splice(i, 1);
            if (br.hp <= 0) {
              localScore += 50;
              setScore(localScore);
              bricksRef.current.splice(bIdx, 1);
            }
            break;
          }
        }

        if (lz.y < 0) lasersRef.current.splice(i, 1);
      }

      // Update & Draw Bricks
      for (let i = 0; i < bricksRef.current.length; i++) {
        const br = bricksRef.current[i];
        ctx.save();
        ctx.fillStyle = br.hp < br.maxHp ? '#64748b' : br.color;
        ctx.shadowColor = br.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(br.x, br.y, br.w, br.h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(br.x, br.y, br.w, br.h);
        ctx.restore();
      }

      // Check Victory
      if (bricksRef.current.length === 0) {
        sound.playWinFanfare();
        confetti({ particleCount: 90, spread: 80 });
        endGame(localScore + 1000, localAi);
        return;
      }

      // Update & Draw Balls
      for (let i = ballsRef.current.length - 1; i >= 0; i--) {
        const ball = ballsRef.current[i];
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Bounce walls
        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
          ball.vx *= -1;
          sound.playPaddleBounce();
        }
        if (ball.y - ball.radius <= 0) {
          ball.vy *= -1;
          sound.playPaddleBounce();
        }

        // Bounce Safety Floor
        if (p.hasFloor && ball.y + ball.radius >= canvas.height - 4) {
          ball.vy *= -1;
          p.hasFloor = false;
          sound.playPowerUp();
        }

        // Bounce Paddle
        if (
          ball.y + ball.radius >= p.y &&
          ball.y - ball.radius <= p.y + p.h &&
          ball.x >= p.x &&
          ball.x <= p.x + p.w
        ) {
          sound.playPaddleBounce();
          // Angle depends on where ball strikes paddle
          const hitPos = (ball.x - (p.x + p.w / 2)) / (p.w / 2);
          const speed = Math.hypot(ball.vx, ball.vy);
          ball.vx = hitPos * speed * 0.85;
          ball.vy = -Math.abs(ball.vy);
          localCombo = 1;
          setCombo(1);
        }

        // Brick collision
        for (let bIdx = bricksRef.current.length - 1; bIdx >= 0; bIdx--) {
          const br = bricksRef.current[bIdx];
          if (
            ball.x + ball.radius >= br.x &&
            ball.x - ball.radius <= br.x + br.w &&
            ball.y + ball.radius >= br.y &&
            ball.y - ball.radius <= br.y + br.h
          ) {
            ball.vy *= -1;
            br.hp--;
            sound.playBrickBreak(localCombo);

            if (br.hp <= 0) {
              const points = 50 * localCombo;
              localScore += points;
              setScore(localScore);
              localCombo = Math.min(10, localCombo + 1);
              setCombo(localCombo);

              // Chance to spawn falling powerup
              if (Math.random() < 0.28) {
                const types: ('multiball' | 'laser' | 'expand' | 'floor')[] = [
                  'multiball',
                  'laser',
                  'expand',
                  'floor',
                ];
                powersRef.current.push({
                  x: br.x + br.w / 2,
                  y: br.y + br.h,
                  type: types[Math.floor(Math.random() * types.length)],
                });
              }

              bricksRef.current.splice(bIdx, 1);
            }
            break;
          }
        }

        // Ball falls off bottom
        if (ball.y - ball.radius > canvas.height) {
          ballsRef.current.splice(i, 1);
        } else {
          // Draw ball
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fillStyle = ball.color;
          ctx.shadowColor = ball.color;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
      }

      // Check if all balls lost
      if (ballsRef.current.length === 0) {
        sound.playPlayerHit();
        setLives((prev) => {
          const nl = prev - 1;
          if (nl <= 0) {
            endGame(localScore, localAi);
          } else {
            // Respawn single ball
            ballsRef.current.push({
              x: 310,
              y: 440,
              vx: (Math.random() - 0.5) * 6,
              vy: -6,
              radius: 6,
              color: '#facc15',
            });
          }
          return nl;
        });
      }

      // Update & Draw Falling Powerups
      for (let i = powersRef.current.length - 1; i >= 0; i--) {
        const pw = powersRef.current[i];
        pw.y += 2.5;

        ctx.beginPath();
        ctx.arc(pw.x, pw.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = pw.type === 'multiball' ? '#06b6d4' : pw.type === 'laser' ? '#f43f5e' : '#a855f7';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();

        // Paddle collects powerup
        if (pw.y >= p.y && pw.y <= p.y + p.h && pw.x >= p.x && pw.x <= p.x + p.w) {
          sound.playPowerUp();
          if (pw.type === 'multiball') {
            // Spawn 2 extra balls
            ballsRef.current.push(
              { x: p.x + 20, y: p.y - 10, vx: -4, vy: -6, radius: 6, color: '#06b6d4' },
              { x: p.x + 80, y: p.y - 10, vx: 4, vy: -6, radius: 6, color: '#ec4899' }
            );
          } else if (pw.type === 'laser') {
            setHasLasers(true);
            p.laserTime = 400;
          } else if (pw.type === 'expand') {
            p.w = 140;
            setTimeout(() => {
              paddleRef.current.w = 100;
            }, 8000);
          } else if (pw.type === 'floor') {
            p.hasFloor = true;
          }
          powersRef.current.splice(i, 1);
        } else if (pw.y > canvas.height + 20) {
          powersRef.current.splice(i, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, hasLasers, gameMode]);

  const endGame = (finalScore: number, finalAiScore: number) => {
    setGameOver(true);
    setIsPlaying(false);
    sound.playGameOver();

    let result: 'win' | 'loss' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      result = finalScore > finalAiScore ? 'win' : 'loss';
      if (result === 'win') {
        sound.playWinFanfare();
        confetti({ particleCount: 100, spread: 80 });
      }
    }

    recordFinishedGame({
      gameId: 'breakout',
      gameName: 'Neon Cyber Bricks',
      score: finalScore,
      mode: gameMode,
      result,
      aiOpponentName: gameMode === 'versus_ai' ? 'Matrix Reflector' : undefined,
      aiScore: gameMode === 'versus_ai' ? finalAiScore : undefined,
      detail: `${finalScore} pts (Max combo x${combo})`,
    });
  };

  const startBreakout = () => {
    sound.playInsertCoin();
    setScore(0);
    setLives(3);
    setCombo(1);
    setAiScore(0);
    setHasLasers(false);
    initBricks();
    ballsRef.current = [
      { x: 310, y: 440, vx: 4, vy: -6, radius: 6, color: '#facc15' },
    ];
    paddleRef.current.x = 260;
    paddleRef.current.w = 100;
    paddleRef.current.hasFloor = false;
    powersRef.current = [];
    lasersRef.current = [];
    setGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Game Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 neon-box-purple">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Shield size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-purple-400 font-heading">
              NEON CYBER BRICKS
            </h1>
            <p className="text-xs text-slate-400">
              Paddle Velocity Demolition • {gameMode === 'versus_ai' ? 'VS Matrix Reflector AI' : 'Solo Breaker'}
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              gameMode === 'solo' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Run
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              gameMode === 'versus_ai' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Matrix AI
          </button>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Lives</div>
            <div className="text-base text-pink-400 font-arcade">{'❤️ '.repeat(lives)}</div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Combo Multiplier</div>
            <div className="text-lg font-bold text-cyan-400 font-arcade">x{combo}</div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
            <div className="text-2xl font-black text-purple-400 font-arcade">{score}</div>
          </div>
          {gameMode === 'versus_ai' && (
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">AI Score</div>
              <div className="text-2xl font-black text-pink-400 font-arcade">{aiScore}</div>
            </div>
          )}
        </div>
      </div>

      {/* Screen & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={620}
            height={510}
            onMouseMove={handleMouseMove}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950"
          />

          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Shield className="text-purple-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-black text-purple-400 font-heading">
                INITIALIZE DEMOLITION
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Slide paddle with mouse or A/D keys. Snatch falling power nodes for multiball cascades and laser cannons!
              </p>
              <button
                onClick={startBreakout}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-300 hover:to-pink-300 shadow-xl shadow-purple-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> LAUNCH PADDLE
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <h2 className="text-3xl font-black text-pink-500 font-heading">
                MATRIX DEMOLISHED
              </h2>
              <div className="text-sm font-arcade text-purple-400">
                FINAL SCORE: {score} PTS
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startBreakout}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-purple-500 text-slate-950 hover:bg-purple-400 transition flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Replay Game
                </button>
                {isGuest && (
                  <button
                    onClick={() => openAuthModal('register')}
                    className="py-3 px-6 rounded-xl font-bold text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900 transition"
                  >
                    Save to Leaderboard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tactical Info */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <Zap size={16} /> Power Nodes
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Multi-Ball Cascade (+2 Balls)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>Twin Laser Blaster (Space to Fire)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>Kinetic Paddle Expander (+40%)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Laser Floor Safety Net</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400">
            Consecutive brick hits without hitting the paddle build up your Combo Multiplier up to <strong className="text-cyan-400">10x</strong>!
          </div>
        </div>
      </div>
    </div>
  );
};
