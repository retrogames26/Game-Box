import React, { useState, useEffect, useRef } from 'react';
import { CircleDot, Play, RotateCcw, Bot, Sparkles, Award, Zap, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

interface Pin {
  id: number;
  x: number;
  y: number;
  isStanding: boolean;
  vx: number;
  vy: number;
}

interface FrameScore {
  frameNum: number;
  ball1: number | null;
  ball2: number | null;
  ball3?: number | null; // For 10th frame
  isStrike?: boolean;
  isSpare?: boolean;
  cumulativeScore: number | null;
}

export const Bowling: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Modes & Status
  const [gameMode, setGameMode] = useState<'solo' | 'versus_ai'>('versus_ai');
  const [currentFrame, setCurrentFrame] = useState(1);
  const [currentBall, setCurrentBall] = useState<1 | 2 | 3>(1);
  const [gameOver, setGameOver] = useState(false);
  const [announcement, setAnnouncement] = useState('Position ball, set hook spin, and time your throw power!');

  // Player & AI Scorecards (10 frames)
  const [playerFrames, setPlayerFrames] = useState<FrameScore[]>(() => initFrames());
  const [aiFrames, setAiFrames] = useState<FrameScore[]>(() => initFrames());
  const [playerTotalScore, setPlayerTotalScore] = useState(0);
  const [aiTotalScore, setAiTotalScore] = useState(0);

  // Ball Throw Controls
  const [ballX, setBallX] = useState(250); // horizontal starting position (160 to 340)
  const [spin, setSpin] = useState(0); // -2 (heavy left hook) to +2 (heavy right hook)
  const [power, setPower] = useState(60); // 20 to 100
  const [powerDirection, setPowerDirection] = useState(1);
  const [isPowering, setIsPowering] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  // Live Simulation state
  const rollStateRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    spin: number;
    inGutter: boolean;
  } | null>(null);

  const pinsRef = useRef<Pin[]>([]);
  const animFrameRef = useRef<number | null>(null);

  function initFrames(): FrameScore[] {
    return Array.from({ length: 10 }, (_, i) => ({
      frameNum: i + 1,
      ball1: null,
      ball2: null,
      ball3: i === 9 ? null : undefined,
      cumulativeScore: null,
    }));
  }

  // Set up 10 Pins on Lane
  const resetPins = () => {
    // Triangle formation: (250 is lane center, y=80 is pin deck)
    const pinCoords = [
      { id: 1, x: 250, y: 110 }, // Head pin
      { id: 2, x: 236, y: 92 },  { id: 3, x: 264, y: 92 },
      { id: 4, x: 222, y: 74 },  { id: 5, x: 250, y: 74 },  { id: 6, x: 278, y: 74 },
      { id: 7, x: 208, y: 56 },  { id: 8, x: 236, y: 56 },  { id: 9, x: 264, y: 56 },  { id: 10, x: 292, y: 56 }
    ];
    pinsRef.current = pinCoords.map(p => ({
      ...p,
      isStanding: true,
      vx: 0,
      vy: 0,
    }));
  };

  useEffect(() => {
    resetPins();
  }, []);

  // Oscillating power meter loop
  useEffect(() => {
    if (!isPowering || isRolling || gameOver) return;
    const interval = setInterval(() => {
      setPower(prev => {
        let next = prev + 3 * powerDirection;
        if (next >= 100) {
          next = 100;
          setPowerDirection(-1);
        } else if (next <= 25) {
          next = 25;
          setPowerDirection(1);
        }
        return next;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [isPowering, powerDirection, isRolling, gameOver]);

  // Throw Ball action
  const releaseThrow = () => {
    if (isRolling || gameOver) return;
    setIsPowering(false);
    setIsRolling(true);
    sound.playTireDrift();
    setAnnouncement('Ball rolling down the alley...');

    // Initialize roll physics
    const speed = (power / 100) * 12 + 6;
    rollStateRef.current = {
      x: ballX,
      y: 440,
      vx: (spin * 0.4) + (Math.random() - 0.5) * 0.3,
      vy: -speed,
      spin: spin * 0.08,
      inGutter: false,
    };
  };

  // Main Canvas Render & Pin Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const laneLeft = 170;
    const laneRight = 330;
    const laneWidth = laneRight - laneLeft;

    const render = () => {
      // Background & Approaching Floor
      ctx.fillStyle = '#050512';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wood Grain Bowling Lane
      const laneGrad = ctx.createLinearGradient(laneLeft, 0, laneRight, 0);
      laneGrad.addColorStop(0, '#78350f');
      laneGrad.addColorStop(0.5, '#b45309');
      laneGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = laneGrad;
      ctx.fillRect(laneLeft, 40, laneWidth, 420);

      // Gutters
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(laneLeft - 24, 40, 24, 420); // Left gutter
      ctx.fillRect(laneRight, 40, 24, 420);     // Right gutter

      // Lane Arrows
      ctx.fillStyle = '#451a03';
      for (let i = 0; i < 5; i++) {
        const ax = laneLeft + 25 + i * 27;
        ctx.beginPath();
        ctx.moveTo(ax, 320);
        ctx.lineTo(ax - 5, 335);
        ctx.lineTo(ax + 5, 335);
        ctx.fill();
      }

      // Foul Line
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(laneLeft, 440, laneWidth, 4);

      // Update & Draw Pins
      pinsRef.current.forEach(pin => {
        if (!pin.isStanding) {
          pin.x += pin.vx;
          pin.y += pin.vy;
          pin.vx *= 0.9;
          pin.vy *= 0.9;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, pin.isStanding ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = pin.isStanding ? '#ffffff' : '#64748b';
        ctx.shadowColor = pin.isStanding ? '#f8fafc' : 'transparent';
        ctx.shadowBlur = pin.isStanding ? 6 : 0;
        ctx.fill();

        // Red neck stripe on pin
        if (pin.isStanding) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Update & Draw Rolling Ball
      const ball = rollStateRef.current;
      if (ball && isRolling) {
        ball.y += ball.vy;
        ball.x += ball.vx;

        // Apply hook spin curve
        if (ball.y < 340 && !ball.inGutter) {
          ball.vx += ball.spin;
        }

        // Gutter check
        if (ball.x <= laneLeft || ball.x >= laneRight) {
          if (!ball.inGutter) {
            ball.inGutter = true;
            sound.playPaddleBounce();
            setAnnouncement('GUTTER BALL!');
          }
          ball.vx = 0; // trapped in gutter track
        }

        // Pin collision check if ball in pin deck
        if (ball.y <= 125 && ball.y >= 45 && !ball.inGutter) {
          pinsRef.current.forEach(pin => {
            if (pin.isStanding) {
              const dist = Math.hypot(ball.x - pin.x, ball.y - pin.y);
              if (dist < 14) {
                pin.isStanding = false;
                sound.playBrickBreak(1.5);
                pin.vx = (pin.x - ball.x) * 1.5 + (Math.random() - 0.5) * 4;
                pin.vy = -Math.abs(ball.vy) * 0.6 + (Math.random() - 0.5) * 3;

                // Chain reaction cascade with neighboring pins
                pinsRef.current.forEach(otherPin => {
                  if (otherPin.isStanding) {
                    const cascadeDist = Math.hypot(pin.x - otherPin.x, pin.y - otherPin.y);
                    if (cascadeDist < 26 && Math.random() > 0.15) {
                      otherPin.isStanding = false;
                      otherPin.vx = (otherPin.x - pin.x) * 1.2;
                      otherPin.vy = pin.vy * 0.8;
                    }
                  }
                });
              }
            }
          });
        }

        // Draw Rolling Ball
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = ball.inGutter ? '#64748b' : '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Finger grip holes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ball.x - 3, ball.y - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(ball.x + 3, ball.y - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(ball.x, ball.y + 3, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Ball reached end of deck (pit)
        if (ball.y <= 30) {
          setIsRolling(false);
          rollStateRef.current = null;
          handleBallComplete();
        }
      } else if (!isRolling && !gameOver) {
        // Draw Ball at stance on approach
        ctx.save();
        ctx.beginPath();
        ctx.arc(ballX, 440, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Aim line
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ballX, 440);
        ctx.lineTo(ballX + spin * 35, 100);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRolling, ballX, spin, gameOver]);

  // Handle scoring after ball finishes rolling
  const handleBallComplete = () => {
    // Count newly fallen pins
    const downCount = pinsRef.current.filter(p => !p.isStanding).length;

    const frameIdx = currentFrame - 1;
    const currentF = { ...playerFrames[frameIdx] };

    let pinsThisRoll = 0;
    if (currentBall === 1) {
      pinsThisRoll = downCount;
      currentF.ball1 = pinsThisRoll;
      if (pinsThisRoll === 10) {
        currentF.isStrike = true;
        sound.playWinFanfare();
        confetti({ particleCount: 50, spread: 60 });
        setAnnouncement('STRIKE! PERFECT POCKET HIT!');
      } else {
        setAnnouncement(`${pinsThisRoll} pins down! Roll for spare.`);
      }
    } else if (currentBall === 2) {
      pinsThisRoll = downCount - (currentF.ball1 || 0);
      currentF.ball2 = pinsThisRoll;
      if ((currentF.ball1 || 0) + pinsThisRoll === 10) {
        currentF.isSpare = true;
        sound.playPowerUp();
        setAnnouncement('SPARE! CLEAN PICKUP!');
      } else {
        setAnnouncement(`${(currentF.ball1 || 0) + pinsThisRoll} total pins in Frame ${currentFrame}.`);
      }
    } else if (currentBall === 3) {
      // 10th frame bonus ball
      pinsThisRoll = downCount;
      currentF.ball3 = pinsThisRoll;
    }

    // Update frames
    const updatedPlayerFrames = [...playerFrames];
    updatedPlayerFrames[frameIdx] = currentF;
    const recalculated = recalculateScores(updatedPlayerFrames);
    setPlayerFrames(recalculated.frames);
    setPlayerTotalScore(recalculated.total);

    // AI turn in versus mode
    if (gameMode === 'versus_ai') {
      simulateAiFrame(frameIdx);
    }

    // Advance frame or next ball
    setTimeout(() => {
      advanceRound(currentF, recalculated.total);
    }, 1200);
  };

  // 10-Frame Bowling Score Engine
  const recalculateScores = (frames: FrameScore[]): { frames: FrameScore[]; total: number } => {
    let runningTotal = 0;
    const updated = frames.map(f => ({ ...f }));

    for (let i = 0; i < 10; i++) {
      const f = updated[i];
      if (f.ball1 === null) break;

      if (i < 9) {
        // Standard Frames 1 to 9
        if (f.isStrike) {
          const next1 = updated[i + 1]?.ball1;
          let next2 = updated[i + 1]?.ball2;
          if (updated[i + 1]?.isStrike && i < 8) {
            next2 = updated[i + 2]?.ball1;
          }
          if (next1 !== null && next1 !== undefined && next2 !== null && next2 !== undefined) {
            runningTotal += 10 + next1 + next2;
            f.cumulativeScore = runningTotal;
          } else {
            f.cumulativeScore = null;
          }
        } else if (f.isSpare) {
          const next1 = updated[i + 1]?.ball1;
          if (next1 !== null && next1 !== undefined) {
            runningTotal += 10 + next1;
            f.cumulativeScore = runningTotal;
          } else {
            f.cumulativeScore = null;
          }
        } else if (f.ball2 !== null) {
          runningTotal += (f.ball1 || 0) + (f.ball2 || 0);
          f.cumulativeScore = runningTotal;
        }
      } else {
        // 10th Frame
        if (f.ball1 !== null && f.ball2 !== null) {
          const frame10Sum = (f.ball1 || 0) + (f.ball2 || 0) + (f.ball3 || 0);
          runningTotal += frame10Sum;
          f.cumulativeScore = runningTotal;
        }
      }
    }

    return { frames: updated, total: runningTotal };
  };

  // Advance to next ball / next frame
  const advanceRound = (currentF: FrameScore, totalScore: number) => {
    if (currentFrame < 10) {
      if (currentF.isStrike || currentBall === 2) {
        // Next frame
        setCurrentFrame(cf => cf + 1);
        setCurrentBall(1);
        resetPins();
        setAnnouncement(`Frame ${currentFrame + 1}: Line up your shot.`);
      } else {
        // Second ball of frame
        setCurrentBall(2);
        // Leave standing pins in place
        setAnnouncement('Second ball: Sweep the spare!');
      }
    } else {
      // 10th Frame rules
      if (currentBall === 1) {
        if (currentF.isStrike) {
          resetPins();
          setCurrentBall(2);
        } else {
          setCurrentBall(2);
        }
      } else if (currentBall === 2) {
        if (currentF.isStrike || currentF.isSpare) {
          resetPins();
          setCurrentBall(3);
        } else {
          finishMatch(totalScore);
        }
      } else {
        finishMatch(totalScore);
      }
    }
  };

  // Simulate AI Frame (StrikeBot 3000)
  const simulateAiFrame = (fIdx: number) => {
    const aiUpdated = [...aiFrames];
    const b1Roll = Math.random();
    let b1 = 0;
    let b2 = 0;
    let isStrike = false;
    let isSpare = false;

    if (b1Roll > 0.6) {
      b1 = 10;
      isStrike = true;
    } else {
      b1 = Math.floor(Math.random() * 4 + 6); // 6 to 9 pins
      const remaining = 10 - b1;
      if (Math.random() > 0.4) {
        b2 = remaining;
        isSpare = true;
      } else {
        b2 = Math.floor(Math.random() * remaining);
      }
    }

    aiUpdated[fIdx] = {
      frameNum: fIdx + 1,
      ball1: b1,
      ball2: isStrike && fIdx < 9 ? null : b2,
      isStrike,
      isSpare,
      cumulativeScore: null,
    };

    const res = recalculateScores(aiUpdated);
    setAiFrames(res.frames);
    setAiTotalScore(res.total);
  };

  // Finish match and submit to Firebase
  const finishMatch = (finalPlayerScore: number) => {
    setGameOver(true);
    sound.playGameOver();

    let result: 'win' | 'loss' | 'draw' | 'solo' = 'solo';
    if (gameMode === 'versus_ai') {
      if (finalPlayerScore > aiTotalScore) {
        result = 'win';
        sound.playWinFanfare();
        confetti({ particleCount: 100, spread: 80 });
        setAnnouncement('MATCH VICTORY! You defeated StrikeBot 3000!');
      } else if (finalPlayerScore < aiTotalScore) {
        result = 'loss';
        setAnnouncement('StrikeBot 3000 bowled a higher match total.');
      } else {
        result = 'draw';
        setAnnouncement('MATCH TIED! Exact pinfall parity!');
      }
    } else {
      sound.playWinFanfare();
      setAnnouncement(`10-Frame Match Finished! Final Total: ${finalPlayerScore}`);
    }

    recordFinishedGame({
      gameId: 'bowling',
      score: finalPlayerScore,
      mode: gameMode,
      result,
      aiScore: gameMode === 'versus_ai' ? aiTotalScore : undefined,
      detail: `Final score: ${finalPlayerScore} (10 Frames)`,
    });
  };

  const restartBowling = () => {
    sound.playInsertCoin();
    setCurrentFrame(1);
    setCurrentBall(1);
    setPlayerFrames(initFrames());
    setAiFrames(initFrames());
    setPlayerTotalScore(0);
    setAiTotalScore(0);
    resetPins();
    setGameOver(false);
    setIsRolling(false);
    setAnnouncement('Position ball, set hook spin, and time your throw power!');
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 neon-box-pink">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <CircleDot size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-rose-400 font-heading">
              NEON ALLEY BOWLING
            </h1>
            <p className="text-xs text-slate-400">
              10-Frame Championship • {gameMode === 'versus_ai' ? 'VS StrikeBot 3000' : 'Solo Practice Series'}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('solo');
              restartBowling();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              gameMode === 'solo' ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            Solo Lane
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setGameMode('versus_ai');
              restartBowling();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              gameMode === 'versus_ai' ? 'bg-rose-500 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <Bot size={14} /> VS StrikeBot 3000
          </button>
        </div>

        {/* Live Gauges */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Frame</div>
            <div className="text-base text-cyan-400 font-arcade">
              {currentFrame} / 10
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Your Score</div>
            <div className="text-2xl font-black text-rose-400 font-arcade">
              {playerTotalScore}
            </div>
          </div>
          {gameMode === 'versus_ai' && (
            <div className="text-right pl-3 border-l border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">StrikeBot</div>
              <div className="text-2xl font-black text-cyan-400 font-arcade">
                {aiTotalScore}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Frame by Frame Scoreboard (Traditional 10-Frame Grid) */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 overflow-x-auto">
        <div className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
          <Award size={14} className="text-amber-400" /> Official 10-Frame Scorecard ({player.username})
        </div>
        <div className="grid grid-cols-10 gap-1.5 min-w-[620px]">
          {playerFrames.map((f, i) => (
            <div
              key={f.frameNum}
              className={`p-2 rounded-xl border text-center ${
                currentFrame === f.frameNum && !gameOver
                  ? 'border-rose-400 bg-rose-950/40 ring-1 ring-rose-400'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">F{f.frameNum}</div>
              <div className="flex justify-around my-1 font-arcade text-xs">
                <span className="text-slate-300">
                  {f.isStrike ? 'X' : f.ball1 !== null ? f.ball1 : '-'}
                </span>
                <span className="text-slate-300">
                  {f.isSpare ? '/' : f.ball2 !== null ? f.ball2 : '-'}
                </span>
                {f.ball3 !== undefined && (
                  <span className="text-slate-300">{f.ball3 !== null ? f.ball3 : '-'}</span>
                )}
              </div>
              <div className="text-xs font-black text-amber-400 font-arcade">
                {f.cumulativeScore !== null ? f.cumulativeScore : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas & Ball Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Bowling Lane Canvas */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={500}
            height={460}
            className="rounded-2xl max-w-full border border-slate-800 bg-slate-950"
          />

          {/* Status ticker */}
          <div className="mt-2 text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <Sparkles size={14} /> {announcement}
          </div>

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4">
              <Award className="text-rose-400 animate-bounce" size={48} />
              <h2 className="text-3xl font-black text-rose-400 font-heading">
                MATCH COMPLETE
              </h2>
              <div className="text-sm font-arcade text-amber-400">
                FINAL SCORE: {playerTotalScore} / 300
              </div>
              {gameMode === 'versus_ai' && (
                <div className="text-xs text-slate-300">
                  StrikeBot 3000: <strong className="text-cyan-400">{aiTotalScore}</strong> (
                  {playerTotalScore > aiTotalScore ? 'YOU WON THE TROPHY!' : 'STRIKEBOT PREVAILED'})
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={restartBowling}
                  className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-rose-500 text-slate-950 hover:bg-rose-400 transition flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Bowl Another Series
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Throw Controls Panel */}
        <div className="flex flex-col justify-between p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-2">
              <Zap size={16} /> Aim & Throw Mechanics
            </h3>

            {/* Position Slider */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 flex justify-between">
                <span>Approach Position</span>
                <span className="text-rose-400 font-arcade">{ballX}px</span>
              </label>
              <input
                type="range"
                min={180}
                max={320}
                value={ballX}
                disabled={isRolling || gameOver}
                onChange={(e) => setBallX(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />

              {/* Hook Spin Selector */}
              <label className="text-xs font-semibold text-slate-400 flex justify-between mt-2">
                <span>Hook Spin (Curve)</span>
                <span className="text-cyan-400 font-arcade">
                  {spin < 0 ? `Left ${Math.abs(spin)}` : spin > 0 ? `Right ${spin}` : 'Straight'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={isRolling || gameOver}
                  onClick={() => setSpin(s => Math.max(-2, s - 1))}
                  className="py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  ◀ Left Hook
                </button>
                <button
                  type="button"
                  disabled={isRolling || gameOver}
                  onClick={() => setSpin(0)}
                  className="py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  Zero
                </button>
                <button
                  type="button"
                  disabled={isRolling || gameOver}
                  onClick={() => setSpin(s => Math.min(2, s + 1))}
                  className="py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  Right Hook ▶
                </button>
              </div>

              {/* Power Meter */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-400">Release Power</span>
                  <span className="text-amber-400 font-arcade">{power}%</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 via-rose-500 to-red-600 transition-all duration-75"
                    style={{ width: `${power}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Throw Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={isRolling || gameOver}
                onClick={() => {
                  if (!isPowering) {
                    setIsPowering(true);
                  } else {
                    releaseThrow();
                  }
                }}
                className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-wider transition shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                  isPowering
                    ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/30 animate-pulse'
                    : 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-slate-950 shadow-rose-500/25'
                }`}
              >
                <CircleDot size={18} />
                <span>{isPowering ? 'LOCK POWER & THROW!' : 'CHARGE & ROLL BALL'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400">
            Pocket hit between pin 1 & 3 generates strike cascades! Strikes score 10 + your next 2 rolls.
          </div>
        </div>
      </div>
    </div>
  );
};
