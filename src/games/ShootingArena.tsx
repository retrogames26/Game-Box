import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, Play, RotateCcw, Shield, Zap, Bot, Bomb, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
  color: string;
}

interface Enemy {
  id: string;
  type: 'drone' | 'fast' | 'heavy' | 'boss';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  color: string;
  size: number;
  shootCooldown: number;
  points: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'triple' | 'shield' | 'nuke';
}

export const ShootingArena: React.FC = () => {
  const { profile, recordFinishedGame, openAuthModal, isGuest } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mode & States
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [health, setHealth] = useState(100);
  const [bombsLeft, setBombsLeft] = useState(2);
  const [aiRivalScore, setAiRivalScore] = useState(0);
  const [activeWeapon, setActiveWeapon] = useState<'single' | 'triple'>('single');

  // Game internal objects
  const playerRef = useRef({
    x: 350,
    y: 450,
    angle: -Math.PI / 2,
    speed: 5,
    shield: false,
    weaponDuration: 0,
  });

  const keysRef = useRef<{ [k: string]: boolean }>({});
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Listen to controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' && isPlaying && !gameOver) {
        triggerNuke();
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
  }, [isPlaying, gameOver, bombsLeft]);

  // Mouse aim and click to shoot
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const angle = Math.atan2(my - playerRef.current.y, mx - playerRef.current.x);
    playerRef.current.angle = angle;
  };

  const handleShoot = () => {
    if (!isPlaying || gameOver) return;
    sound.playLaser();
    const p = playerRef.current;
    const speed = 10;

    if (activeWeapon === 'triple') {
      const angles = [p.angle - 0.2, p.angle, p.angle + 0.2];
      angles.forEach((ang) => {
        bulletsRef.current.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          isPlayer: true,
          color: '#06b6d4',
        });
      });
    } else {
      bulletsRef.current.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(p.angle) * speed,
        vy: Math.sin(p.angle) * speed,
        isPlayer: true,
        color: '#38bdf8',
      });
    }
  };

  const triggerNuke = () => {
    if (bombsLeft <= 0) return;
    sound.playExplosion();
    setBombsLeft((b) => b - 1);

    // Annihilate non-boss enemies
    enemiesRef.current.forEach((en) => {
      createExplosion(en.x, en.y, en.color, 25);
    });
    enemiesRef.current = enemiesRef.current.filter((en) => en.type === 'boss');
    setScore((s) => s + 300);
  };

  const createExplosion = (x: number, y: number, color: string, count: number = 15) => {
    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 4 + 1;
      const angle = Math.random() * Math.PI * 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size: Math.random() * 3 + 1,
      });
    }
  };

  const spawnWave = (currentWave: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const count = 4 + currentWave * 2;
    for (let i = 0; i < count; i++) {
      const type =
        i === 0 && currentWave >= 3
          ? 'boss'
          : Math.random() > 0.6
          ? 'heavy'
          : Math.random() > 0.4
          ? 'fast'
          : 'drone';
      const hp = type === 'boss' ? 30 : type === 'heavy' ? 4 : type === 'fast' ? 1 : 2;
      const color =
        type === 'boss'
          ? '#f43f5e'
          : type === 'heavy'
          ? '#a855f7'
          : type === 'fast'
          ? '#eab308'
          : '#ef4444';
      const size = type === 'boss' ? 32 : type === 'heavy' ? 20 : 14;

      enemiesRef.current.push({
        id: `en_${Date.now()}_${i}`,
        type,
        x: Math.random() * (canvas.width - 60) + 30,
        y: -30 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: type === 'fast' ? 2.5 : type === 'boss' ? 0.8 : 1.2,
        hp,
        maxHp: hp,
        color,
        size,
        shootCooldown: Math.floor(Math.random() * 120 + 60),
        points: type === 'boss' ? 500 : type === 'heavy' ? 150 : 50,
      });
    }
  };

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localScore = score;
    let localHp = health;
    let localAi = aiRivalScore;

    const render = () => {
      ctx.fillStyle = 'rgba(5, 5, 13, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield background
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 30; i++) {
        const sx = (Math.sin(i * 99 + Date.now() * 0.0005) * 0.5 + 0.5) * canvas.width;
        const sy = ((i * 37 + Date.now() * 0.05) % canvas.height);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Update Player Position
      const p = playerRef.current;
      const keys = keysRef.current;
      if (keys['w'] || keys['arrowup']) p.y = Math.max(20, p.y - p.speed);
      if (keys['s'] || keys['arrowdown']) p.y = Math.min(canvas.height - 20, p.y + p.speed);
      if (keys['a'] || keys['arrowleft']) p.x = Math.max(20, p.x - p.speed);
      if (keys['d'] || keys['arrowright']) p.x = Math.min(canvas.width - 20, p.x + p.speed);

      // AI Rival Score Simulation
      if (gameMode === 'versus_ai' && Math.random() < 0.04) {
        localAi += Math.floor(Math.random() * 25 + 10);
        setAiRivalScore(localAi);
      }

      // Weapon powerup decay
      if (activeWeapon !== 'single') {
        p.weaponDuration--;
        if (p.weaponDuration <= 0) setActiveWeapon('single');
      }

      // Draw Player Ship
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Thruster flame
      ctx.beginPath();
      ctx.moveTo(-15, -6);
      ctx.lineTo(-24 - Math.random() * 8, 0);
      ctx.lineTo(-15, 6);
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Spaceship body
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -14);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 14);
      ctx.closePath();
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Shield sphere if active
      if (p.shield) {
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.stroke();
      }
      ctx.restore();

      // Update & Draw Bullets
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.x += b.vx;
        b.y += b.vy;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.isPlayer ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fill();

        // Offscreen removal
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
          bulletsRef.current.splice(i, 1);
          continue;
        }

        // Enemy bullet hit player
        if (!b.isPlayer) {
          const distToPlayer = Math.hypot(b.x - p.x, b.y - p.y);
          if (distToPlayer < 18) {
            bulletsRef.current.splice(i, 1);
            if (p.shield) {
              p.shield = false;
              sound.playPowerUp();
            } else {
              sound.playPlayerHit();
              localHp -= 12;
              setHealth(Math.max(0, localHp));
              createExplosion(p.x, p.y, '#ef4444', 8);
              if (localHp <= 0) {
                endGame(localScore, localAi);
                return;
              }
            }
          }
        }
      }

      // Update & Draw Enemies
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const en = enemiesRef.current[i];
        en.x += en.vx;
        en.y += en.vy;

        // Bounce horizontally
        if (en.x < en.size || en.x > canvas.width - en.size) en.vx *= -1;

        // Enemy shooting
        en.shootCooldown--;
        if (en.shootCooldown <= 0) {
          en.shootCooldown = Math.floor(Math.random() * 100 + 80);
          const angleToPlayer = Math.atan2(p.y - en.y, p.x - en.x);
          bulletsRef.current.push({
            x: en.x,
            y: en.y,
            vx: Math.cos(angleToPlayer) * 4,
            vy: Math.sin(angleToPlayer) * 4,
            isPlayer: false,
            color: '#f43f5e',
          });
        }

        // Draw Enemy
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.fillStyle = en.color;
        ctx.shadowColor = en.color;
        ctx.shadowBlur = 8;

        if (en.type === 'boss') {
          // Dreadnought Boss Shape
          ctx.beginPath();
          ctx.moveTo(0, 24);
          ctx.lineTo(-30, -20);
          ctx.lineTo(0, -10);
          ctx.lineTo(30, -20);
          ctx.closePath();
          ctx.fill();
        } else {
          // Standard Star Drone
          ctx.beginPath();
          ctx.arc(0, 0, en.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // HP bar above enemy
        if (en.maxHp > 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-en.size, -en.size - 8, en.size * 2, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-en.size, -en.size - 8, (en.size * 2 * en.hp) / en.maxHp, 4);
        }
        ctx.restore();

        // Check bullet collisions with enemies
        for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
          const b = bulletsRef.current[j];
          if (!b.isPlayer) continue;

          const dist = Math.hypot(b.x - en.x, b.y - en.y);
          if (dist < en.size + 4) {
            bulletsRef.current.splice(j, 1);
            en.hp--;
            createExplosion(b.x, b.y, '#38bdf8', 4);

            if (en.hp <= 0) {
              sound.playExplosion();
              createExplosion(en.x, en.y, en.color, en.type === 'boss' ? 40 : 15);
              localScore += en.points;
              setScore(localScore);

              // Chance to spawn powerup
              if (Math.random() < 0.25) {
                const types: ('triple' | 'shield' | 'nuke')[] = ['triple', 'shield', 'nuke'];
                powerUpsRef.current.push({
                  x: en.x,
                  y: en.y,
                  type: types[Math.floor(Math.random() * types.length)],
                });
              }

              enemiesRef.current.splice(i, 1);
              break;
            }
          }
        }

        // Enemy off bottom
        if (en.y > canvas.height + 40) {
          enemiesRef.current.splice(i, 1);
        }
      }

      // Spawn next wave if empty
      if (enemiesRef.current.length === 0) {
        setWave((w) => {
          const nw = w + 1;
          spawnWave(nw);
          return nw;
        });
      }

      // Update & Draw Power-ups
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pw = powerUpsRef.current[i];
        pw.y += 1.5;

        ctx.beginPath();
        ctx.arc(pw.x, pw.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = pw.type === 'triple' ? '#06b6d4' : pw.type === 'shield' ? '#3b82f6' : '#ec4899';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();

        // Collision with player
        const dist = Math.hypot(pw.x - p.x, pw.y - p.y);
        if (dist < 24) {
          sound.playPowerUp();
          if (pw.type === 'triple') {
            setActiveWeapon('triple');
            p.weaponDuration = 400;
          } else if (pw.type === 'shield') {
            p.shield = true;
          } else if (pw.type === 'nuke') {
            setBombsLeft((b) => b + 1);
          }
          powerUpsRef.current.splice(i, 1);
        } else if (pw.y > canvas.height + 20) {
          powerUpsRef.current.splice(i, 1);
        }
      }

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.02;
        if (pt.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, activeWeapon, wave, gameMode]);

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
      gameId: 'shooter',
      gameName: 'Galactic Cyber Defender',
      score: finalScore,
      mode: gameMode,
      result,
      aiOpponentName: gameMode === 'versus_ai' ? 'Viper-7 Ace' : undefined,
      aiScore: gameMode === 'versus_ai' ? finalAiScore : undefined,
      detail: `Wave ${wave} reached (${finalScore} pts)`,
    });
  };

  const startCombat = () => {
    sound.playInsertCoin();
    setScore(0);
    setWave(1);
    setHealth(100);
    setBombsLeft(2);
    setAiRivalScore(0);
    setActiveWeapon('single');
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    playerRef.current.x = 350;
    playerRef.current.y = 450;
    playerRef.current.shield = false;
    setGameOver(false);
    setIsPlaying(true);
    spawnWave(1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 neon-box-cyan">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Crosshair size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-heading">
              GALACTIC CYBER DEFENDER
            </h1>
            <p className="text-xs text-slate-400">
              Top-Down Star Arena • {gameMode === 'versus_ai' ? 'VS AI Ace Viper-7' : 'Solo Survival Wave'}
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
              gameMode === 'solo' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Arena
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              gameMode === 'versus_ai' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS Viper-7 Ace
          </button>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Hull Shield</div>
            <div className="text-sm font-bold text-emerald-400 font-arcade">
              {health}%
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Wave</div>
            <div className="text-lg font-bold text-amber-400 font-arcade">
              WAVE {wave}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
            <div className="text-2xl font-black text-cyan-400 font-arcade">
              {score}
            </div>
          </div>
          {gameMode === 'versus_ai' && (
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Viper-7 Score</div>
              <div className="text-2xl font-black text-pink-400 font-arcade">
                {aiRivalScore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Shooting Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Combat Canvas */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={640}
            height={520}
            onMouseMove={handleMouseMove}
            onMouseDown={handleShoot}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950 cursor-crosshair"
          />

          {/* Start Screen */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Crosshair className="text-cyan-400 animate-spin" size={48} />
              <h2 className="text-2xl font-black text-cyan-400 font-heading">
                ENGAGE TARGETS
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Move with WASD/Arrows. Aim with mouse and click to fire. Collect power nodes and use Space to detonate Supernova Bombs!
              </p>
              <button
                onClick={startCombat}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-xl shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> LAUNCH STARFIGHTER
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <h2 className="text-3xl font-black text-pink-500 font-heading">
                STARFIGHTER DESTROYED
              </h2>
              <div className="text-sm font-arcade text-cyan-400">
                FINAL SCORE: {score} PTS
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  Viper-7 Score: <strong className="text-pink-400">{aiRivalScore} pts</strong> (
                  {score > aiRivalScore ? 'AI OUTGUNNED! VICTORY!' : 'VIPER-7 DOMINATED SECTOR'})
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={startCombat}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Re-Deploy
                </button>
                {isGuest && (
                  <button
                    onClick={() => openAuthModal('register')}
                    className="py-3 px-6 rounded-xl font-bold text-xs bg-pink-950/80 text-pink-300 border border-pink-500/40 hover:bg-pink-900 transition"
                  >
                    Save to Leaderboard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Weapons & Tacticals */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
              <Zap size={16} /> Weapons Array
            </h3>

            {/* Weapon Status */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Battery</span>
                <span className="text-cyan-400 font-bold uppercase">{activeWeapon} CANNON</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">EMP Bombs Left</span>
                <span className="text-pink-400 font-arcade">{'💣 '.repeat(bombsLeft) || 'EMPTY'}</span>
              </div>
            </div>

            {/* Emergency Bomb Trigger Button */}
            <button
              type="button"
              disabled={bombsLeft <= 0 || !isPlaying}
              onClick={triggerNuke}
              className="w-full py-3.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider bg-pink-600/30 text-pink-300 hover:bg-pink-600/50 border border-pink-500/50 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
            >
              <Bomb size={16} /> DETONATE EMP NUKE (SPACE)
            </button>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Power-Up Drops
            </div>
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Cyan Orb: Triple Plasma Blaster</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Blue Orb: Kinetic Energy Shield</span>
            </div>
            <div className="flex items-center gap-2 text-pink-400">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <span>Pink Orb: Supernova EMP Ordnance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
