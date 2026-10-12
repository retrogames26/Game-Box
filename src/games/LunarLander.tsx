import React, { useState, useEffect, useRef } from 'react';
import { Rocket, Play, RotateCcw, Bot, Sparkles, Award, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface LandingPad {
  x: number;
  y: number;
  w: number;
  multiplier: number;
  name: string;
}

export const LunarLander: React.FC = () => {
  const { recordFinishedGame, openAuthModal, isGuest } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [landedSuccess, setLandedSuccess] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');
  const [score, setScore] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [altitude, setAltitude] = useState(0);
  const [hSpeed, setHSpeed] = useState(0);
  const [vSpeed, setVSpeed] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Guide lander smoothly to any green pad.');

  // Lander state
  const landerRef = useRef({
    x: 100,
    y: 80,
    vx: 1.2,
    vy: 0.2,
    angle: 0, // radians
    fuel: 100,
  });

  const keysRef = useRef<{ [k: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  // Landing pads
  const pads: LandingPad[] = [
    { x: 60, y: 440, w: 90, multiplier: 1, name: 'Alpha Pad (1x)' },
    { x: 260, y: 390, w: 70, multiplier: 3, name: 'Crater Ridge (3x)' },
    { x: 480, y: 430, w: 55, multiplier: 5, name: 'Narrow Pinnacle (5x)' },
  ];

  // Terrain line coordinates
  const terrain = [
    { x: 0, y: 450 },
    { x: 60, y: 440 },
    { x: 150, y: 440 }, // pad 1
    { x: 200, y: 480 },
    { x: 260, y: 390 },
    { x: 330, y: 390 }, // pad 2
    { x: 400, y: 470 },
    { x: 480, y: 430 },
    { x: 535, y: 430 }, // pad 3
    { x: 640, y: 460 },
  ];

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
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

  // Main Physics Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gravity = 0.035;

    const render = () => {
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 123) % canvas.width;
        const sy = (i * 67) % (canvas.height - 120);
        ctx.fillRect(sx, sy, 1.2, 1.2);
      }

      // Draw Terrain
      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Terrain Neon Surface Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Landing Pads
      pads.forEach((pad) => {
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillRect(pad.x, pad.y - 4, pad.w, 4);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = '10px sans-serif';
        ctx.fillText(pad.name, pad.x + 2, pad.y - 8);
        ctx.shadowBlur = 0;
      });

      // Update Lander Physics
      const l = landerRef.current;
      const keys = keysRef.current;

      // Rotation
      if (keys['a'] || keys['arrowleft']) l.angle -= 0.04;
      if (keys['d'] || keys['arrowright']) l.angle += 0.04;

      // Main Thruster
      let thrusting = false;
      if ((keys['w'] || keys['arrowup'] || keys[' ']) && l.fuel > 0) {
        thrusting = true;
        sound.playThruster();
        const thrustPower = 0.085;
        l.vx += Math.sin(l.angle) * thrustPower;
        l.vy -= Math.cos(l.angle) * thrustPower;
        l.fuel = Math.max(0, l.fuel - 0.25);
        setFuel(Math.floor(l.fuel));
      }

      // Gravity
      l.vy += gravity;

      // Update coordinates
      l.x += l.vx;
      l.y += l.vy;

      // Gauges
      setAltitude(Math.max(0, Math.floor(450 - l.y)));
      setHSpeed(Number(Math.abs(l.vx).toFixed(1)));
      setVSpeed(Number(l.vy.toFixed(1)));

      // Draw Lander
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angle);

      // Main Thruster Flame
      if (thrusting) {
        ctx.beginPath();
        ctx.moveTo(-6, 12);
        ctx.lineTo(0, 24 + Math.random() * 8);
        ctx.lineTo(6, 12);
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fill();
      }

      // Lander Body Capsule
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-12, -10, 24, 20);

      // Glass Cockpit
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-8, -8, 16, 8);

      // Landing Legs
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(-16, 16);
      ctx.moveTo(10, 10);
      ctx.lineTo(16, 16);
      ctx.stroke();

      ctx.restore();

      // Check Landing / Collision
      // Check if touching any pad
      for (const pad of pads) {
        if (l.x >= pad.x && l.x <= pad.x + pad.w && l.y >= pad.y - 12 && l.y <= pad.y + 4) {
          // Check safety constraints
          const angleOk = Math.abs(l.angle) < 0.25; // ~14 degrees
          const vSpeedOk = l.vy < 1.4;
          const hSpeedOk = Math.abs(l.vx) < 1.0;

          if (angleOk && vSpeedOk && hSpeedOk) {
            handleTouchdown(pad);
          } else {
            handleCrash('TOUCHDOWN VELOCITY TOO HIGH! EXPLOSION!');
          }
          return;
        }
      }

      // Check collision with general terrain or ground
      if (l.y > 450 || l.x < 10 || l.x > canvas.width - 10) {
        handleCrash('CRASHED INTO LUNAR SURFACE!');
        return;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver]);

  const handleTouchdown = (pad: LandingPad) => {
    sound.playSafeTouchdown();
    setLandedSuccess(true);
    setGameOver(true);
    setIsPlaying(false);
    confetti({ particleCount: 90, spread: 70 });

    const fuelBonus = Math.floor(landerRef.current.fuel * 5);
    const landingScore = (200 + fuelBonus) * pad.multiplier;
    setScore(landingScore);
    setStatusMessage(`SUCCESSFUL TOUCHDOWN on ${pad.name}! Fuel Bonus: +${fuelBonus}`);

    // AI score simulation
    const simulatedAi = 350 + Math.floor(Math.random() * 300);
    setAiScore(simulatedAi);

    let result: 'win' | 'loss' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      result = landingScore >= simulatedAi ? 'win' : 'loss';
    }

    recordFinishedGame({
      gameId: 'lander',
      gameName: 'Astro Gravity Lander',
      score: landingScore,
      mode: gameMode,
      result,
      aiOpponentName: gameMode === 'versus_ai' ? 'Apollo-Drone 9' : undefined,
      aiScore: gameMode === 'versus_ai' ? simulatedAi : undefined,
      detail: `Docked on ${pad.name} (${landingScore} pts)`,
    });
  };

  const handleCrash = (reason: string) => {
    sound.playExplosion();
    setLandedSuccess(false);
    setGameOver(true);
    setIsPlaying(false);
    setStatusMessage(reason);
    setScore(25); // consolation pts

    const simulatedAi = 400;
    setAiScore(simulatedAi);

    recordFinishedGame({
      gameId: 'lander',
      gameName: 'Astro Gravity Lander',
      score: 25,
      mode: gameMode,
      result: gameMode === 'versus_ai' ? 'loss' : 'solo',
      aiOpponentName: gameMode === 'versus_ai' ? 'Apollo-Drone 9' : undefined,
      aiScore: gameMode === 'versus_ai' ? simulatedAi : undefined,
      detail: 'Crash landing on surface',
    });
  };

  const startLander = () => {
    sound.playInsertCoin();
    setScore(0);
    setFuel(100);
    setLandedSuccess(false);
    setStatusMessage('Stabilize lander descent with gentle thruster bursts.');
    landerRef.current = {
      x: 100,
      y: 80,
      vx: 1.2,
      vy: 0.2,
      angle: 0,
      fuel: 100,
    };
    setGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 neon-box-cyan">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Rocket size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-emerald-400 font-heading">
              ASTRO GRAVITY LANDER
            </h1>
            <p className="text-xs text-slate-400">
              Orbital Descent Physics • {gameMode === 'versus_ai' ? 'VS Apollo-Drone 9' : 'Solo Docking'}
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
              gameMode === 'solo' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Mission
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              gameMode === 'versus_ai' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Apollo-Drone
          </button>
        </div>

        {/* Flight Gauges */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Fuel Tank</div>
            <div className={`text-base font-arcade ${fuel < 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {fuel}%
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Vertical Speed</div>
            <div className={`text-base font-arcade ${vSpeed > 1.4 ? 'text-red-400' : 'text-cyan-400'}`}>
              {vSpeed} m/s
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
            <div className="text-2xl font-black text-emerald-400 font-arcade">
              {score}
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
              <Rocket className="text-emerald-400 animate-bounce" size={48} />
              <h2 className="text-2xl font-black text-emerald-400 font-heading">
                APPROACHING LUNAR ORBIT
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                W or Up Arrow for Main Thruster. A/D to rotate ship. Touch down on green pads with vertical speed under 1.4 m/s and level angle!
              </p>
              <button
                onClick={startLander}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-xl shadow-emerald-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> INITIATE DESCENT
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <h2 className={`text-3xl font-black font-heading ${landedSuccess ? 'text-emerald-400' : 'text-pink-500'}`}>
                {landedSuccess ? 'PERFECT TOUCHDOWN' : 'MISSION FAILED'}
              </h2>
              <p className="text-xs text-slate-300 max-w-md">{statusMessage}</p>
              <div className="text-sm font-arcade text-emerald-400">
                SCORE: {score} PTS
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startLander}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Re-Launch
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

        {/* Mission Guidance */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
              <Zap size={16} /> Landing Telemetry
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Altitude</span>
                <span className="text-cyan-400 font-arcade">{altitude} m</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Horizontal Drift</span>
                <span className="text-amber-400 font-arcade">{hSpeed} m/s</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Vertical Descent</span>
                <span className="text-emerald-400 font-arcade">{vSpeed} m/s</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="text-emerald-400 font-bold uppercase text-[10px]">Landing Multipliers:</div>
              <div>• Alpha Pad: Wide (1x Base)</div>
              <div>• Crater Ridge: Medium Cliff (3x Score)</div>
              <div>• Narrow Pinnacle: Hard High Shelf (5x Score)</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400">
            Keep descent speed under <strong className="text-cyan-400">1.4 m/s</strong> or landing struts will buckle!
          </div>
        </div>
      </div>
    </div>
  );
};
