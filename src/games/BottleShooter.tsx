import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, Play, RotateCcw, Bot, Sparkles, Award, Zap, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface BottleTarget {
  id: string;
  shelf: number; // 0 (top), 1 (middle), 2 (bottom)
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  neckColor: string;
  type: 'standard' | 'rare' | 'golden' | 'moving';
  label: string;
  points: number;
  isHit: boolean;
  vx: number;
  shatterProgress: number; // 0 to 1
}

interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  size: number;
  alpha: number;
}

interface FloatingScore {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

export const BottleShooter: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Match Configuration & Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');

  // Player Stats
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(8);
  const [maxAmmo] = useState(8);
  const [reloadsLeft, setReloadsLeft] = useState(4);
  const [isReloading, setIsReloading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [combo, setCombo] = useState(0);
  const [bottlesBroken, setBottlesBroken] = useState(0);

  // AI Opponent Stats (strictly separated)
  const [aiScore, setAiScore] = useState(0);
  const [aiAmmo, setAiAmmo] = useState(8);
  const [aiBottlesBroken, setAiBottlesBroken] = useState(0);
  const [aiLastShot, setAiLastShot] = useState<{ x: number; y: number; hit: boolean } | null>(null);

  // Crosshair state
  const crosshairRef = useRef({ x: 320, y: 260, visible: true });
  const [announcement, setAnnouncement] = useState('Aim at the neon carnival bottles! Click or Tap to fire.');

  // Game internal simulation objects
  const targetsRef = useRef<BottleTarget[]>([]);
  const shardsRef = useRef<GlassShard[]>([]);
  const scoresRef = useRef<FloatingScore[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Helper: Create carnival bottles on 3 wooden neon shelves
  const createShelvesOfBottles = () => {
    const list: BottleTarget[] = [];
    const shelfY = [120, 240, 360];

    // Colors & Styles for fictional carnival bottles (no real alcohol brands)
    const bottleStyles = [
      { color: '#06b6d4', glow: '#22d3ee', neck: '#67e8f9', type: 'standard' as const, label: 'CYBER SODA', points: 50, w: 26, h: 54 },
      { color: '#ec4899', glow: '#f472b6', neck: '#fbcfe8', type: 'standard' as const, label: 'NEON POP', points: 60, w: 28, h: 56 },
      { color: '#a855f7', glow: '#c084fc', neck: '#e9d5ff', type: 'rare' as const, label: 'QUANTUM COLA', points: 100, w: 24, h: 60 },
      { color: '#eab308', glow: '#fde047', neck: '#fef08a', type: 'golden' as const, label: 'GOLD ELIXIR', points: 250, w: 24, h: 62 },
      { color: '#10b981', glow: '#34d399', neck: '#a7f3d0', type: 'standard' as const, label: 'LIME FIZZ', points: 70, w: 26, h: 54 },
      { color: '#f43f5e', glow: '#fb7185', neck: '#fecdd3', type: 'rare' as const, label: 'CHERRY BLAST', points: 120, w: 28, h: 58 },
    ];

    shelfY.forEach((sy, sIdx) => {
      const bottleCount = sIdx === 0 ? 5 : sIdx === 1 ? 6 : 7;
      const startX = sIdx === 0 ? 110 : sIdx === 1 ? 80 : 50;
      const spacing = (640 - startX * 2) / (bottleCount - 1);

      for (let i = 0; i < bottleCount; i++) {
        const isGolden = sIdx === 0 && i === 2;
        const isRare = (sIdx === 1 && (i === 1 || i === 4)) || (sIdx === 0 && (i === 1 || i === 3));
        const isMoving = sIdx === 0 || (sIdx === 1 && i % 2 === 0);

        let style = bottleStyles[Math.floor(Math.random() * bottleStyles.length)];
        if (isGolden) style = bottleStyles[3];
        else if (isRare) style = bottleStyles[2];

        list.push({
          id: `bot_${sIdx}_${i}_${Date.now()}`,
          shelf: sIdx,
          x: startX + i * spacing,
          y: sy - style.h,
          width: style.w,
          height: style.h,
          color: style.color,
          glowColor: style.glow,
          neckColor: style.neck,
          type: isGolden ? 'golden' : isRare ? 'rare' : isMoving ? 'moving' : 'standard',
          label: style.label,
          points: style.points,
          isHit: false,
          vx: isMoving ? (sIdx % 2 === 0 ? 1.2 : -1.2) : 0,
          shatterProgress: 0,
        });
      }
    });

    targetsRef.current = list;
  };

  // Shatter Glass Explosion Effect
  const spawnGlassShatter = (x: number, y: number, color: string) => {
    sound.playGlassShatter();
    const count = 28;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      shardsRef.current.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5, // initial upward blast
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        color,
        size: Math.random() * 6 + 3,
        alpha: 1,
      });
    }
  };

  // Add floating floating score popup
  const addFloatingScore = (x: number, y: number, text: string, color: string) => {
    scoresRef.current.push({
      id: `fs_${Date.now()}_${Math.random()}`,
      x,
      y,
      text,
      color,
      alpha: 1,
    });
  };

  // Reload Ammo
  const handleReload = () => {
    if (isReloading || ammo === maxAmmo || reloadsLeft <= 0 || !isPlaying || gameOver) return;
    setIsReloading(true);
    sound.playSelect();
    setAnnouncement('Reloading magazine...');
    setTimeout(() => {
      setAmmo(maxAmmo);
      setReloadsLeft((r) => Math.max(0, r - 1));
      setIsReloading(false);
      setAnnouncement('Locked & loaded! Take aim.');
    }, 650);
  };

  // Player Fire Shot with mouse/crosshair
  const handleShoot = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver) return;
    if (isReloading) {
      sound.playClick();
      setAnnouncement('Magazine empty! Reloading...');
      return;
    }
    if (ammo <= 0) {
      sound.playClick();
      setAnnouncement('Click! Out of ammo! Press RELOAD (R).');
      return;
    }

    sound.playGunShot();
    const newAmmo = ammo - 1;
    setAmmo(newAmmo);

    const canvas = canvasRef.current;
    if (!canvas) return;

    let shotX = crosshairRef.current.x;
    let shotY = crosshairRef.current.y;

    if (e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('clientX' in e) {
        shotX = (e.clientX - rect.left) * scaleX;
        shotY = (e.clientY - rect.top) * scaleY;
      } else if (e.touches && e.touches[0]) {
        shotX = (e.touches[0].clientX - rect.left) * scaleX;
        shotY = (e.touches[0].clientY - rect.top) * scaleY;
      }
      crosshairRef.current.x = shotX;
      crosshairRef.current.y = shotY;
    }

    // Precise Collision detection against standing bottles
    let hitBottle: BottleTarget | null = null;
    for (const b of targetsRef.current) {
      if (b.isHit) continue;
      // Hitbox padding for tactile arcade feel
      if (
        shotX >= b.x - 6 &&
        shotX <= b.x + b.width + 6 &&
        shotY >= b.y - 6 &&
        shotY <= b.y + b.height + 6
      ) {
        hitBottle = b;
        break;
      }
    }

    if (hitBottle) {
      hitBottle.isHit = true;
      spawnGlassShatter(hitBottle.x + hitBottle.width / 2, hitBottle.y + hitBottle.height / 2, hitBottle.glowColor);

      const newCombo = combo + 1;
      setCombo(newCombo);
      const comboMultiplier = newCombo >= 5 ? 2.5 : newCombo >= 3 ? 1.8 : 1.0;
      const awarded = Math.round(hitBottle.points * comboMultiplier);

      setScore((s) => s + awarded);
      setBottlesBroken((b) => b + 1);

      addFloatingScore(
        hitBottle.x + hitBottle.width / 2,
        hitBottle.y,
        `+${awarded} ${newCombo >= 3 ? `(${newCombo}x COMBO!)` : ''}`,
        hitBottle.glowColor
      );

      setAnnouncement(`HIT! Shattered ${hitBottle.label}! +${awarded} pts!`);

      // Check if shelf is wiped out to respawn
      const remaining = targetsRef.current.filter((t) => !t.isHit);
      if (remaining.length <= 3) {
        setTimeout(() => {
          createShelvesOfBottles();
          setAnnouncement('NEW BOTTLE RACK RESTOCKED!');
        }, 800);
      }
    } else {
      // Missed shot resets combo
      setCombo(0);
      setAnnouncement('MISS! Recalibrate crosshair.');
    }

    if (newAmmo === 0 && reloadsLeft > 0) {
      setTimeout(() => handleReload(), 300);
    }
  };

  // Mouse / Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    crosshairRef.current.x = (e.clientX - rect.left) * scaleX;
    crosshairRef.current.y = (e.clientY - rect.top) * scaleY;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReload();
      } else if (e.key === ' ' && isPlaying && !gameOver) {
        e.preventDefault();
        handleShoot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, ammo, isReloading, reloadsLeft]);

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

  // AI Opponent simulation (independent shooting events, ammo, score)
  useEffect(() => {
    if (!isPlaying || gameOver || gameMode !== 'versus_ai') return;

    const aiInterval = setInterval(() => {
      // AI checks for valid targets
      const standing = targetsRef.current.filter((b) => !b.isHit);
      if (standing.length === 0) return;

      // AI Ammo check
      if (aiAmmo <= 0) {
        setAiAmmo(8); // AI reloads
        return;
      }

      setAiAmmo((a) => Math.max(0, a - 1));

      // AI Accuracy ~ 70%
      const hitChance = Math.random();
      if (hitChance < 0.72) {
        // AI hits a target
        const target = standing[Math.floor(Math.random() * standing.length)];
        target.isHit = true;
        spawnGlassShatter(target.x + target.width / 2, target.y + target.height / 2, target.glowColor);

        setAiScore((s) => s + target.points);
        setAiBottlesBroken((b) => b + 1);
        setAiLastShot({ x: target.x, y: target.y, hit: true });

        addFloatingScore(
          target.x + target.width / 2,
          target.y + 10,
          `AI: +${target.points}`,
          '#f43f5e'
        );
      } else {
        // AI missed
        setAiLastShot({ x: Math.random() * 500 + 70, y: Math.random() * 300 + 80, hit: false });
      }
    }, 1800);

    return () => clearInterval(aiInterval);
  }, [isPlaying, gameOver, gameMode, aiAmmo]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // 1. Carnival Shooting Gallery Backdrop
      ctx.fillStyle = '#050716';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant carnival wood panelling with neon trim
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0d24');
      grad.addColorStop(0.5, '#121436');
      grad.addColorStop(1, '#08081a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Red/Yellow carnival striped marquee banner at top
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#b91c1c' : '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(i * 40, 0);
        ctx.lineTo(i * 40 + 40, 0);
        ctx.lineTo(i * 40 + 20, 28);
        ctx.closePath();
        ctx.fill();
      }

      // Wooden Shelves
      const shelfY = [120, 240, 360];
      shelfY.forEach((sy) => {
        // Wooden plank
        ctx.fillStyle = '#451a03';
        ctx.fillRect(30, sy, 580, 16);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, sy, 580, 16);

        // Neon ledge underglow
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fillRect(34, sy + 15, 572, 3);
        ctx.shadowBlur = 0;
      });

      // Counter Top at bottom
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 470, canvas.width, 50);
      ctx.strokeStyle = '#312e81';
      ctx.strokeRect(0, 470, canvas.width, 50);

      // 2. Update and Draw Bottles
      targetsRef.current.forEach((b) => {
        if (!b.isHit) {
          // Horizontal movement on moving shelves
          if (b.vx !== 0) {
            b.x += b.vx;
            if (b.x < 45 || b.x > 595 - b.width) {
              b.vx *= -1;
            }
          }

          // Draw Bottle
          ctx.save();
          ctx.shadowColor = b.glowColor;
          ctx.shadowBlur = b.type === 'golden' ? 16 : 8;

          // Main Bottle Body
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y + 16, b.width, b.height - 16, 5);
          ctx.fill();

          // Bottle Neck
          ctx.fillStyle = b.neckColor;
          const neckW = b.width * 0.45;
          const neckX = b.x + (b.width - neckW) / 2;
          ctx.beginPath();
          ctx.roundRect(neckX, b.y, neckW, 18, [3, 3, 0, 0]);
          ctx.fill();

          // Bottle Cap / Cork
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(neckX - 1, b.y - 3, neckW + 2, 4);

          // Glass Reflection Sheen
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillRect(b.x + 3, b.y + 18, 3, b.height - 22);

          // Point label badge
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${b.points}`, b.x + b.width / 2, b.y + b.height - 8);

          ctx.restore();
        }
      });

      // 3. Update and Draw Shattered Glass Shards
      for (let i = shardsRef.current.length - 1; i >= 0; i--) {
        const s = shardsRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.35; // Gravity
        s.rotation += s.vRot;
        s.alpha -= 0.022;

        if (s.alpha <= 0 || s.y > canvas.height) {
          shardsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(0, -s.size);
        ctx.lineTo(s.size * 0.8, s.size * 0.8);
        ctx.lineTo(-s.size * 0.8, s.size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 4. Update and Draw Floating Scores
      for (let i = scoresRef.current.length - 1; i >= 0; i--) {
        const fs = scoresRef.current[i];
        fs.y -= 1.2;
        fs.alpha -= 0.025;

        if (fs.alpha <= 0) {
          scoresRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, fs.alpha);
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = fs.color;
        ctx.shadowColor = fs.color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      }

      // 5. Draw Player Crosshair
      const ch = crosshairRef.current;
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 8;

      // Outer targeting circle
      ctx.beginPath();
      ctx.arc(ch.x, ch.y, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Center cross lines
      ctx.beginPath();
      ctx.moveTo(ch.x - 26, ch.y);
      ctx.lineTo(ch.x - 8, ch.y);
      ctx.moveTo(ch.x + 8, ch.y);
      ctx.lineTo(ch.x + 26, ch.y);
      ctx.moveTo(ch.x, ch.y - 26);
      ctx.lineTo(ch.x, ch.y - 8);
      ctx.moveTo(ch.x, ch.y + 8);
      ctx.lineTo(ch.x, ch.y + 26);
      ctx.stroke();

      // Center red pin-point
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ch.x, ch.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Draw AI Last Shot Indicator (if versus AI)
      if (gameMode === 'versus_ai' && aiLastShot) {
        ctx.save();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(aiLastShot.x, aiLastShot.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('AI SHOT', aiLastShot.x - 18, aiLastShot.y - 18);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, gameMode, aiLastShot]);

  // End Game
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
      if (score >= 800) {
        sound.playWinFanfare();
        confetti({ particleCount: 90, spread: 70 });
      }
    }

    recordFinishedGame({
      gameId: 'shooter',
      score,
      mode: gameMode,
      result,
      aiScore: gameMode === 'versus_ai' ? aiScore : undefined,
      detail: `${bottlesBroken} bottles shattered (${score} pts)`,
    });
  };

  const startGallery = () => {
    sound.playInsertCoin();
    setScore(0);
    setAmmo(8);
    setReloadsLeft(4);
    setTimeLeft(45);
    setCombo(0);
    setBottlesBroken(0);
    setAiScore(0);
    setAiAmmo(8);
    setAiBottlesBroken(0);
    setAiLastShot(null);
    shardsRef.current = [];
    scoresRef.current = [];
    createShelvesOfBottles();
    setGameOver(false);
    setIsPlaying(true);
    setAnnouncement('Round started! Aim, shoot, and break all carnival bottles!');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 neon-box-cyan shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Crosshair size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-heading">
              NEON BOTTLE SHOOTER
            </h1>
            <p className="text-xs text-slate-400">
              Carnival Target Gallery • {gameMode === 'versus_ai' ? 'VS Sharpshooter-AI' : 'Solo Marksman'}
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
              gameMode === 'solo' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Solo Gallery
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              gameMode === 'versus_ai' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot size={14} /> VS Sharpshooter-AI
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
            <div className="text-2xl font-black text-cyan-400 font-arcade">
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

      {/* Main Shooting Range Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative select-none">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            onPointerMove={handlePointerMove}
            onPointerDown={handleShoot}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950 cursor-crosshair touch-none"
          />

          {/* Start Screen Overlay */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Crosshair className="text-cyan-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-black text-cyan-400 font-heading">
                CARNIVAL BOTTLE SHOOTER
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Aim with mouse/touch crosshair and tap to fire! Shatter glowing soda and elixir bottles off the shelves, build combo streaks, and reload with [R].
              </p>
              <button
                onClick={startGallery}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-xl shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> STEP UP & SHOOT
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-cyan-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-cyan-400 font-heading">
                TIME EXPIRED!
              </h2>
              <div className="text-sm font-arcade text-amber-400">
                FINAL SCORE: {score} PTS ({bottlesBroken} Bottles Shattered)
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  Sharpshooter-AI: <strong className="text-pink-400">{aiScore} pts</strong> ({aiBottlesBroken} bottles) —{' '}
                  <span className="font-bold text-cyan-300">
                    {score > aiScore ? 'VICTORY! YOU OUTSHOT THE AI!' : score < aiScore ? 'AI CLAIMED THE PRIZE' : 'TIED DRAW!'}
                  </span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={startGallery}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25"
                >
                  <RotateCcw size={14} /> Play Again
                </button>
                <button
                  onClick={openUsernameModal}
                  className="py-3 px-6 rounded-xl font-bold text-xs bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-400 transition cursor-pointer"
                >
                  Change Player Tag ({player.username})
                </button>
              </div>
            </div>
          )}

          {/* Marquee Banner */}
          <div className="mt-2 text-xs font-bold text-cyan-400 flex items-center gap-1.5">
            <Sparkles size={14} /> {announcement}
          </div>
        </div>

        {/* Weapons & Reload Side Controls */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
              <Zap size={16} /> Carnival Rifle Chamber
            </h3>

            {/* Ammo Gauge */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Magazine Ammo</span>
                <span className="text-cyan-400 font-bold font-arcade">{ammo} / {maxAmmo}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: maxAmmo }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 flex-1 rounded-sm transition-all ${
                      i < ammo ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                <span className="text-slate-400">Magazines Left</span>
                <span className="text-amber-400 font-arcade">{'🟡 '.repeat(reloadsLeft) || 'NONE'}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Streak Combo</span>
                <span className="text-emerald-400 font-arcade">{combo}x</span>
              </div>
            </div>

            {/* Reload Button */}
            <button
              type="button"
              disabled={ammo === maxAmmo || reloadsLeft <= 0 || isReloading || !isPlaying}
              onClick={handleReload}
              className="w-full py-3.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50 border border-cyan-500/50 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw size={16} className={isReloading ? 'animate-spin' : ''} />
              {isReloading ? 'RELOADING...' : 'RELOAD MAGAZINE (R)'}
            </button>
          </div>

          {/* Bottle Types Guide */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Carnival Bottle Targets
            </div>
            <div className="flex items-center justify-between text-cyan-400">
              <span>Cyan/Pink Soda (Static)</span>
              <span className="font-arcade">50-60 pts</span>
            </div>
            <div className="flex items-center justify-between text-purple-400">
              <span>Purple Quantum Cola</span>
              <span className="font-arcade">100 pts</span>
            </div>
            <div className="flex items-center justify-between text-yellow-400">
              <span>Gold Carnival Elixir</span>
              <span className="font-arcade">250 pts</span>
            </div>
            <div className="flex items-center justify-between text-emerald-400">
              <span>Moving Shelf Targets</span>
              <span className="font-arcade">Bonus Combo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
