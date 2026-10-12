import React, { useState, useEffect, useRef } from 'react';
import { Divide, Play, RotateCcw, Bot, Users, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

export const PongGame: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CANVAS_W = 640;
  const CANVAS_H = 440;
  const PADDLE_H = 75;
  const PADDLE_W = 12;

  // Match Configuration
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'versus_ai' | 'local_2p'>('versus_ai');
  const [winningScore] = useState(7);

  // Scores
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [rallyCount, setRallyCount] = useState(0);

  // Paddles state
  const leftPaddleY = useRef((CANVAS_H - PADDLE_H) / 2);
  const rightPaddleY = useRef((CANVAS_H - PADDLE_H) / 2);

  // Ball physics
  const ballRef = useRef({
    x: CANVAS_W / 2,
    y: CANVAS_H / 2,
    vx: 5,
    vy: 2.5,
    radius: 7,
    speed: 5.5,
  });

  const keysRef = useRef<{ [k: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const [announcement, setAnnouncement] = useState('First player to reach 7 points wins the vector duel!');

  // Reset ball to center
  const resetBall = (serveToPlayer: boolean) => {
    ballRef.current = {
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      vx: serveToPlayer ? -5 : 5,
      vy: (Math.random() - 0.5) * 4,
      radius: 7,
      speed: 5.5,
    };
    setRallyCount(0);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
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

  // Touch and Mouse control for Left Paddle
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const my = (e.clientY - rect.top) * scaleY;
    leftPaddleY.current = Math.max(10, Math.min(CANVAS_H - PADDLE_H - 10, my - PADDLE_H / 2));
  };

  // Main Canvas & Physics Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // 1. Draw Field
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Center Dotted Line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer Glowing Frame
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Update Left Paddle (Keys: W/S or Up/Down if single)
      const keys = keysRef.current;
      if (keys['w'] || (gameMode === 'versus_ai' && keys['arrowup'])) {
        leftPaddleY.current = Math.max(10, leftPaddleY.current - 7);
      }
      if (keys['s'] || (gameMode === 'versus_ai' && keys['arrowdown'])) {
        leftPaddleY.current = Math.min(CANVAS_H - PADDLE_H - 10, leftPaddleY.current + 7);
      }

      // 3. Update Right Paddle (AI or 2nd player)
      if (gameMode === 'local_2p') {
        if (keys['arrowup']) {
          rightPaddleY.current = Math.max(10, rightPaddleY.current - 7);
        }
        if (keys['arrowdown']) {
          rightPaddleY.current = Math.min(CANVAS_H - PADDLE_H - 10, rightPaddleY.current + 7);
        }
      } else {
        // AI Paddle Tracking with realistic smoothing
        const b = ballRef.current;
        const targetY = b.y - PADDLE_H / 2;
        const diff = targetY - rightPaddleY.current;
        // AI reaction speed capped
        const aiSpeed = Math.min(5.5, Math.abs(diff)) * Math.sign(diff);
        rightPaddleY.current = Math.max(10, Math.min(CANVAS_H - PADDLE_H - 10, rightPaddleY.current + aiSpeed));
      }

      // 4. Update Ball Physics
      const b = ballRef.current;
      b.x += b.vx;
      b.y += b.vy;

      // Bounce off top/bottom floor
      if (b.y - b.radius < 0) {
        b.y = b.radius;
        b.vy *= -1;
        sound.playPaddleBounce();
      } else if (b.y + b.radius > CANVAS_H) {
        b.y = CANVAS_H - b.radius;
        b.vy *= -1;
        sound.playPaddleBounce();
      }

      // Collision with Left Paddle
      const lpX = 20;
      if (
        b.x - b.radius <= lpX + PADDLE_W &&
        b.x + b.radius >= lpX &&
        b.y >= leftPaddleY.current - 4 &&
        b.y <= leftPaddleY.current + PADDLE_H + 4 &&
        b.vx < 0
      ) {
        sound.playPaddleBounce();
        setRallyCount((r) => r + 1);
        b.x = lpX + PADDLE_W + b.radius;
        // Deflect angle based on position on paddle
        const hitPos = (b.y - (leftPaddleY.current + PADDLE_H / 2)) / (PADDLE_H / 2);
        b.speed = Math.min(11, b.speed + 0.3); // Speed accelerates during rally
        b.vx = Math.abs(b.speed * Math.cos(hitPos * 0.7));
        b.vy = b.speed * Math.sin(hitPos * 0.7);
      }

      // Collision with Right Paddle
      const rpX = CANVAS_W - 20 - PADDLE_W;
      if (
        b.x + b.radius >= rpX &&
        b.x - b.radius <= rpX + PADDLE_W &&
        b.y >= rightPaddleY.current - 4 &&
        b.y <= rightPaddleY.current + PADDLE_H + 4 &&
        b.vx > 0
      ) {
        sound.playPaddleBounce();
        setRallyCount((r) => r + 1);
        b.x = rpX - b.radius;
        const hitPos = (b.y - (rightPaddleY.current + PADDLE_H / 2)) / (PADDLE_H / 2);
        b.speed = Math.min(11, b.speed + 0.3);
        b.vx = -Math.abs(b.speed * Math.cos(hitPos * 0.7));
        b.vy = b.speed * Math.sin(hitPos * 0.7);
      }

      // Point scored on Right Side (Left player scores!)
      if (b.x - b.radius > CANVAS_W) {
        sound.playWinFanfare();
        setPlayerScore((prevScore) => {
          const next = prevScore + 1;
          if (next >= winningScore) {
            endMatch(next, opponentScore);
          } else {
            resetBall(false);
          }
          return next;
        });
      }

      // Point scored on Left Side (Right player/AI scores!)
      if (b.x + b.radius < 0) {
        sound.playPlayerHit();
        setOpponentScore((prevOpp) => {
          const next = prevOpp + 1;
          if (next >= winningScore) {
            endMatch(playerScore, next);
          } else {
            resetBall(true);
          }
          return next;
        });
      }

      // 5. Draw Left Paddle
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(20, leftPaddleY.current, PADDLE_W, PADDLE_H, 4);
      ctx.fill();
      ctx.restore();

      // Draw Right Paddle
      ctx.save();
      ctx.fillStyle = gameMode === 'local_2p' ? '#38bdf8' : '#f43f5e';
      ctx.shadowColor = gameMode === 'local_2p' ? '#38bdf8' : '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(CANVAS_W - 20 - PADDLE_W, rightPaddleY.current, PADDLE_W, PADDLE_H, 4);
      ctx.fill();
      ctx.restore();

      // 6. Draw Ball
      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, gameMode, winningScore, playerScore, opponentScore]);

  const endMatch = (finalPlayerScore: number, finalOpponentScore: number) => {
    setGameOver(true);
    setIsPlaying(false);

    const isWin = finalPlayerScore > finalOpponentScore;
    if (isWin) {
      sound.playWinFanfare();
      confetti({ particleCount: 100, spread: 80 });
      setAnnouncement('VICTORY! You won the cyber Pong championship!');
    } else {
      sound.playGameOver();
      setAnnouncement('MATCH CONCLUDED: Defeat on the vector court.');
    }

    const calculatedPoints = finalPlayerScore * 150 + rallyCount * 10;

    recordFinishedGame({
      gameId: 'pong',
      score: calculatedPoints,
      mode: gameMode === 'versus_ai' ? 'versus_ai' : 'solo',
      result: isWin ? 'win' : 'loss',
      aiScore: gameMode === 'versus_ai' ? finalOpponentScore * 150 : undefined,
      detail: `Final: ${finalPlayerScore} - ${finalOpponentScore} (${calculatedPoints} pts)`,
    });
  };

  const startPong = () => {
    sound.playInsertCoin();
    setPlayerScore(0);
    setOpponentScore(0);
    setRallyCount(0);
    leftPaddleY.current = (CANVAS_H - PADDLE_H) / 2;
    rightPaddleY.current = (CANVAS_H - PADDLE_H) / 2;
    resetBall(true);
    setGameOver(false);
    setIsPlaying(true);
    setAnnouncement('Serve live! Deflect the vector orb.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 neon-box-cyan shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
            <Divide size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-sky-400 font-heading">
              NEON CYBER PONG
            </h1>
            <p className="text-xs text-slate-400">
              Twin Paddle Vector Duel • {gameMode === 'versus_ai' ? 'VS Vector-Pong 9 AI' : 'Local 2-Player Match'}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              gameMode === 'versus_ai' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Vector AI
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('local_2p');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              gameMode === 'local_2p' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Users size={14} /> Local 2-Player
          </button>
        </div>

        {/* Score Board */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-sky-400">{player.username}</div>
            <div className="text-3xl font-black text-sky-400 font-arcade">
              {playerScore}
            </div>
          </div>
          <div className="text-xl font-arcade text-slate-600">:</div>
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-pink-400">
              {gameMode === 'versus_ai' ? 'Vector AI' : 'Player 2'}
            </div>
            <div className="text-3xl font-black text-pink-400 font-arcade">
              {opponentScore}
            </div>
          </div>
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
              <Divide className="text-sky-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-black text-sky-400 font-heading">
                VECTOR DUEL COURT READY
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Left Paddle: Slide with Mouse/Touch or W/S keys. First to 7 points takes match victory!
              </p>
              <button
                onClick={startPong}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-300 hover:from-sky-300 shadow-xl shadow-sky-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> SERVE FIRST BALL
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-sky-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-sky-400 font-heading">
                MATCH COMPLETED
              </h2>
              <div className="text-lg font-arcade text-amber-400">
                FINAL SCORE: {playerScore} - {opponentScore}
              </div>
              <div className="text-xs text-slate-300">
                {playerScore > opponentScore ? 'CONGRATULATIONS! VICTORY CLAIMED!' : 'OPPONENT SECURED MATCH POINT.'}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={startPong}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-sky-500 text-slate-950 hover:bg-sky-400 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/25"
                >
                  <RotateCcw size={14} /> Rematch
                </button>
                <button
                  onClick={openUsernameModal}
                  className="py-3 px-6 rounded-xl font-bold text-xs bg-slate-900 text-slate-300 border border-slate-700 hover:border-sky-400 transition cursor-pointer"
                >
                  Change Player Tag ({player.username})
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 text-xs font-bold text-sky-400 flex items-center gap-1.5">
            <Sparkles size={14} /> {announcement}
          </div>
        </div>

        {/* Control Guidelines */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 mb-3 flex items-center gap-2">
              <Divide size={16} /> Match Telemetry
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Goal</span>
                <span className="text-sky-400 font-bold font-arcade">7 Points</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Rally Length</span>
                <span className="text-amber-400 font-bold font-arcade">{rallyCount} Volleys</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Ball Acceleration</span>
                <span className="text-emerald-400 font-bold">Dynamic Spin</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="font-bold text-slate-300 uppercase text-[10px]">Controls:</div>
            <div>• Player 1 (Left): Mouse / Touch or W & S</div>
            <div>• Player 2 (Right, 2P mode): Up & Down Arrows</div>
            <div>• Paddle edges deflect the ball at high angles!</div>
          </div>
        </div>
      </div>
    </div>
  );
};
