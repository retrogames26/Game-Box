import React, { useState, useEffect, useRef } from 'react';
import { Package, RotateCcw, Trophy, Bot, Sparkles, Award, ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

export interface Prize {
  id: string;
  name: string;
  emoji: string;
  points: number;
  x: number;
  baseY: number;
  currentY: number;
  width: number;
  height: number;
  color: string;
  rarity: 'Common' | 'Rare' | 'Legendary';
  isFalling?: boolean;
  fallSpeed?: number;
}

const DEFAULT_PRIZES: Prize[] = [
  { id: 'p1', name: 'Quantum Diamond', emoji: '💎', points: 500, x: 190, baseY: 310, currentY: 310, width: 44, height: 44, color: '#06b6d4', rarity: 'Legendary' },
  { id: 'p2', name: 'Cyber Trophy', emoji: '🏆', points: 400, x: 135, baseY: 310, currentY: 310, width: 44, height: 44, color: '#f59e0b', rarity: 'Legendary' },
  { id: 'p3', name: 'Alien Invader', emoji: '👾', points: 300, x: 250, baseY: 320, currentY: 320, width: 42, height: 42, color: '#10b981', rarity: 'Rare' },
  { id: 'p4', name: 'Cyber Kitty', emoji: '🐱', points: 250, x: 310, baseY: 315, currentY: 315, width: 42, height: 42, color: '#ec4899', rarity: 'Rare' },
  { id: 'p5', name: 'Retro Gameboy', emoji: '🎮', points: 200, x: 370, baseY: 320, currentY: 320, width: 40, height: 40, color: '#a855f7', rarity: 'Rare' },
  { id: 'p6', name: 'Neon Heart', emoji: '💖', points: 180, x: 430, baseY: 325, currentY: 325, width: 38, height: 38, color: '#f43f5e', rarity: 'Common' },
  { id: 'p7', name: 'Pixel Duck', emoji: '🦆', points: 150, x: 485, baseY: 325, currentY: 325, width: 40, height: 40, color: '#eab308', rarity: 'Common' },
  { id: 'p8', name: 'Arcade Token', emoji: '🪙', points: 100, x: 220, baseY: 335, currentY: 335, width: 36, height: 36, color: '#14b8a6', rarity: 'Common' },
];

export const ClawMachine: React.FC = () => {
  const { player, recordFinishedGame } = useArcade();

  // Mode and Stats
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');
  const [tokensLeft, setTokensLeft] = useState(5);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'ai'>('player');
  const [collectedPrizes, setCollectedPrizes] = useState<Prize[]>([]);
  const [announcement, setAnnouncement] = useState('Position the claw with arrow keys / buttons, then drop!');

  // Claw State
  const [clawX, setClawX] = useState(260); // 80 (chute) to 510
  const [clawY, setClawY] = useState(45);  // 45 (top) to 310 (bottom)
  const [clawOpen, setClawOpen] = useState(true);
  const [gameState, setGameState] = useState<'ready' | 'dropping' | 'grabbing' | 'lifting' | 'returning' | 'delivering' | 'game_over'>('ready');

  // Prize array
  const [prizes, setPrizes] = useState<Prize[]>(() => JSON.parse(JSON.stringify(DEFAULT_PRIZES)));
  const [grabbedPrizeId, setGrabbedPrizeId] = useState<string | null>(null);

  // References for live animation loops to avoid closure lag
  const clawXRef = useRef(clawX);
  const clawYRef = useRef(clawY);
  const gameStateRef = useRef(gameState);
  const prizesRef = useRef(prizes);
  const grabbedPrizeIdRef = useRef(grabbedPrizeId);
  const willSlipRef = useRef(false);

  useEffect(() => {
    clawXRef.current = clawX;
  }, [clawX]);

  useEffect(() => {
    clawYRef.current = clawY;
  }, [clawY]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    prizesRef.current = prizes;
  }, [prizes]);

  useEffect(() => {
    grabbedPrizeIdRef.current = grabbedPrizeId;
  }, [grabbedPrizeId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'ready' || currentTurn !== 'player') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        sound.playClawMove();
        setClawX((prev) => Math.max(80, prev - 16));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        sound.playClawMove();
        setClawX((prev) => Math.min(510, prev + 16));
      } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        startDrop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTurn]);

  // Move controls for button presses (continuous or step)
  const moveLeft = () => {
    if (gameStateRef.current !== 'ready' || currentTurn !== 'player') return;
    sound.playClawMove();
    setClawX((prev) => Math.max(80, prev - 24));
  };

  const moveRight = () => {
    if (gameStateRef.current !== 'ready' || currentTurn !== 'player') return;
    sound.playClawMove();
    setClawX((prev) => Math.min(510, prev + 24));
  };

  // Claw drop sequence
  const startDrop = () => {
    if (gameStateRef.current !== 'ready') return;
    if (tokensLeft <= 0) return;

    sound.playClawDrop();
    setGameState('dropping');
    setAnnouncement('Claw descending into the prize pit...');
    setClawOpen(true);

    const targetY = 310;
    const dropTimer = setInterval(() => {
      setClawY((prevY) => {
        const nextY = prevY + 6;
        if (nextY >= targetY) {
          clearInterval(dropTimer);
          onClawReachedBottom(clawXRef.current, targetY);
          return targetY;
        }
        return nextY;
      });
    }, 24);
  };

  // Reached bottom: close claws and evaluate collision
  const onClawReachedBottom = (dropX: number, dropY: number) => {
    setGameState('grabbing');
    setAnnouncement('Clamping prongs...');
    sound.playClawGrab();
    setClawOpen(false);

    // Collision detection against actual prize positions
    setTimeout(() => {
      let targetPrize: Prize | null = null;
      let minDistance = 999;

      for (const p of prizesRef.current) {
        const pCenterX = p.x + p.width / 2;
        const dist = Math.abs(dropX - pCenterX);

        // Within grab radius (32px horizontal leeway)
        if (dist <= 34 && dist < minDistance) {
          minDistance = dist;
          targetPrize = p;
        }
      }

      if (targetPrize) {
        // Alignment accuracy multiplier (0.5 to 1.0)
        const accuracy = Math.max(0.4, 1 - minDistance / 36);

        // Base grip strength by rarity
        const baseGrip = targetPrize.rarity === 'Legendary' ? 0.6 : targetPrize.rarity === 'Rare' ? 0.75 : 0.9;
        const gripChance = baseGrip * accuracy;

        const success = Math.random() < gripChance;

        if (success) {
          // Check if it might slip mid-air (realistic arcade mechanic!)
          const slipChance = targetPrize.rarity === 'Legendary' ? 0.2 : targetPrize.rarity === 'Rare' ? 0.1 : 0.05;
          willSlipRef.current = Math.random() < slipChance;

          setGrabbedPrizeId(targetPrize.id);
          setAnnouncement(`Grabbed the ${targetPrize.name}! Hoisting up...`);
        } else {
          willSlipRef.current = false;
          setGrabbedPrizeId(null);
          setAnnouncement(`Claw slipped off the ${targetPrize.name}! Returning empty.`);
        }
      } else {
        willSlipRef.current = false;
        setGrabbedPrizeId(null);
        setAnnouncement('Missed! No prize beneath the claw.');
      }

      // Begin lifting
      startLift();
    }, 550);
  };

  // Lift claw back up
  const startLift = () => {
    setGameState('lifting');

    const liftTimer = setInterval(() => {
      setClawY((prevY) => {
        const nextY = prevY - 5;

        // Check for mid-lift slippage
        if (willSlipRef.current && nextY <= 170 && grabbedPrizeIdRef.current) {
          triggerSlip(grabbedPrizeIdRef.current);
          willSlipRef.current = false;
        }

        if (nextY <= 45) {
          clearInterval(liftTimer);
          onClawReachedTop();
          return 45;
        }
        return nextY;
      });
    }, 24);
  };

  // Mid-lift slip animation
  const triggerSlip = (prizeId: string) => {
    sound.playGameOver();
    setAnnouncement('Oh no! The prize slipped out of the claw!');
    setGrabbedPrizeId(null);

    // Animate prize falling back down with gravity
    setPrizes((prev) =>
      prev.map((p) => {
        if (p.id === prizeId) {
          return { ...p, isFalling: true, currentY: clawYRef.current + 25, fallSpeed: 2 };
        }
        return p;
      })
    );

    let fallY = clawYRef.current + 25;
    let speed = 2;
    const fallInterval = setInterval(() => {
      fallY += speed;
      speed += 1.5;

      setPrizes((prev) =>
        prev.map((p) => {
          if (p.id === prizeId) {
            if (fallY >= p.baseY) {
              clearInterval(fallInterval);
              return { ...p, currentY: p.baseY, isFalling: false };
            }
            return { ...p, currentY: fallY };
          }
          return p;
        })
      );
    }, 25);
  };

  // Reached top: glide trolley back to delivery chute
  const onClawReachedTop = () => {
    setGameState('returning');
    setAnnouncement('Trolley moving to delivery chute...');

    const returnTimer = setInterval(() => {
      setClawX((prevX) => {
        const nextX = prevX - 6;
        if (nextX <= 75) {
          clearInterval(returnTimer);
          deliverAtChute();
          return 75;
        }
        return nextX;
      });
    }, 24);
  };

  // Deliver at chute: open prongs and collect prize
  const deliverAtChute = () => {
    setGameState('delivering');
    setClawOpen(true); // Open prongs

    const prizeId = grabbedPrizeIdRef.current;
    if (prizeId) {
      const deliveredPrize = prizesRef.current.find((p) => p.id === prizeId);
      if (deliveredPrize) {
        sound.playPrizeCollected();
        confetti({ particleCount: 50, spread: 70, origin: { x: 0.25, y: 0.7 } });
        setAnnouncement(`SUCCESS! Caught ${deliveredPrize.name} (+${deliveredPrize.points} pts)!`);

        if (currentTurn === 'player') {
          setPlayerScore((s) => s + deliveredPrize.points);
          setCollectedPrizes((prev) => [...prev, deliveredPrize]);
        } else {
          setAiScore((s) => s + deliveredPrize.points);
        }

        // Remove from prize bed
        setPrizes((prev) => prev.filter((p) => p.id !== prizeId));
      }
    } else {
      setAnnouncement('Claw opened over chute. Nothing dropped.');
    }

    setGrabbedPrizeId(null);

    // End of attempt cycle
    setTimeout(() => {
      handleAttemptFinished();
    }, 1200);
  };

  const handleAttemptFinished = () => {
    const nextTokens = tokensLeft - 1;
    setTokensLeft(nextTokens);

    if (nextTokens <= 0) {
      finishGame();
      return;
    }

    if (gameMode === 'versus_ai') {
      if (currentTurn === 'player') {
        setCurrentTurn('ai');
        setGameState('ready');
        setAnnouncement('RoboClaw 3000 turn: AI scanning prize bed...');
        setTimeout(() => {
          runAiTurn();
        }, 1200);
      } else {
        setCurrentTurn('player');
        setGameState('ready');
        setAnnouncement('Your turn! Line up the claw.');
      }
    } else {
      setGameState('ready');
      setAnnouncement(`Attempt finished. ${nextTokens} tokens remaining.`);
    }
  };

  // AI Opponent logic
  const runAiTurn = () => {
    // Pick an available prize
    const activePrizes = prizesRef.current;
    if (activePrizes.length === 0) {
      finishGame();
      return;
    }

    // AI targets higher value prizes with slight random variance
    const sorted = [...activePrizes].sort((a, b) => b.points - a.points);
    const chosenTarget = Math.random() < 0.6 ? sorted[0] : sorted[Math.floor(Math.random() * sorted.length)];
    const targetCenterX = chosenTarget.x + chosenTarget.width / 2;

    // AI positioning with small jitter
    const jitter = (Math.random() - 0.5) * 16;
    const finalX = Math.max(80, Math.min(510, targetCenterX + jitter));

    setAnnouncement(`RoboClaw 3000 moving to target: ${chosenTarget.name}...`);

    let currentX = clawXRef.current;
    const step = currentX < finalX ? 6 : -6;

    const aiMoveInterval = setInterval(() => {
      currentX += step;
      setClawX(currentX);

      if ((step > 0 && currentX >= finalX) || (step < 0 && currentX <= finalX)) {
        clearInterval(aiMoveInterval);
        setClawX(finalX);
        setTimeout(() => {
          startDrop();
        }, 400);
      }
    }, 30);
  };

  // Finish match and submit score
  const finishGame = () => {
    setGameState('game_over');
    sound.playGameOver();

    let result: 'win' | 'loss' | 'draw' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      if (playerScore > aiScore) {
        result = 'win';
        sound.playWinFanfare();
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        setAnnouncement('VICTORY! You outperformed RoboClaw 3000!');
      } else if (playerScore < aiScore) {
        result = 'loss';
        setAnnouncement('DEFEAT! RoboClaw 3000 claimed the higher prize score.');
      } else {
        result = 'draw';
        setAnnouncement('DRAW! Equal prize ticket value.');
      }
    } else {
      if (playerScore >= 300) {
        sound.playWinFanfare();
        confetti({ particleCount: 80, spread: 70 });
      }
      setAnnouncement(`All attempts used! Final Score: ${playerScore}`);
    }

    recordFinishedGame({
      gameId: 'claw',
      score: playerScore,
      mode: gameMode,
      result,
      aiScore: gameMode === 'versus_ai' ? aiScore : undefined,
      detail: `${collectedPrizes.length} prizes won (${playerScore} pts)`,
    });
  };

  const restartGame = () => {
    sound.playInsertCoin();
    setTokensLeft(5);
    setPlayerScore(0);
    setAiScore(0);
    setCollectedPrizes([]);
    setPrizes(JSON.parse(JSON.stringify(DEFAULT_PRIZES)));
    setCurrentTurn('player');
    setGameState('ready');
    setClawX(260);
    setClawY(45);
    setGrabbedPrizeId(null);
    setAnnouncement('Position the claw with arrow keys / buttons, then drop!');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-pink-500/30 neon-box-pink">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/40">
            <Package size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-pink-400 font-heading">
              CYBER CLAW MACHINE
            </h1>
            <p className="text-xs text-slate-400">
              Physics Crane Grabber • {gameMode === 'versus_ai' ? 'Versus AI Battle' : 'Solo Score Attack'}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('solo');
              restartGame();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              gameMode === 'solo' ? 'bg-pink-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Solo Play
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
              restartGame();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              gameMode === 'versus_ai' ? 'bg-pink-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot size={14} /> VS RoboClaw 3000
          </button>
        </div>

        {/* Attempts & Score */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Attempts Left</div>
            <div className="text-lg font-bold text-amber-400 font-arcade">
              {'🪙 '.repeat(tokensLeft)}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Your Score</div>
            <div className="text-2xl font-black text-pink-400 font-arcade">
              {playerScore}
            </div>
          </div>
          {gameMode === 'versus_ai' && (
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">RoboClaw</div>
              <div className="text-2xl font-black text-cyan-400 font-arcade">
                {aiScore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Arcade Cabinet Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cabinet Visual Screen */}
        <div className="lg:col-span-3 relative bg-slate-950 rounded-3xl border-4 border-slate-800 p-4 shadow-2xl overflow-hidden min-h-[460px] flex flex-col justify-between select-none">
          {/* Glass Reflection Highlight */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none transform -skew-x-12 z-20" />

          {/* Top Rail Mechanism */}
          <div className="relative w-full h-8 bg-slate-900 border-b-2 border-pink-500/40 rounded-t-xl flex items-center px-4 z-10">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-pink-500 transition-all duration-75"
                style={{ width: `${((clawX - 75) / 435) * 100}%` }}
              />
            </div>
          </div>

          {/* Machine Interior (Internal coordinate space 600 x 380) */}
          <div className="relative flex-1 w-full h-[380px] overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
            {/* Mirror backplate grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b08_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Delivery Chute on Left */}
            <div className="absolute left-2 bottom-4 w-28 h-40 border-2 border-dashed border-cyan-400/60 bg-cyan-950/30 rounded-2xl flex flex-col items-center justify-end p-2 text-center z-10 shadow-lg shadow-cyan-950/40">
              <div className="text-[10px] font-bold text-cyan-300 font-arcade tracking-tight uppercase">
                PRIZE CHUTE
              </div>
              <div className="text-xl animate-bounce mt-1">⬇️</div>
              <div className="text-[9px] text-cyan-400/80">DROP ZONE</div>
            </div>

            {/* Prize Bed on the Floor */}
            <div className="absolute bottom-2 left-32 right-4 h-24 border-t-2 border-slate-800/80 bg-slate-900/50 rounded-xl pointer-events-none" />

            {/* Render Prizes at their actual (x, y) coordinates */}
            {prizes.map((p) => {
              const isGrabbed = grabbedPrizeId === p.id;
              // If grabbed, visually attach to the claw head!
              const currentVisualX = isGrabbed ? clawX - p.width / 2 : p.x;
              const currentVisualY = isGrabbed ? clawY + 28 : p.currentY;

              return (
                <div
                  key={p.id}
                  className={`absolute flex flex-col items-center justify-center transition-transform ${
                    isGrabbed ? 'z-30 scale-110 drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]' : 'z-10'
                  }`}
                  style={{
                    left: `${currentVisualX}px`,
                    top: `${currentVisualY}px`,
                    width: `${p.width}px`,
                    height: `${p.height}px`,
                    filter: `drop-shadow(0 0 6px ${p.color})`,
                  }}
                  title={`${p.name} (+${p.points} pts)`}
                >
                  <span className="text-3xl select-none leading-none">{p.emoji}</span>
                  {!isGrabbed && (
                    <span className="text-[9px] font-bold text-slate-300 font-arcade mt-0.5 bg-slate-900/80 px-1 rounded border border-slate-700/60">
                      {p.points}p
                    </span>
                  )}
                </div>
              );
            })}

            {/* Moving Claw Assembly */}
            <div
              className="absolute pointer-events-none transition-all duration-75 z-20"
              style={{
                left: `${clawX}px`,
                top: '0px',
                transform: 'translateX(-50%)',
              }}
            >
              {/* Vertical Cable */}
              <div
                className="w-1 bg-gradient-to-b from-slate-400 to-pink-400 mx-auto shadow-sm"
                style={{ height: `${clawY}px` }}
              />

              {/* Claw Motor Box */}
              <div className="w-12 h-6 bg-slate-800 border-2 border-pink-400 rounded-lg mx-auto flex items-center justify-center shadow-lg shadow-pink-500/30">
                <div className={`w-2 h-2 rounded-full ${gameState === 'dropping' || gameState === 'grabbing' ? 'bg-pink-400 animate-ping' : 'bg-pink-500'}`} />
              </div>

              {/* Clamping Prongs */}
              <div className="relative w-16 h-8 -mt-1 flex justify-between px-1">
                {/* Left Prong */}
                <div
                  className={`w-3 h-8 bg-slate-300 rounded-b-full border border-slate-700 transition-transform duration-300 origin-top shadow-md ${
                    clawOpen ? '-rotate-30' : 'rotate-12'
                  }`}
                />
                {/* Center Pin */}
                <div className="w-2 h-4 bg-pink-500 rounded-b-md" />
                {/* Right Prong */}
                <div
                  className={`w-3 h-8 bg-slate-300 rounded-b-full border border-slate-700 transition-transform duration-300 origin-top shadow-md ${
                    clawOpen ? 'rotate-30' : '-rotate-12'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Status Marquee Banner */}
          <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-semibold z-10">
            <span className="text-pink-400 flex items-center gap-1.5">
              <Sparkles size={14} /> {announcement}
            </span>
            {gameMode === 'versus_ai' && (
              <span className="text-slate-400">
                Turn:{' '}
                <strong className={currentTurn === 'player' ? 'text-pink-400' : 'text-cyan-400'}>
                  {currentTurn === 'player' ? player.username : 'RoboClaw 3000'}
                </strong>
              </span>
            )}
          </div>

          {/* Game Over Overlay */}
          {gameState === 'game_over' && (
            <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-pink-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-pink-400 font-heading">
                CREDIT FINISHED
              </h2>
              <div className="text-sm font-arcade text-amber-400">
                FINAL SCORE: {playerScore} PTS
              </div>
              <div className="text-xs text-slate-300 max-w-sm">
                Prizes Captured: {collectedPrizes.length > 0 ? collectedPrizes.map(p => `${p.emoji} ${p.name}`).join(', ') : 'None this round!'}
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  RoboClaw 3000: <strong className="text-cyan-400">{aiScore} pts</strong> (
                  {playerScore > aiScore ? 'YOU WON THE MATCH!' : playerScore < aiScore ? 'ROBOCLAW WON' : 'DRAW'})
                </div>
              )}
              <button
                onClick={restartGame}
                className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-pink-500 text-slate-950 hover:bg-pink-400 transition flex items-center gap-2 cursor-pointer shadow-lg shadow-pink-500/30"
              >
                <RotateCcw size={14} /> Insert Token / Play Again
              </button>
            </div>
          )}
        </div>

        {/* Physical Machine Control Panel */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
              <Trophy size={16} /> Physical Machine Controls
            </h3>

            {/* Horizontal Position Slider & Steppers */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                <span>Horizontal Position</span>
                <span className="text-pink-400 font-arcade">{clawX}px</span>
              </label>

              <input
                type="range"
                min={80}
                max={510}
                value={clawX}
                disabled={gameState !== 'ready' || currentTurn !== 'player'}
                onChange={(e) => {
                  sound.playClawMove();
                  setClawX(Number(e.target.value));
                }}
                className="w-full accent-pink-500 cursor-pointer"
              />

              {/* On-screen Directional Touch Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={gameState !== 'ready' || currentTurn !== 'player'}
                  onClick={moveLeft}
                  className="py-3 px-2 rounded-xl font-bold uppercase text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={16} /> Left (A)
                </button>
                <button
                  type="button"
                  disabled={gameState !== 'ready' || currentTurn !== 'player'}
                  onClick={moveRight}
                  className="py-3 px-2 rounded-xl font-bold uppercase text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Right (D) <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Giant Neon Drop Claw Button */}
            <button
              type="button"
              disabled={gameState !== 'ready' || currentTurn !== 'player' || tokensLeft <= 0}
              onClick={startDrop}
              className="w-full mt-4 py-5 rounded-2xl font-black uppercase text-base tracking-widest text-slate-950 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 hover:from-pink-400 hover:to-rose-300 border-2 border-pink-300 shadow-xl shadow-pink-500/30 active:scale-95 transition flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowDown size={20} />
                <span>DROP CLAW</span>
              </div>
              <span className="text-[10px] font-bold text-slate-900 tracking-normal font-sans">
                [SPACEBAR OR CLICK]
              </span>
            </button>
          </div>

          {/* Collected Prizes Inventory Box */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Prizes Claimed:</span>
              <span className="text-pink-400">{collectedPrizes.length}</span>
            </div>
            {collectedPrizes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {collectedPrizes.map((p, idx) => (
                  <span
                    key={idx}
                    className="p-1 px-2 rounded-lg bg-slate-900 border border-slate-700 text-xs flex items-center gap-1"
                    title={`${p.name} (+${p.points} pts)`}
                  >
                    <span>{p.emoji}</span>
                    <span className="font-arcade text-[10px] text-amber-400">+{p.points}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                No prizes delivered yet. Line up dead-center on the plushies!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
