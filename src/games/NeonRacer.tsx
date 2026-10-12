import React, { useState, useEffect, useRef } from 'react';
import { Car, Play, RotateCcw, Bot, Flame, Gauge, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface TrafficCar {
  id: string;
  x: number; // -1 to 1
  z: number; // distance
  speed: number;
  color: string;
  type: 'sedan' | 'truck' | 'sport';
}

export const NeonRacer: React.FC = () => {
  const { recordFinishedGame, openAuthModal, isGuest } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [nitro, setNitro] = useState(50);
  const [aiDistance, setAiDistance] = useState(0);
  const [playerDistance, setPlayerDistance] = useState(0);

  // Player state
  const playerRef = useRef({
    x: 0, // -1 (left shoulder) to 1 (right shoulder)
    speed: 0,
    maxSpeed: 240,
    nitroActive: false,
  });

  const keysRef = useRef<{ [k: string]: boolean }>({});
  const trafficRef = useRef<TrafficCar[]>([]);
  const roadCurveRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.key === ' ' && nitro >= 20 && isPlaying) {
        playerRef.current.nitroActive = true;
        sound.playTurbo();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
      if (e.key === ' ') {
        playerRef.current.nitroActive = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nitro, isPlaying]);

  // Traffic generator
  const spawnTraffic = () => {
    const count = 7;
    const colors = ['#06b6d4', '#eab308', '#a855f7', '#10b981', '#f43f5e'];
    const newTraffic: TrafficCar[] = [];
    for (let i = 0; i < count; i++) {
      newTraffic.push({
        id: `tr_${i}`,
        x: (Math.random() - 0.5) * 1.5,
        z: 300 + i * 220 + Math.random() * 80,
        speed: 120 + Math.random() * 60,
        color: colors[i % colors.length],
        type: i % 3 === 0 ? 'truck' : 'sedan',
      });
    }
    trafficRef.current = newTraffic;
  };

  // Timer countdown
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          endGame();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, gameOver]);

  // Main Render & Physics Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localDist = playerDistance;
    let localAiDist = aiDistance;

    const render = () => {
      const p = playerRef.current;
      const keys = keysRef.current;

      // Handle Acceleration & Steering
      const accel = p.nitroActive ? 4.5 : 2.5;
      const decel = 1.8;
      const topSpeed = p.nitroActive ? 320 : 240;

      if (keys['w'] || keys['arrowup']) {
        p.speed = Math.min(topSpeed, p.speed + accel);
      } else {
        p.speed = Math.max(0, p.speed - decel);
      }

      if (p.speed > 10) {
        const steerSpeed = (0.02 * (p.speed / 200));
        if (keys['a'] || keys['arrowleft']) p.x = Math.max(-1.1, p.x - steerSpeed);
        if (keys['d'] || keys['arrowright']) p.x = Math.min(1.1, p.x + steerSpeed);
      }

      // Nitro consumption
      if (p.nitroActive) {
        setNitro((n) => {
          const nn = Math.max(0, n - 0.4);
          if (nn <= 0) p.nitroActive = false;
          return nn;
        });
      } else {
        setNitro((n) => Math.min(100, n + 0.08));
      }

      // Update distance & score
      const distDelta = (p.speed / 3600) * 1000;
      localDist += distDelta;
      setPlayerDistance(Math.floor(localDist));
      setSpeedKmh(Math.floor(p.speed));
      setScore(Math.floor(localDist * 1.5));

      // AI Rival distance
      if (gameMode === 'versus_ai') {
        localAiDist += (230 / 3600) * 1000 * (0.95 + Math.random() * 0.1);
        setAiDistance(Math.floor(localAiDist));
      }

      // Dynamic Road curve
      roadCurveRef.current = Math.sin(Date.now() / 2500) * 0.6;

      // Draw Retro Horizon & Grid Sky
      ctx.fillStyle = '#050512';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Neon Synthwave Sunset
      const sunGrad = ctx.createLinearGradient(0, 100, 0, 240);
      sunGrad.addColorStop(0, '#f43f5e');
      sunGrad.addColorStop(1, '#eab308');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(canvas.width / 2 + roadCurveRef.current * 80, 220, 70, Math.PI, 0);
      ctx.fill();

      // Horizon line
      const horizonY = 230;

      // Draw 3D Perspective Road
      const roadSegments = 120;
      for (let i = roadSegments; i >= 1; i--) {
        const z = i * 15;
        const nextZ = (i - 1) * 15;
        const y = horizonY + (canvas.height - horizonY) * (1 / (i * 0.08 + 1));
        const nextY = horizonY + (canvas.height - horizonY) * (1 / ((i - 1) * 0.08 + 1));

        const scale = 1 / (i * 0.08 + 1);
        const nextScale = 1 / ((i - 1) * 0.08 + 1);

        const curveOffset = Math.sin((i * 10 + Date.now() * 0.005)) * roadCurveRef.current * 180;
        const nextCurveOffset = Math.sin(((i - 1) * 10 + Date.now() * 0.005)) * roadCurveRef.current * 180;

        const roadW = 600 * scale;
        const nextRoadW = 600 * nextScale;

        const cx = canvas.width / 2 + curveOffset - p.x * 200 * scale;
        const nextCx = canvas.width / 2 + nextCurveOffset - p.x * 200 * nextScale;

        // Alternate road segment stripe color
        const isStripe = Math.floor((localDist * 0.2 + i)) % 2 === 0;
        ctx.fillStyle = isStripe ? '#181829' : '#0f0f1d';

        ctx.beginPath();
        ctx.moveTo(cx - roadW / 2, y);
        ctx.lineTo(cx + roadW / 2, y);
        ctx.lineTo(nextCx + nextRoadW / 2, nextY);
        ctx.lineTo(nextCx - nextRoadW / 2, nextY);
        ctx.closePath();
        ctx.fill();

        // Neon Edge Curbs
        ctx.fillStyle = isStripe ? '#f43f5e' : '#ffffff';
        ctx.fillRect(cx - roadW / 2 - 4 * scale, y, 6 * scale, nextY - y);
        ctx.fillRect(cx + roadW / 2, y, 6 * scale, nextY - y);

        // Center dashed line
        if (isStripe) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(cx - 3 * scale, y, 6 * scale, nextY - y);
        }
      }

      // Update & Draw Traffic Cars
      for (let i = 0; i < trafficRef.current.length; i++) {
        const tr = trafficRef.current[i];
        // Relative speed difference
        tr.z -= (p.speed - tr.speed) * 0.06;

        if (tr.z < 10) {
          // Check collision with player car
          if (Math.abs(tr.x - p.x) < 0.35) {
            sound.playPlayerHit();
            p.speed = Math.max(40, p.speed * 0.4);
            tr.z += 150;
          }
        }

        // Respawn ahead if passed
        if (tr.z <= 0) {
          tr.z = 1200 + Math.random() * 200;
          tr.x = (Math.random() - 0.5) * 1.4;
          // Overtake bonus
          setNitro((n) => Math.min(100, n + 8));
        }

        // Draw car if in visible range
        if (tr.z > 0 && tr.z < 1400) {
          const zScale = 250 / tr.z;
          const ty = horizonY + (canvas.height - horizonY) * (1 / (tr.z * 0.005 + 1));
          const tx = canvas.width / 2 + tr.x * 280 * zScale - p.x * 150 * zScale;
          const cw = 44 * zScale;
          const ch = 24 * zScale;

          if (zScale > 0.1 && zScale < 2.5) {
            ctx.save();
            ctx.fillStyle = tr.color;
            ctx.shadowColor = tr.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(tx - cw / 2, ty - ch, cw, ch);

            // Taillights
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(tx - cw / 2 + 2, ty - 6, 6 * zScale, 4 * zScale);
            ctx.fillRect(tx + cw / 2 - 8 * zScale, ty - 6, 6 * zScale, 4 * zScale);
            ctx.restore();
          }
        }
      }

      // Draw Player Supercar at bottom center
      const px = canvas.width / 2;
      const py = canvas.height - 40;
      ctx.save();
      ctx.translate(px, py);

      // Nitro booster exhaust flame
      if (p.nitroActive) {
        ctx.beginPath();
        ctx.moveTo(-12, 10);
        ctx.lineTo(0, 30 + Math.random() * 15);
        ctx.lineTo(12, 10);
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        ctx.fill();
      }

      // Supercar Body
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.fillRect(-35, -20, 70, 30);

      // Cockpit Windshield
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-22, -18, 44, 14);

      // Rear Neon Tail Bar
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-30, 6, 60, 4);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, gameMode]);

  const endGame = () => {
    setGameOver(true);
    setIsPlaying(false);
    sound.playGameOver();

    let result: 'win' | 'loss' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      result = playerDistance > aiDistance ? 'win' : 'loss';
      if (result === 'win') {
        sound.playWinFanfare();
        confetti({ particleCount: 100, spread: 80 });
      }
    }

    recordFinishedGame({
      gameId: 'racer',
      gameName: 'Synthwave Highway 84',
      score: Math.floor(playerDistance * 1.5),
      mode: gameMode,
      result,
      aiOpponentName: gameMode === 'versus_ai' ? 'Shadow-GT' : undefined,
      aiScore: gameMode === 'versus_ai' ? Math.floor(aiDistance * 1.5) : undefined,
      detail: `${playerDistance}m distance @ max ${playerRef.current.nitroActive ? 320 : 240} km/h`,
    });
  };

  const startRace = () => {
    sound.playInsertCoin();
    setTimeLeft(40);
    setScore(0);
    setPlayerDistance(0);
    setAiDistance(0);
    setNitro(50);
    setSpeedKmh(0);
    playerRef.current.x = 0;
    playerRef.current.speed = 0;
    playerRef.current.nitroActive = false;
    spawnTraffic();
    setGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 neon-box-pink">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <Car size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-rose-400 font-heading">
              SYNTHWAVE HIGHWAY 84
            </h1>
            <p className="text-xs text-slate-400">
              High-Speed Neon Drift • {gameMode === 'versus_ai' ? 'VS Rival Shadow-GT' : 'Solo Distance Sprint'}
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
              gameMode === 'solo' ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Highway
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              gameMode === 'versus_ai' ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Shadow-GT
          </button>
        </div>

        {/* Live Gauges */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Time Left</div>
            <div className={`text-base font-arcade ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              {timeLeft}s
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Speedometer</div>
            <div className="text-lg font-bold text-amber-400 font-arcade">
              {speedKmh} KM/H
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Distance</div>
            <div className="text-2xl font-black text-rose-400 font-arcade">
              {playerDistance}m
            </div>
          </div>
        </div>
      </div>

      {/* Screen & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950"
          />

          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Car className="text-rose-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-black text-rose-400 font-heading">
                REV YOUR ENGINE
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                W or Up Arrow to accelerate. A/D or Left/Right to steer between traffic lanes. Hold Space for Nitro Turbo Boost!
              </p>
              <button
                onClick={startRace}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-300 hover:to-pink-300 shadow-xl shadow-rose-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> GREEN LIGHT & IGNITE
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <h2 className="text-3xl font-black text-rose-500 font-heading">
                TIME EXPIRED
              </h2>
              <div className="text-sm font-arcade text-rose-400">
                FINAL DISTANCE: {playerDistance} METERS
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  Shadow-GT Distance: <strong className="text-cyan-400">{aiDistance}m</strong> (
                  {playerDistance > aiDistance ? 'YOU OUT-DRIFTED THE RIVAL!' : 'SHADOW-GT CLAIMED POLE POSITION'})
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={startRace}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-rose-500 text-slate-950 hover:bg-rose-400 transition flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Re-Ignite Turbo
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

        {/* Dashboard Gauges */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-2">
              <Flame size={16} /> Turbo Telemetry
            </h3>

            {/* Nitro Meter */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mb-4">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Nitro Core</span>
                <span className="text-cyan-400 font-arcade">{Math.floor(nitro)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-75"
                  style={{ width: `${nitro}%` }}
                />
              </div>
            </div>

            {/* Controls Helper */}
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                <strong>Steer:</strong> A / D or Left / Right Arrows
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                <strong>Accelerate:</strong> W or Up Arrow
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-cyan-400">
                <strong>Nitro Boost:</strong> Spacebar (Burn to 320 km/h)
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400">
            Close overtakes near traffic cars charge your Nitro meter instantly!
          </div>
        </div>
      </div>
    </div>
  );
};
