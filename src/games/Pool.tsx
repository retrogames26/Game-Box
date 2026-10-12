import React, { useState, useEffect, useRef } from 'react';
import { Disc, Play, RotateCcw, Bot, Sparkles, Award, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isStriped: boolean;
  isCue?: boolean;
  isEight?: boolean;
  isPocketed: boolean;
}

interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export const Pool: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Match Status & Modes
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('versus_ai');
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [playerSuit, setPlayerSuit] = useState<'solids' | 'stripes' | 'open'>('open');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [fouls, setFouls] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [announcement, setAnnouncement] = useState('Break the rack! Aim with mouse and set cue strike power.');

  // Aiming & Power
  const [aimAngle, setAimAngle] = useState(0);
  const [shotPower, setShotPower] = useState(50);
  const [isAiming, setIsAiming] = useState(true);
  const [ballsMoving, setBallsMoving] = useState(false);

  // Table dimensions (internal canvas coordinates)
  const TABLE_W = 600;
  const TABLE_H = 320;
  const CUSHION = 28;

  const pockets: Pocket[] = [
    { x: CUSHION + 4, y: CUSHION + 4, radius: 18 },                          // Top-left
    { x: TABLE_W / 2, y: CUSHION - 2, radius: 16 },                          // Top-middle
    { x: TABLE_W - CUSHION - 4, y: CUSHION + 4, radius: 18 },                // Top-right
    { x: CUSHION + 4, y: TABLE_H - CUSHION - 4, radius: 18 },                // Bottom-left
    { x: TABLE_W / 2, y: TABLE_H - CUSHION + 2, radius: 16 },                // Bottom-middle
    { x: TABLE_W - CUSHION - 4, y: TABLE_H - CUSHION - 4, radius: 18 },      // Bottom-right
  ];

  const ballsRef = useRef<Ball[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Rack up the 8-Ball Table
  const initTable = () => {
    const r = 9; // ball radius
    const newBalls: Ball[] = [];

    // Cue Ball (White)
    newBalls.push({
      id: 0,
      x: 160,
      y: TABLE_H / 2,
      vx: 0,
      vy: 0,
      radius: r,
      color: '#f8fafc',
      isStriped: false,
      isCue: true,
      isPocketed: false,
    });

    // Object Balls Triangle (Apex at x=400, y=TABLE_H/2)
    const apexX = 400;
    const apexY = TABLE_H / 2;
    const d = r * 2 + 1;

    // Ball attributes: 1-7 solids, 8 black, 9-15 stripes
    const ballConfigs = [
      { id: 1, color: '#f59e0b', isStriped: false }, // row 0 apex
      { id: 9, color: '#f59e0b', isStriped: true },  { id: 2, color: '#3b82f6', isStriped: false }, // row 1
      { id: 3, color: '#ef4444', isStriped: false }, { id: 8, color: '#09090b', isStriped: false, isEight: true }, { id: 10, color: '#3b82f6', isStriped: true }, // row 2
      { id: 11, color: '#ef4444', isStriped: true }, { id: 4, color: '#8b5cf6', isStriped: false }, { id: 12, color: '#8b5cf6', isStriped: true }, { id: 5, color: '#ea580c', isStriped: false }, // row 3
      { id: 13, color: '#ea580c', isStriped: true }, { id: 6, color: '#10b981', isStriped: false }, { id: 14, color: '#10b981', isStriped: true }, { id: 7, color: '#b91c1c', isStriped: false }, { id: 15, color: '#b91c1c', isStriped: true }, // row 4
    ];

    let bIdx = 0;
    for (let row = 0; row < 5; row++) {
      const rx = apexX + row * (d * 0.866);
      const startY = apexY - (row * d) / 2;
      for (let col = 0; col <= row; col++) {
        const ry = startY + col * d;
        const cfg = ballConfigs[bIdx];
        newBalls.push({
          id: cfg.id,
          x: rx,
          y: ry,
          vx: 0,
          vy: 0,
          radius: r,
          color: cfg.color,
          isStriped: cfg.isStriped,
          isEight: cfg.isEight,
          isPocketed: false,
        });
        bIdx++;
      }
    }

    ballsRef.current = newBalls;
  };

  useEffect(() => {
    initTable();
  }, []);

  // Aiming with mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAiming || ballsMoving || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cueBall = ballsRef.current.find(b => b.isCue && !b.isPocketed);
    if (!cueBall) return;

    const angle = Math.atan2(my - cueBall.y, mx - cueBall.x);
    setAimAngle(angle);
  };

  // Strike Cue Ball action
  const strikeCueBall = () => {
    if (ballsMoving || gameOver) return;
    const cueBall = ballsRef.current.find(b => b.isCue && !b.isPocketed);
    if (!cueBall) return;

    sound.playPaddleBounce();
    setIsAiming(false);
    setBallsMoving(true);

    const speed = (shotPower / 100) * 16 + 2;
    cueBall.vx = Math.cos(aimAngle) * speed;
    cueBall.vy = Math.sin(aimAngle) * speed;
  };

  // AI Turn Logic for Hustler-AI
  const triggerAiShot = () => {
    setAnnouncement('Hustler-AI is surveying cue angles...');
    setTimeout(() => {
      const cueBall = ballsRef.current.find(b => b.isCue && !b.isPocketed);
      if (!cueBall) return;

      // Find an eligible active target ball
      const aiTargetBalls = ballsRef.current.filter(b => {
        if (b.isCue || b.isPocketed) return false;
        if (playerSuit === 'open') return true;
        return playerSuit === 'solids' ? b.isStriped : !b.isStriped;
      });

      const target = aiTargetBalls[0] || ballsRef.current.find(b => b.isEight && !b.isPocketed) || ballsRef.current[1];
      if (target) {
        const calculatedAngle = Math.atan2(target.y - cueBall.y, target.x - cueBall.x);
        setAimAngle(calculatedAngle);
        setShotPower(65);

        setTimeout(() => {
          sound.playPaddleBounce();
          setIsAiming(false);
          setBallsMoving(true);
          const speed = 12;
          cueBall.vx = Math.cos(calculatedAngle) * speed;
          cueBall.vy = Math.sin(calculatedAngle) * speed;
        }, 800);
      }
    }, 1200);
  };

  // 2D Billiards Physics & Collision Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minX = CUSHION + 10;
    const maxX = TABLE_W - CUSHION - 10;
    const minY = CUSHION + 10;
    const maxY = TABLE_H - CUSHION - 10;

    const render = () => {
      // 1. Draw Table Cushion & Felt
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wood Railing
      ctx.fillStyle = '#331800';
      ctx.strokeStyle = '#5c2d00';
      ctx.lineWidth = 4;
      ctx.fillRect(CUSHION - 16, CUSHION - 16, TABLE_W - (CUSHION - 16) * 2, TABLE_H - (CUSHION - 16) * 2);
      ctx.strokeRect(CUSHION - 16, CUSHION - 16, TABLE_W - (CUSHION - 16) * 2, TABLE_H - (CUSHION - 16) * 2);

      // Neon Green Felt
      const feltGrad = ctx.createRadialGradient(TABLE_W / 2, TABLE_H / 2, 80, TABLE_W / 2, TABLE_H / 2, 320);
      feltGrad.addColorStop(0, '#065f46');
      feltGrad.addColorStop(1, '#042f2e');
      ctx.fillStyle = feltGrad;
      ctx.fillRect(CUSHION, CUSHION, TABLE_W - CUSHION * 2, TABLE_H - CUSHION * 2);

      // Pocket Holes (6 Pockets)
      pockets.forEach(p => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#020617';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });

      // 2. Update Ball Physics
      let totalMotion = 0;
      const balls = ballsRef.current;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.isPocketed) continue;

        // Apply friction
        b.vx *= 0.985;
        b.vy *= 0.985;

        // Stop jitter
        if (Math.abs(b.vx) < 0.05) b.vx = 0;
        if (Math.abs(b.vy) < 0.05) b.vy = 0;

        b.x += b.vx;
        b.y += b.vy;
        totalMotion += Math.hypot(b.vx, b.vy);

        // Cushion Bounces
        if (b.x - b.radius < minX) {
          b.x = minX + b.radius;
          b.vx *= -0.85;
        } else if (b.x + b.radius > maxX) {
          b.x = maxX - b.radius;
          b.vx *= -0.85;
        }

        if (b.y - b.radius < minY) {
          b.y = minY + b.radius;
          b.vy *= -0.85;
        } else if (b.y + b.radius > maxY) {
          b.y = maxY - b.radius;
          b.vy *= -0.85;
        }

        // Pocket Detection
        for (const p of pockets) {
          const distToPocket = Math.hypot(b.x - p.x, b.y - p.y);
          if (distToPocket < p.radius + 2) {
            b.isPocketed = true;
            b.vx = 0;
            b.vy = 0;
            sound.playPrizeCollected();
            handleBallPocketed(b);
            break;
          }
        }
      }

      // Ball-to-Ball Elastic Collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (b1.isPocketed || b2.isPocketed) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < b1.radius + b2.radius) {
            // Overlap separation
            const overlap = (b1.radius + b2.radius) - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            b1.x -= nx * overlap * 0.5;
            b1.y -= ny * overlap * 0.5;
            b2.x += nx * overlap * 0.5;
            b2.y += ny * overlap * 0.5;

            // Elastic impulse
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            b1.vx -= p * nx;
            b1.vy -= p * ny;
            b2.vx += p * nx;
            b2.vy += p * ny;

            sound.playPaddleBounce();
          }
        }
      }

      // Check if all balls stopped moving
      if (ballsMoving && totalMotion < 0.1) {
        setBallsMoving(false);
        setIsAiming(true);
        evaluateTurnEnd();
      }

      // 3. Draw Balls
      balls.forEach(b => {
        if (b.isPocketed) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.isCue ? '#ffffff' : b.color;
        ctx.shadowBlur = b.isCue ? 8 : 4;
        ctx.fill();

        // White stripe for striped balls
        if (b.isStriped) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#f8fafc';
          ctx.fill();
        }

        // Ball number circle
        if (!b.isCue) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(b.id), b.x, b.y);
        }
        ctx.restore();
      });

      // 4. Draw Aim Guide & Cue Stick
      const cueBall = balls.find(b => b.isCue && !b.isPocketed);
      if (cueBall && isAiming && !ballsMoving && !gameOver) {
        ctx.save();
        // Aim Trajectory Line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(cueBall.x + Math.cos(aimAngle) * 160, cueBall.y + Math.sin(aimAngle) * 160);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cue Stick behind the ball
        const stickDistance = 24 + (shotPower / 100) * 20;
        const stickStartX = cueBall.x - Math.cos(aimAngle) * stickDistance;
        const stickStartY = cueBall.y - Math.sin(aimAngle) * stickDistance;
        const stickEndX = cueBall.x - Math.cos(aimAngle) * (stickDistance + 130);
        const stickEndY = cueBall.y - Math.sin(aimAngle) * (stickDistance + 130);

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(stickStartX, stickStartY);
        ctx.lineTo(stickEndX, stickEndY);
        ctx.stroke();

        // Tip chalk
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(stickStartX, stickStartY);
        ctx.lineTo(stickStartX - Math.cos(aimAngle) * 6, stickStartY - Math.sin(aimAngle) * 6);
        ctx.stroke();

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [aimAngle, shotPower, isAiming, ballsMoving, gameOver]);

  // Handle pocket events
  const handleBallPocketed = (ball: Ball) => {
    if (ball.isCue) {
      // Scratch Foul
      sound.playPlayerHit();
      setFouls(f => f + 1);
      setAnnouncement('FOUL! Cue ball scratched in pocket.');
      // Return cue ball to table center left
      setTimeout(() => {
        ball.x = 160;
        ball.y = TABLE_H / 2;
        ball.isPocketed = false;
        ball.vx = 0;
        ball.vy = 0;
      }, 800);
      return;
    }

    if (ball.isEight) {
      // 8-Ball Pocketed
      const playerRemaining = ballsRef.current.filter(b => {
        if (b.isCue || b.isEight || b.isPocketed) return false;
        return playerSuit === 'solids' ? !b.isStriped : b.isStriped;
      }).length;

      if (playerRemaining === 0) {
        // Legal 8-Ball win!
        finishMatch(true, 'LEGAL 8-BALL POCKETED! YOU WIN!');
      } else {
        // Early 8-Ball scratch: Loss!
        finishMatch(false, 'EARLY 8-BALL SCRATCH! AUTOMATIC LOSS.');
      }
      return;
    }

    // Assign suits if table was open
    if (playerSuit === 'open') {
      const assigned = ball.isStriped ? 'stripes' : 'solids';
      setPlayerSuit(assigned);
      setAnnouncement(`Table claimed: ${player.username} is ${assigned.toUpperCase()}!`);
    }

    // Award score points
    if (turn === 'player') {
      setPlayerScore(s => s + 50);
    } else {
      setAiScore(s => s + 50);
    }
  };

  // Turn management after shot resolves
  const evaluateTurnEnd = () => {
    if (gameMode === 'versus_ai') {
      if (turn === 'player') {
        setTurn('ai');
        setAnnouncement('Turn: Hustler-AI taking the shot...');
        triggerAiShot();
      } else {
        setTurn('player');
        setAnnouncement('Your turn! Line up cue stick.');
      }
    }
  };

  const finishMatch = (isWin: boolean, msg: string) => {
    setGameOver(true);
    setAnnouncement(msg);

    const calculatedScore = isWin ? playerScore + 500 : playerScore;
    setPlayerScore(calculatedScore);

    if (isWin) {
      sound.playWinFanfare();
      confetti({ particleCount: 100, spread: 80 });
    } else {
      sound.playGameOver();
    }

    recordFinishedGame({
      gameId: 'pool',
      score: calculatedScore,
      mode: gameMode,
      result: isWin ? 'win' : 'loss',
      aiScore: aiScore,
      detail: msg,
    });
  };

  const restartPool = () => {
    sound.playInsertCoin();
    setTurn('player');
    setPlayerSuit('open');
    setPlayerScore(0);
    setAiScore(0);
    setFouls(0);
    setGameOver(false);
    setIsAiming(true);
    setBallsMoving(false);
    initTable();
    setAnnouncement('Break the rack! Aim with mouse and set cue strike power.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 neon-box-cyan">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Disc size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-emerald-400 font-heading">
              CYBER 8-BALL POOL
            </h1>
            <p className="text-xs text-slate-400">
              Billiards Physics • {gameMode === 'versus_ai' ? 'VS Hustler-AI' : 'Solo Practice Table'}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('solo');
              restartPool();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              gameMode === 'solo' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Table
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
              restartPool();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              gameMode === 'versus_ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Hustler-AI
          </button>
        </div>

        {/* Live Status */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Assigned Suit</div>
            <div className="text-sm font-bold text-cyan-400 uppercase font-arcade">
              {playerSuit}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Your Score</div>
            <div className="text-2xl font-black text-emerald-400 font-arcade">
              {playerScore}
            </div>
          </div>
          {gameMode === 'versus_ai' && (
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">AI Score</div>
              <div className="text-2xl font-black text-cyan-400 font-arcade">
                {aiScore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screen & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={TABLE_W}
            height={TABLE_H}
            onMouseMove={handleMouseMove}
            className="rounded-2xl max-w-full border-2 border-slate-800 bg-slate-950 cursor-crosshair"
          />

          <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles size={14} /> {announcement}
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-emerald-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-emerald-400 font-heading">
                MATCH CONCLUDED
              </h2>
              <div className="text-sm font-arcade text-amber-400">
                FINAL SCORE: {playerScore} PTS
              </div>
              <div className="flex gap-3">
                <button
                  onClick={restartPool}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Re-Rack Table
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
              <Zap size={16} /> Cue Strike Power
            </h3>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                <span>Strike Force</span>
                <span className="text-emerald-400 font-arcade">{shotPower}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={shotPower}
                disabled={ballsMoving || gameOver || turn !== 'player'}
                onChange={(e) => setShotPower(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              <button
                type="button"
                disabled={ballsMoving || gameOver || turn !== 'player'}
                onClick={strikeCueBall}
                className="w-full mt-4 py-4 rounded-2xl font-black uppercase text-sm tracking-wider bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-xl shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Disc size={18} /> TAKE SHOT (STRIKE)
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 uppercase text-[10px]">Rules of 8-Ball:</div>
            <div>• Pocket your suit (Solids 1-7 or Stripes 9-15).</div>
            <div>• Pocket the 8-Ball last to claim victory!</div>
            <div>• Avoid scratching the white cue ball.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
