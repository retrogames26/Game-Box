import React, { useState, useEffect, useRef } from 'react';
import { Package, RefreshCw, Trophy, Bot, User as UserIcon, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface Prize {
  id: string;
  name: string;
  emoji: string;
  points: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rarity: 'Common' | 'Rare' | 'Legendary';
  isGrabbed?: boolean;
}

const INITIAL_PRIZES: Prize[] = [
  { id: 'p1', name: 'Quantum Diamond', emoji: '💎', points: 500, x: 190, y: 310, width: 44, height: 44, color: '#06b6d4', rarity: 'Legendary' },
  { id: 'p2', name: 'Cyber Kitty', emoji: '🐱', points: 250, x: 270, y: 315, width: 42, height: 42, color: '#ec4899', rarity: 'Rare' },
  { id: 'p3', name: 'Pixel Duck', emoji: '🦆', points: 150, x: 350, y: 320, width: 40, height: 40, color: '#eab308', rarity: 'Common' },
  { id: 'p4', name: 'Gold Trophy', emoji: '🏆', points: 400, x: 120, y: 310, width: 44, height: 44, color: '#f59e0b', rarity: 'Legendary' },
  { id: 'p5', name: 'Retro Gameboy', emoji: '🎮', points: 200, x: 420, y: 315, width: 40, height: 40, color: '#a855f7', rarity: 'Rare' },
  { id: 'p6', name: 'Arcade Token', emoji: '🪙', points: 75, x: 490, y: 325, width: 36, height: 36, color: '#10b981', rarity: 'Common' },
  { id: 'p7', name: 'Alien Plush', emoji: '👾', points: 300, x: 230, y: 325, width: 42, height: 42, color: '#14b8a6', rarity: 'Rare' },
  { id: 'p8', name: 'Neon Heart', emoji: '💖', points: 180, x: 310, y: 330, width: 38, height: 38, color: '#f43f5e', rarity: 'Common' },
];

export const ClawMachine: React.FC = () => {
  const { profile, recordFinishedGame, openAuthModal, isGuest } = useArcade();

  // Game Settings
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('solo');
  const [tokensLeft, setTokensLeft] = useState(5);
  const [playerScore, setPlayerScore] = useState(0);
  const [collectedPrizes, setCollectedPrizes] = useState<Prize[]>([]);
  const [gameState, setGameState] = useState<'ready' | 'dropping' | 'grabbing' | 'lifting' | 'returning' | 'delivering' | 'game_over'>('ready');
  const [announcement, setAnnouncement] = useState('Position the claw and press DROP!');

  // Claw Position & Animation
  const [clawX, setClawX] = useState(250); // horizontal position 60 to 520
  const [clawY, setClawY] = useState(50);  // vertical drop 50 to 290
  const [clawOpen, setClawOpen] = useState(true);
  const [grabbedPrize, setGrabbedPrize] = useState<Prize | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>(INITIAL_PRIZES);

  // Versus AI State
  const [aiScore, setAiScore] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'ai'>('player');
  const [aiActionText, setAiActionText] = useState('RoboClaw 3000 is analyzing physics...');

  const canvasRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for claw
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'ready' || currentTurn !== 'player') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        sound.playClawMove();
        setClawX((prev) => Math.max(70, prev - 15));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        sound.playClawMove();
        setClawX((prev) => Math.min(520, prev + 15));
      } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        dropClaw();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentTurn, clawX]);

  // Handle claw drop sequence
  const dropClaw = () => {
    if (gameState !== 'ready') return;
    sound.playClawDrop();
    setGameState('dropping');
    setAnnouncement('Claw descending...');

    // Descend claw animation loop
    let currentY = 50;
    const targetY = 300;
    const dropInterval = setInterval(() => {
      currentY += 6;
      setClawY(currentY);

      if (currentY >= targetY) {
        clearInterval(dropInterval);
        // Arrived at bottom: pinch and grab check
        setGameState('grabbing');
        sound.playClawGrab();
        setClawOpen(false);

        // Check if claw caught a prize
        setTimeout(() => {
          checkForGrab(clawX, currentY);
        }, 600);
      }
    }, 25);
  };

  // Physics collision check
  const checkForGrab = (currentClawX: number, currentClawY: number) => {
    // Check nearest prize
    let caught: Prize | null = null;
    const clawTipX = currentClawX;
    const clawTipY = currentClawY + 20;

    for (const p of prizes) {
      const prizeCenterX = p.x + p.width / 2;
      const prizeCenterY = p.y + p.height / 2;
      const distance = Math.hypot(clawTipX - prizeCenterX, clawTipY - prizeCenterY);

      // Hitbox tolerance
      if (distance < 38) {
        // Skill factor: slight slippage chance on rare items
        const slipProbability = p.rarity === 'Legendary' ? 0.25 : p.rarity === 'Rare' ? 0.15 : 0.05;
        if (Math.random() > slipProbability) {
          caught = p;
          break;
        }
      }
    }

    if (caught) {
      setGrabbedPrize(caught);
      setAnnouncement(`Grabbed the ${caught.name}! Lifting up...`);
    } else {
      setAnnouncement('Claw missed! Lifting back up empty...');
    }

    // Begin lifting back up
    setGameState('lifting');
    let liftY = currentClawY;
    const liftInterval = setInterval(() => {
      liftY -= 5;
      setClawY(liftY);

      if (liftY <= 50) {
        clearInterval(liftInterval);
        returnToChute(caught);
      }
    }, 25);
  };

  // Return claw to chute at x = 70
  const returnToChute = (caughtPrize: Prize | null) => {
    setGameState('returning');
    setAnnouncement('Moving to delivery chute...');

    let currentX = clawX;
    const returnInterval = setInterval(() => {
      currentX -= 6;
      setClawX(currentX);

      if (currentX <= 75) {
        clearInterval(returnInterval);
        deliverPrize(caughtPrize);
      }
    }, 25);
  };

  // Deliver prize into chute
  const deliverPrize = (caughtPrize: Prize | null) => {
    setGameState('delivering');
    setClawOpen(true); // Open claw to release prize

    if (caughtPrize) {
      sound.playPrizeCollected();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      setAnnouncement(`SUCCESS! Collected ${caughtPrize.name} (+${caughtPrize.points} pts)!`);

      if (currentTurn === 'player') {
        setPlayerScore((prev) => prev + caughtPrize.points);
        setCollectedPrizes((prev) => [...prev, caughtPrize]);
      } else {
        setAiScore((prev) => prev + caughtPrize.points);
      }

      // Remove prize from machine
      setPrizes((prev) => prev.filter((p) => p.id !== caughtPrize.id));
    } else {
      setAnnouncement('Nothing dropped in the chute.');
    }

    setGrabbedPrize(null);

    // End of turn evaluation
    setTimeout(() => {
      const nextTokens = tokensLeft - 1;
      setTokensLeft(nextTokens);

      if (nextTokens <= 0) {
        finishGame();
      } else {
        if (gameMode === 'versus_ai') {
          // Switch turns
          if (currentTurn === 'player') {
            setCurrentTurn('ai');
            setGameState('ready');
            setClawX(250);
            setClawY(50);
            runAiTurn();
          } else {
            setCurrentTurn('player');
            setGameState('ready');
            setClawX(250);
            setClawY(50);
            setAnnouncement('Your turn! Move the claw and drop!');
          }
        } else {
          setGameState('ready');
          setClawX(250);
          setClawY(50);
          setAnnouncement('Ready for next attempt!');
        }
      }
    }, 1200);
  };

  // AI Turn Logic for Versus Mode
  const runAiTurn = () => {
    setAnnouncement('RoboClaw 3000 is calculating claw trajectory...');
    setAiActionText('Scanning prize weights & coordinates...');

    setTimeout(() => {
      // Pick random active prize or highest value prize
      const remaining = prizes.length > 0 ? prizes : INITIAL_PRIZES;
      const target = remaining[Math.floor(Math.random() * remaining.length)];
      const targetX = target ? target.x + target.width / 2 + (Math.random() * 20 - 10) : 250;

      // Animate AI claw movement towards target
      let simulatedX = 75;
      const moveInterval = setInterval(() => {
        if (simulatedX < targetX) {
          simulatedX += 6;
          setClawX(simulatedX);
        } else {
          clearInterval(moveInterval);
          // AI drops claw
          dropClaw();
        }
      }, 30);
    }, 1500);
  };

  // Finish Game & Record Score
  const finishGame = () => {
    setGameState('game_over');
    sound.playGameOver();

    let result: 'win' | 'loss' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      if (playerScore > aiScore) {
        result = 'win';
        sound.playWinFanfare();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        setAnnouncement('VICTORY! You defeated RoboClaw 3000!');
      } else if (playerScore < aiScore) {
        result = 'loss';
        setAnnouncement('DEFEAT! RoboClaw 3000 claimed the higher prize score.');
      } else {
        result = 'win';
        setAnnouncement('DRAW! Equal ticket yields!');
      }
    } else {
      if (playerScore > 300) {
        sound.playWinFanfare();
        confetti({ particleCount: 80, spread: 70 });
      }
      setAnnouncement(`Round Complete! Total Score: ${playerScore}`);
    }

    recordFinishedGame({
      gameId: 'claw',
      gameName: 'Cyber Claw Machine',
      score: playerScore,
      mode: gameMode,
      result,
      aiOpponentName: gameMode === 'versus_ai' ? 'RoboClaw 3000' : undefined,
      aiScore: gameMode === 'versus_ai' ? aiScore : undefined,
      detail: `${collectedPrizes.length} prizes snatched (${playerScore} pts)`,
    });
  };

  const restartGame = () => {
    sound.playInsertCoin();
    setTokensLeft(5);
    setPlayerScore(0);
    setAiScore(0);
    setCollectedPrizes([]);
    setPrizes(INITIAL_PRIZES);
    setCurrentTurn('player');
    setGameState('ready');
    setClawX(250);
    setClawY(50);
    setGrabbedPrize(null);
    setAnnouncement('Position the claw and press DROP!');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Game Bar */}
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
              Robotic Crane Grabber • {gameMode === 'versus_ai' ? 'Versus AI Battle' : 'Solo Score Attack'}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('solo');
              restartGame();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              gameMode === 'solo'
                ? 'bg-pink-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              gameMode === 'versus_ai'
                ? 'bg-pink-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot size={14} /> VS RoboClaw 3000
          </button>
        </div>

        {/* Score & Tokens Counter */}
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
              <div className="text-[10px] uppercase font-bold text-slate-400">AI Score</div>
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
        <div className="lg:col-span-3 relative bg-slate-950 rounded-3xl border-4 border-slate-800 p-4 shadow-2xl overflow-hidden min-h-[460px] flex flex-col justify-between">
          {/* Glass Reflection Highlight */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none transform -skew-x-12" />

          {/* Top Rail Mechanism */}
          <div className="relative w-full h-8 bg-slate-900 border-b-2 border-pink-500/40 rounded-t-xl flex items-center px-4">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 transition-all duration-75"
                style={{ width: `${(clawX / 520) * 100}%` }}
              />
            </div>
          </div>

          {/* Crane & Chute Area */}
          <div ref={canvasRef} className="relative flex-1 w-full h-[360px] overflow-hidden">
            {/* Chute Chute Area on Left */}
            <div className="absolute left-2 bottom-4 w-28 h-36 border-2 border-dashed border-cyan-400/60 bg-cyan-950/20 rounded-2xl flex flex-col items-center justify-end p-2 text-center">
              <div className="text-[11px] font-bold text-cyan-300 font-arcade tracking-tight uppercase">
                PRIZE CHUTE
              </div>
              <div className="text-xl animate-bounce">⬇️</div>
            </div>

            {/* Dropped Prizes Pile at Bottom */}
            <div className="absolute bottom-4 left-32 right-4 h-28 border-t border-slate-800/80 bg-slate-900/40 rounded-xl p-2 flex items-center justify-around flex-wrap">
              {prizes.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center p-1.5 transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    filter: `drop-shadow(0 0 8px ${p.color})`,
                  }}
                  title={`${p.name} (+${p.points} pts)`}
                >
                  <span className="text-3xl select-none">{p.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-300 font-arcade mt-1">
                    {p.points}p
                  </span>
                </div>
              ))}
            </div>

            {/* Moving Claw Assembly */}
            <div
              className="absolute pointer-events-none transition-all duration-75"
              style={{
                left: `${clawX}px`,
                top: '0px',
                transform: 'translateX(-50%)',
              }}
            >
              {/* Vertical Cable */}
              <div
                className="w-1 bg-gradient-to-b from-slate-400 to-pink-400 mx-auto"
                style={{ height: `${clawY}px` }}
              />

              {/* Claw Motor Box */}
              <div className="w-12 h-6 bg-slate-800 border-2 border-pink-400 rounded-lg mx-auto flex items-center justify-center shadow-lg shadow-pink-500/30">
                <div className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              </div>

              {/* Grabber Prongs */}
              <div className="relative w-16 h-8 -mt-1 flex justify-between px-1">
                {/* Left Prong */}
                <div
                  className={`w-3 h-8 bg-slate-300 rounded-b-full border border-slate-700 transition-transform duration-300 origin-top ${
                    clawOpen ? '-rotate-30' : 'rotate-12'
                  }`}
                />
                {/* Center Pin */}
                <div className="w-2 h-4 bg-pink-500 rounded-b-md" />
                {/* Right Prong */}
                <div
                  className={`w-3 h-8 bg-slate-300 rounded-b-full border border-slate-700 transition-transform duration-300 origin-top ${
                    clawOpen ? 'rotate-30' : '-rotate-12'
                  }`}
                />
              </div>

              {/* Grabbed Prize Attachment */}
              {grabbedPrize && (
                <div className="absolute top-[85%] left-1/2 -translate-x-1/2 text-3xl animate-pulse">
                  {grabbedPrize.emoji}
                </div>
              )}
            </div>
          </div>

          {/* Status Marquee Banner */}
          <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-semibold">
            <span className="text-pink-400 flex items-center gap-1.5">
              <Sparkles size={14} /> {announcement}
            </span>
            {gameMode === 'versus_ai' && (
              <span className="text-slate-400">
                Turn:{' '}
                <strong className={currentTurn === 'player' ? 'text-pink-400' : 'text-cyan-400'}>
                  {currentTurn === 'player' ? profile.username : 'RoboClaw 3000'}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Control Panel Cabinet Buttons */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
              <Trophy size={16} /> Physical Machine Controls
            </h3>

            {/* Left / Right Slider & Buttons */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                <span>Horizontal Position</span>
                <span className="text-pink-400 font-arcade">{clawX}px</span>
              </label>

              <input
                type="range"
                min={75}
                max={510}
                value={clawX}
                disabled={gameState !== 'ready' || currentTurn !== 'player'}
                onChange={(e) => {
                  sound.playClawMove();
                  setClawX(Number(e.target.value));
                }}
                className="w-full accent-pink-500 cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={gameState !== 'ready' || currentTurn !== 'player'}
                  onClick={() => {
                    sound.playClawMove();
                    setClawX((prev) => Math.max(75, prev - 25));
                  }}
                  className="py-3 px-2 rounded-xl font-bold uppercase text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 disabled:opacity-40"
                >
                  ◀ Left (A)
                </button>
                <button
                  type="button"
                  disabled={gameState !== 'ready' || currentTurn !== 'player'}
                  onClick={() => {
                    sound.playClawMove();
                    setClawX((prev) => Math.min(510, prev + 25));
                  }}
                  className="py-3 px-2 rounded-xl font-bold uppercase text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 disabled:opacity-40"
                >
                  Right (D) ▶
                </button>
              </div>
            </div>

            {/* Giant Neon Drop Claw Button */}
            <button
              type="button"
              disabled={gameState !== 'ready' || currentTurn !== 'player' || tokensLeft <= 0}
              onClick={dropClaw}
              className="w-full mt-4 py-5 rounded-2xl font-black uppercase text-base tracking-widest text-slate-950 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 hover:from-pink-400 hover:to-rose-300 border-2 border-pink-300 shadow-xl shadow-pink-500/30 active:scale-95 transition flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>DROP CLAW</span>
              <span className="text-[10px] font-bold text-slate-900 tracking-normal font-sans">
                [SPACEBAR OR CLICK]
              </span>
            </button>
          </div>

          {/* Collected Prizes Inventory */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Snatched Prizes</span>
              <span className="text-pink-400 font-arcade">{collectedPrizes.length}</span>
            </h4>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 min-h-[90px] flex flex-wrap gap-1.5 items-center">
              {collectedPrizes.length === 0 ? (
                <span className="text-xs text-slate-600 italic">No prizes snatched yet this round.</span>
              ) : (
                collectedPrizes.map((p, idx) => (
                  <span
                    key={idx}
                    className="text-2xl p-1 bg-slate-900 rounded-lg border border-slate-700"
                    title={`${p.name} (+${p.points})`}
                  >
                    {p.emoji}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Game Over / Restart */}
          {gameState === 'game_over' && (
            <div className="p-4 rounded-xl bg-pink-950/40 border border-pink-500/40 space-y-2 animate-fade-in text-center">
              <Award className="mx-auto text-pink-400" size={32} />
              <div className="text-sm font-bold text-pink-300 font-arcade">GAME FINISHED</div>
              <div className="text-xs text-slate-300">
                Final Score: <strong className="text-pink-400">{playerScore} pts</strong>
              </div>
              <button
                onClick={restartGame}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase bg-pink-500 hover:bg-pink-400 text-slate-950 transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Insert Token & Replay
              </button>
              {isGuest && (
                <button
                  onClick={() => openAuthModal('register')}
                  className="w-full py-2 rounded-xl text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/60 transition"
                >
                  Save Score to Leaderboard
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
