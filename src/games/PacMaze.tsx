import React, { useState, useEffect, useRef } from 'react';
import { Ghost, Play, Pause, RotateCcw, Heart, Trophy, Bot, Flame, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

// 19x19 Grid Map:
// 1 = Wall, 0 = Pellet, 2 = Empty/No Pellet, 3 = Power Pellet, 4 = Enemy Pen
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,2,1,2,1,1,1,0,1,1,1,1],
  [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2],
  [1,1,1,1,0,1,2,1,4,4,4,1,2,1,0,1,1,1,1],
  [2,2,2,2,0,2,2,1,4,4,4,1,2,2,0,2,2,2,2],
  [1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1],
  [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2],
  [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,3,0,1,0,0,0,0,0,2,0,0,0,0,0,1,0,3,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

interface GhostState {
  id: string;
  name: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  frightenedColor: string;
  isFrightened: boolean;
  isEaten: boolean;
  baseSpeed: number;
}

export const PacMaze: React.FC = () => {
  const { profile, recordFinishedGame, openAuthModal, isGuest } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [challengeMode, setChallengeMode] = useState(false);

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [aiTargetScore, setAiTargetScore] = useState(2500);

  // Player state
  const playerRef = useRef({
    x: 9,
    y: 14,
    dx: 0,
    dy: 0,
    nextDx: 0,
    nextDy: 0,
    mouthAngle: 0.2,
    mouthDir: 1,
  });

  const ghostsRef = useRef<GhostState[]>([
    { id: 'g1', name: 'Blaze (Hunter)', x: 9, y: 9, dx: 0, dy: -1, color: '#ef4444', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.08 },
    { id: 'g2', name: 'Glitch (Flanker)', x: 8, y: 10, dx: -1, dy: 0, color: '#06b6d4', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.075 },
    { id: 'g3', name: 'Volt (Patrol)', x: 10, y: 10, dx: 1, dy: 0, color: '#ec4899', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.07 },
    { id: 'g4', name: 'Echo (Wanderer)', x: 9, y: 10, dx: 0, dy: 1, color: '#f59e0b', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.065 },
  ]);

  const mazeGridRef = useRef<number[][]>(JSON.parse(JSON.stringify(MAZE_TEMPLATE)));
  const frightenedTimerRef = useRef<number | null>(null);
  const ghostComboRef = useRef<number>(200);
  const animFrameRef = useRef<number | null>(null);

  // Initialize maze
  const resetMaze = (advanceLevel = false) => {
    mazeGridRef.current = JSON.parse(JSON.stringify(MAZE_TEMPLATE));
    playerRef.current.x = 9;
    playerRef.current.y = 14;
    playerRef.current.dx = 0;
    playerRef.current.dy = 0;
    playerRef.current.nextDx = 0;
    playerRef.current.nextDy = 0;

    ghostsRef.current = [
      { id: 'g1', name: 'Blaze', x: 9, y: 9, dx: 0, dy: -1, color: '#ef4444', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.08 + level * 0.005 },
      { id: 'g2', name: 'Glitch', x: 8, y: 10, dx: -1, dy: 0, color: '#06b6d4', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.075 + level * 0.005 },
      { id: 'g3', name: 'Volt', x: 10, y: 10, dx: 1, dy: 0, color: '#ec4899', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.07 + level * 0.005 },
      { id: 'g4', name: 'Echo', x: 9, y: 10, dx: 0, dy: 1, color: '#f59e0b', frightenedColor: '#3b82f6', isFrightened: false, isEaten: false, baseSpeed: 0.065 + level * 0.005 },
    ];

    if (!advanceLevel) {
      setScore(0);
      setLives(3);
      setGameOver(false);
      setVictory(false);
      setAiTargetScore(2500);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P') {
        setIsPaused(p => !p);
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        playerRef.current.nextDx = 0;
        playerRef.current.nextDy = -1;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        playerRef.current.nextDx = 0;
        playerRef.current.nextDy = 1;
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        playerRef.current.nextDx = -1;
        playerRef.current.nextDy = 0;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        playerRef.current.nextDx = 1;
        playerRef.current.nextDy = 0;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const setDirection = (dx: number, dy: number) => {
    sound.playClick();
    playerRef.current.nextDx = dx;
    playerRef.current.nextDy = dy;
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused || gameOver || victory) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tileSize = 24; // 19 * 24 = 456px
    const playerSpeed = 0.09 + level * 0.008;

    let localScore = score;

    const canMoveTo = (gridX: number, gridY: number): boolean => {
      const gx = Math.round(gridX);
      const gy = Math.round(gridY);
      if (gy < 0 || gy >= 19 || gx < 0 || gx >= 19) return true; // wrap tunnel
      const tile = mazeGridRef.current[gy][gx];
      return tile !== 1 && tile !== 4; // cannot enter wall or pen
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Maze & Pellets
      let remainingPellets = 0;
      for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
          const tile = mazeGridRef.current[r][c];
          const px = c * tileSize;
          const py = r * tileSize;

          if (tile === 1) {
            // Neon Wall
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
          } else if (tile === 0) {
            // Regular Pellet
            remainingPellets++;
            ctx.beginPath();
            ctx.arc(px + tileSize / 2, py + tileSize / 2, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fde047';
            ctx.shadowColor = '#eab308';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (tile === 3) {
            // Flashing Power Pellet
            remainingPellets++;
            ctx.beginPath();
            const pulse = 6 + Math.sin(Date.now() / 150) * 2;
            ctx.arc(px + tileSize / 2, py + tileSize / 2, pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#ec4899';
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Check level clear
      if (remainingPellets === 0) {
        sound.playWinFanfare();
        confetti({ particleCount: 60, spread: 70 });
        setLevel(prev => prev + 1);
        resetMaze(true);
        return;
      }

      // 2. Update Player
      const p = playerRef.current;

      // Try turning if at grid intersection
      const nearGridX = Math.round(p.x);
      const nearGridY = Math.round(p.y);
      const alignedX = Math.abs(p.x - nearGridX) < 0.2;
      const alignedY = Math.abs(p.y - nearGridY) < 0.2;

      if (alignedX && alignedY && (p.nextDx !== 0 || p.nextDy !== 0)) {
        if (canMoveTo(nearGridX + p.nextDx, nearGridY + p.nextDy)) {
          p.x = nearGridX;
          p.y = nearGridY;
          p.dx = p.nextDx;
          p.dy = p.nextDy;
          p.nextDx = 0;
          p.nextDy = 0;
        }
      }

      // Move player forward if not hitting wall
      const nextX = p.x + p.dx * playerSpeed;
      const nextY = p.y + p.dy * playerSpeed;

      // Screen Wrap
      if (nextX < 0) p.x = 18;
      else if (nextX > 18) p.x = 0;
      else if (canMoveTo(p.dx > 0 ? Math.ceil(nextX) : Math.floor(nextX), p.dy > 0 ? Math.ceil(nextY) : Math.floor(nextY))) {
        p.x = nextX;
        p.y = nextY;
      }

      // Eat Pellets
      const curTileX = Math.round(p.x);
      const curTileY = Math.round(p.y);
      if (curTileY >= 0 && curTileY < 19 && curTileX >= 0 && curTileX < 19) {
        const item = mazeGridRef.current[curTileY][curTileX];
        if (item === 0) {
          mazeGridRef.current[curTileY][curTileX] = 2;
          localScore += 10;
          setScore(localScore);
          sound.playPellet();
        } else if (item === 3) {
          mazeGridRef.current[curTileY][curTileX] = 2;
          localScore += 50;
          setScore(localScore);
          sound.playPowerPellet();

          // Trigger frightened mode
          ghostComboRef.current = 200;
          ghostsRef.current.forEach(g => {
            if (!g.isEaten) g.isFrightened = true;
          });

          if (frightenedTimerRef.current) clearTimeout(frightenedTimerRef.current);
          frightenedTimerRef.current = window.setTimeout(() => {
            ghostsRef.current.forEach(g => {
              g.isFrightened = false;
            });
          }, 7000);
        }
      }

      // Draw Player (Neon Pac-Orb)
      p.mouthAngle += 0.05 * p.mouthDir;
      if (p.mouthAngle > 0.45 || p.mouthAngle < 0.05) p.mouthDir *= -1;

      let rotation = 0;
      if (p.dx === 1) rotation = 0;
      else if (p.dx === -1) rotation = Math.PI;
      else if (p.dy === 1) rotation = Math.PI / 2;
      else if (p.dy === -1) rotation = -Math.PI / 2;

      ctx.save();
      ctx.translate(p.x * tileSize + tileSize / 2, p.y * tileSize + tileSize / 2);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.arc(0, 0, tileSize / 2 - 2, p.mouthAngle * Math.PI, (2 - p.mouthAngle) * Math.PI);
      ctx.lineTo(0, 0);
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      // 3. Update & Draw Ghosts
      ghostsRef.current.forEach(ghost => {
        // Ghost movement AI
        const gSpeed = ghost.isEaten ? 0.18 : ghost.isFrightened ? 0.045 : ghost.baseSpeed;
        const gNearX = Math.round(ghost.x);
        const gNearY = Math.round(ghost.y);

        if (Math.abs(ghost.x - gNearX) < 0.15 && Math.abs(ghost.y - gNearY) < 0.15) {
          ghost.x = gNearX;
          ghost.y = gNearY;

          // If eaten, move towards pen (9, 9)
          const targetX = ghost.isEaten ? 9 : ghost.isFrightened ? Math.random() * 19 : p.x;
          const targetY = ghost.isEaten ? 9 : ghost.isFrightened ? Math.random() * 19 : p.y;

          if (ghost.isEaten && gNearX === 9 && gNearY === 9) {
            ghost.isEaten = false;
            ghost.isFrightened = false;
          }

          // Pick best valid direction
          const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
          ];

          const validDirs = directions.filter(d => {
            // Avoid immediate 180 reverse unless blocked
            if (d.dx === -ghost.dx && d.dy === -ghost.dy) return false;
            const nx = gNearX + d.dx;
            const ny = gNearY + d.dy;
            if (ny < 0 || ny >= 19 || nx < 0 || nx >= 19) return false;
            const tile = mazeGridRef.current[ny][nx];
            return tile !== 1 && (ghost.isEaten || tile !== 4);
          });

          if (validDirs.length > 0) {
            // Sort by distance to target
            validDirs.sort((a, b) => {
              const distA = Math.hypot((gNearX + a.dx) - targetX, (gNearY + a.dy) - targetY);
              const distB = Math.hypot((gNearX + b.dx) - targetX, (gNearY + b.dy) - targetY);
              return distA - distB;
            });
            ghost.dx = validDirs[0].dx;
            ghost.dy = validDirs[0].dy;
          } else {
            ghost.dx *= -1;
            ghost.dy *= -1;
          }
        }

        ghost.x += ghost.dx * gSpeed;
        ghost.y += ghost.dy * gSpeed;

        // Draw Ghost
        const gx = ghost.x * tileSize + tileSize / 2;
        const gy = ghost.y * tileSize + tileSize / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(gx, gy - 2, tileSize / 2 - 3, Math.PI, 0, false);
        ctx.lineTo(gx + tileSize / 2 - 3, gy + tileSize / 2 - 4);
        ctx.lineTo(gx - tileSize / 2 + 3, gy + tileSize / 2 - 4);
        ctx.closePath();

        const ghostFill = ghost.isEaten ? '#64748b' : ghost.isFrightened ? ghost.frightenedColor : ghost.color;
        ctx.fillStyle = ghostFill;
        ctx.shadowColor = ghostFill;
        ctx.shadowBlur = 8;
        ctx.fill();

        // Eyes
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(gx - 4 + ghost.dx * 1.5, gy - 4 + ghost.dy * 1.5, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 4 + ghost.dx * 1.5, gy - 4 + ghost.dy * 1.5, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.restore();

        // 4. Collision Detection between Ghost & Player
        const distance = Math.hypot(p.x - ghost.x, p.y - ghost.y);
        if (distance < 0.75) {
          if (ghost.isFrightened && !ghost.isEaten) {
            // Player eats ghost!
            ghost.isEaten = true;
            ghost.isFrightened = false;
            const pointsGained = ghostComboRef.current;
            ghostComboRef.current *= 2;
            localScore += pointsGained;
            setScore(localScore);
            sound.playEatGhost();
          } else if (!ghost.isEaten && !ghost.isFrightened) {
            // Player loses a life
            sound.playPlayerHit();
            setLives(prev => {
              const remainingLives = prev - 1;
              if (remainingLives <= 0) {
                // Game Over
                handleGameOver(localScore);
              } else {
                // Reset positions
                playerRef.current.x = 9;
                playerRef.current.y = 14;
                playerRef.current.dx = 0;
                playerRef.current.dy = 0;
                ghostsRef.current.forEach((g, idx) => {
                  g.x = 8 + idx;
                  g.y = 10;
                });
              }
              return remainingLives;
            });
          }
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isPaused, gameOver, victory, level]);

  const handleGameOver = (finalScore: number) => {
    setGameOver(true);
    setIsPlaying(false);
    sound.playGameOver();

    let result: 'win' | 'loss' | 'solo' = 'solo';
    if (challengeMode) {
      result = finalScore >= aiTargetScore ? 'win' : 'loss';
      if (result === 'win') {
        sound.playWinFanfare();
        confetti({ particleCount: 100, spread: 80 });
      }
    }

    recordFinishedGame({
      gameId: 'pacmaze',
      gameName: 'Neon Maze Runner',
      score: finalScore,
      mode: challengeMode ? 'versus_ai' : 'solo',
      result,
      aiOpponentName: challengeMode ? 'Ghost AI Target' : undefined,
      aiScore: challengeMode ? aiTargetScore : undefined,
      detail: `Level ${level} reached (${finalScore} pts)`,
    });
  };

  const startGame = () => {
    sound.playInsertCoin();
    resetMaze(false);
    setIsPlaying(true);
    setIsPaused(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 neon-box-yellow">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Ghost size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-amber-400 font-heading">
              NEON MAZE RUNNER
            </h1>
            <p className="text-xs text-slate-400">
              Cyber Ghost Chase • {challengeMode ? `VS AI Score Target (${aiTargetScore} pts)` : 'Classic Maze Run'}
            </p>
          </div>
        </div>

        {/* Challenge Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setChallengeMode(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              !challengeMode ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Classic Run
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setChallengeMode(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              challengeMode ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> AI Target Race
          </button>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Lives</div>
            <div className="text-base text-pink-400 font-arcade">
              {'❤️ '.repeat(lives)}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Level</div>
            <div className="text-lg font-bold text-cyan-400 font-arcade">
              LVL {level}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
            <div className="text-2xl font-black text-amber-400 font-arcade">
              {score}
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas Display */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={456}
            height={456}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950"
          />

          {/* Overlay Start Screen */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Ghost className="text-amber-400 animate-bounce" size={48} />
              <h2 className="text-2xl font-black text-amber-400 font-heading">
                READY PLAYER ONE?
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Collect all yellow pellets, grab pink power nodes to turn ghosts blue and gobble them up for cascading combo bonuses!
              </p>
              <button
                onClick={startGame}
                className="py-3 px-8 rounded-2xl font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-xl shadow-amber-500/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} /> INSERT TOKEN & START
              </button>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <h2 className="text-3xl font-black text-pink-500 font-heading">
                GAME OVER
              </h2>
              <div className="text-sm font-arcade text-amber-400">
                FINAL SCORE: {score} PTS
              </div>
              {challengeMode && (
                <div className="text-xs text-slate-300">
                  Target was <strong className="text-cyan-400">{aiTargetScore} pts</strong>: {score >= aiTargetScore ? 'TARGET EXCEEDED! WIN!' : 'FELL SHORT OF TARGET.'}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={startGame}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Replay Level
                </button>
                {isGuest && (
                  <button
                    onClick={() => openAuthModal('register')}
                    className="py-3 px-6 rounded-xl font-bold text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900 transition"
                  >
                    Save to Global Leaderboard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Controls & D-Pad */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <Sparkles size={16} /> Directional Input
            </h3>

            {/* Virtual Mobile D-Pad */}
            <div className="grid grid-cols-3 gap-2 w-44 mx-auto my-4">
              <div />
              <button
                type="button"
                onClick={() => setDirection(0, -1)}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 rounded-xl text-lg font-black border border-slate-700 flex items-center justify-center transition"
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                onClick={() => setDirection(-1, 0)}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 rounded-xl text-lg font-black border border-slate-700 flex items-center justify-center transition"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => setIsPaused(p => !p)}
                className="py-3.5 bg-slate-950 text-slate-400 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center"
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setDirection(1, 0)}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 rounded-xl text-lg font-black border border-slate-700 flex items-center justify-center transition"
              >
                ▶
              </button>
              <div />
              <button
                type="button"
                onClick={() => setDirection(0, 1)}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 rounded-xl text-lg font-black border border-slate-700 flex items-center justify-center transition"
              >
                ▼
              </button>
              <div />
            </div>

            <p className="text-[11px] text-center text-slate-500">
              Desktop: WASD or Arrow Keys to steer
            </p>
          </div>

          {/* Enemy Guide */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Active Ghost Algorithms
            </div>
            <div className="flex items-center gap-2 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Blaze — Aggressive Pursuit</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span>Glitch — Strategic Intercept</span>
            </div>
            <div className="flex items-center gap-2 text-pink-400">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <span>Volt — Corner Flanker</span>
            </div>
            <div className="flex items-center gap-2 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Echo — Unpredictable Wanderer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
