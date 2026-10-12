import React, { useState, useEffect, useRef } from 'react';
import {
  Club,
  RotateCcw,
  Bot,
  Users,
  Coins,
  Shield,
  Copy,
  Check,
  Play,
  ArrowRight,
  LogOut,
  Sparkles,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

// Suit & Card definitions
export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: number; // 2..14 (14 = Ace)
}

export interface PokerPlayer {
  id: string;
  name: string;
  isAi: boolean;
  chips: number;
  currentBet: number;
  holeCards: Card[];
  hasFolded: boolean;
  isReady?: boolean;
  isHost?: boolean;
  lastAction?: string;
}

export type PokerPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];

// Room Document schema in Firestore
interface FirestoreRoom {
  roomCode: string;
  hostPlayerId: string;
  isStarted: boolean;
  phase: PokerPhase;
  pot: number;
  currentHighestBet: number;
  activePlayerIdx: number;
  communityCards: Card[];
  players: {
    id: string;
    name: string;
    chips: number;
    currentBet: number;
    hasFolded: boolean;
    isReady: boolean;
    isHost: boolean;
    lastAction?: string;
    // Private hole cards are stored keyed by playerId inside holeCardsMap
  }[];
  holeCardsMap?: { [playerId: string]: Card[] };
  updatedAt: string;
}

export const Poker: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal, addToast } = useArcade();

  // Mode Selection: null (Selection screen), 'solo', 'versus_ai', 'multiplayer'
  const [selectedMode, setSelectedMode] = useState<'solo' | 'versus_ai' | 'multiplayer' | null>(null);

  // VS AI Opponent Count & Difficulty
  const [aiCount, setAiCount] = useState<number>(3);
  const [aiDifficulty, setAiDifficulty] = useState<'standard' | 'shark'>('standard');

  // Multiplayer Room State
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [isRoomHost, setIsRoomHost] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  // Game Play State
  const [players, setPlayers] = useState<PokerPlayer[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentHighestBet, setCurrentHighestBet] = useState(20);
  const [phase, setPhase] = useState<PokerPhase>('preflop');
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [announcement, setAnnouncement] = useState('Select an option to begin Texas Hold\'em');
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [playerWins, setPlayerWins] = useState(0);

  // Deck generation & shuffle
  const generateDeck = (): Card[] => {
    const d: Card[] = [];
    for (const suit of SUITS) {
      for (let r = 2; r <= 14; r++) {
        d.push({ suit, rank: r });
      }
    }
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  };

  // Card rank formatter
  const formatRank = (r: number): string => {
    if (r === 14) return 'A';
    if (r === 13) return 'K';
    if (r === 12) return 'Q';
    if (r === 11) return 'J';
    if (r === 10) return '10';
    return String(r);
  };

  // 7-card evaluator
  const evaluate7CardHand = (cards: Card[]): { score: number; name: string } => {
    if (cards.length < 5) return { score: 0, name: 'High Card' };
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);

    const counts: { [r: number]: number } = {};
    const suitCounts: { [s: string]: Card[] } = { '♠': [], '♥': [], '♦': [], '♣': [] };

    sorted.forEach((c) => {
      counts[c.rank] = (counts[c.rank] || 0) + 1;
      suitCounts[c.suit].push(c);
    });

    let flushCards: Card[] | null = null;
    for (const s of SUITS) {
      if (suitCounts[s].length >= 5) {
        flushCards = suitCounts[s];
        break;
      }
    }

    const uniqueRanks = Array.from(new Set(sorted.map((c) => c.rank)));
    if (uniqueRanks.includes(14)) uniqueRanks.push(1);

    let straightHigh = 0;
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (
        uniqueRanks[i] - uniqueRanks[i + 1] === 1 &&
        uniqueRanks[i + 1] - uniqueRanks[i + 2] === 1 &&
        uniqueRanks[i + 2] - uniqueRanks[i + 3] === 1 &&
        uniqueRanks[i + 3] - uniqueRanks[i + 4] === 1
      ) {
        straightHigh = uniqueRanks[i];
        break;
      }
    }

    if (flushCards && straightHigh > 0) {
      if (straightHigh === 14) return { score: 9000, name: 'Royal Flush' };
      return { score: 8000 + straightHigh, name: 'Straight Flush' };
    }

    const fourRank = Object.keys(counts).find((r) => counts[Number(r)] === 4);
    if (fourRank) return { score: 7000 + Number(fourRank), name: 'Four of a Kind' };

    const threeRank = Object.keys(counts).find((r) => counts[Number(r)] === 3);
    const twoRank = Object.keys(counts).find((r) => counts[Number(r)] >= 2 && r !== threeRank);
    if (threeRank && twoRank) {
      return { score: 6000 + Number(threeRank) * 10 + Number(twoRank), name: 'Full House' };
    }

    if (flushCards) return { score: 5000 + flushCards[0].rank, name: 'Flush' };
    if (straightHigh > 0) return { score: 4000 + straightHigh, name: 'Straight' };
    if (threeRank) return { score: 3000 + Number(threeRank), name: 'Three of a Kind' };

    const pairs = Object.keys(counts)
      .filter((r) => counts[Number(r)] === 2)
      .map(Number)
      .sort((a, b) => b - a);
    if (pairs.length >= 2) return { score: 2000 + pairs[0] * 10 + pairs[1], name: 'Two Pair' };
    if (pairs.length === 1) return { score: 1000 + pairs[0], name: 'One Pair' };

    return { score: sorted[0].rank, name: `High Card (${formatRank(sorted[0].rank)})` };
  };

  // -------------------------------------------------------------
  // START LOCAL SOLO OR VS AI TABLE
  // -------------------------------------------------------------
  const startLocalGame = (mode: 'solo' | 'versus_ai', aiOpponentCount: number = 3) => {
    sound.playInsertCoin();
    setSelectedMode(mode);

    const aiNames = ['CyberShark', 'ViperBot', 'BluffMaster', 'ChipKing', 'HoldemAI'];
    const tablePlayers: PokerPlayer[] = [
      { id: 'p0', name: player.username, isAi: false, chips: 1000, currentBet: 0, holeCards: [], hasFolded: false },
    ];

    for (let i = 0; i < aiOpponentCount; i++) {
      tablePlayers.push({
        id: `ai_${i + 1}`,
        name: aiNames[i % aiNames.length],
        isAi: true,
        chips: 1000,
        currentBet: 0,
        holeCards: [],
        hasFolded: false,
      });
    }

    dealNewLocalHand(tablePlayers);
  };

  const dealNewLocalHand = (currentTablePlayers: PokerPlayer[]) => {
    sound.playSelect();
    const newDeck = generateDeck();

    const updated = currentTablePlayers.map((p, idx) => {
      let bet = 0;
      if (idx === 1) bet = 10; // SB
      if (idx === 2) bet = 20; // BB
      const hole = [newDeck.pop()!, newDeck.pop()!];
      return {
        ...p,
        name: idx === 0 ? player.username : p.name,
        holeCards: hole,
        currentBet: bet,
        chips: Math.max(0, p.chips - bet),
        hasFolded: false,
        lastAction: idx === 1 ? 'Small Blind (10)' : idx === 2 ? 'Big Blind (20)' : undefined,
      };
    });

    setPlayers(updated);
    setDeck(newDeck);
    setCommunityCards([]);
    setPot(30);
    setCurrentHighestBet(20);
    setPhase('preflop');
    setActivePlayerIdx(0);
    setHandsPlayed((h) => h + 1);
    setAnnouncement(`Hand #${handsPlayed + 1} dealt. Pre-Flop: Check or Raise.`);
  };

  // Player action in Solo/VS AI
  const handleLocalPlayerAction = (action: 'fold' | 'check' | 'call' | 'raise') => {
    sound.playClick();
    const curPlayer = players[0];
    const diff = currentHighestBet - curPlayer.currentBet;
    const updated = [...players];

    if (action === 'fold') {
      updated[0].hasFolded = true;
      updated[0].lastAction = 'Fold';
      setAnnouncement(`${player.username} folds.`);
    } else if (action === 'check') {
      updated[0].lastAction = 'Check';
      setAnnouncement(`${player.username} checks.`);
    } else if (action === 'call') {
      updated[0].chips -= diff;
      updated[0].currentBet += diff;
      updated[0].lastAction = `Call (${diff})`;
      setPot((p) => p + diff);
      setAnnouncement(`${player.username} calls ${diff}.`);
    } else if (action === 'raise') {
      const raiseAmt = diff + 50;
      updated[0].chips -= raiseAmt;
      updated[0].currentBet += raiseAmt;
      updated[0].lastAction = `Raise (+50)`;
      setPot((p) => p + raiseAmt);
      setCurrentHighestBet(updated[0].currentBet);
      setAnnouncement(`${player.username} raises +50!`);
    }

    setPlayers(updated);

    // AI Opponents decision cycle
    setTimeout(() => {
      runLocalAiTurns(updated, 1);
    }, 700);
  };

  // Local AI Turns
  const runLocalAiTurns = (currentPlayers: PokerPlayer[], aiIdx: number) => {
    if (aiIdx >= currentPlayers.length) {
      advanceLocalPhase(currentPlayers);
      return;
    }

    const ai = currentPlayers[aiIdx];
    if (ai.hasFolded) {
      runLocalAiTurns(currentPlayers, aiIdx + 1);
      return;
    }

    const diff = currentHighestBet - ai.currentBet;
    const handEval = evaluate7CardHand([...ai.holeCards, ...communityCards]);

    if (diff === 0) {
      ai.lastAction = 'Check';
    } else if (diff <= 50 || handEval.score >= 1000 || aiDifficulty === 'shark') {
      ai.chips -= diff;
      ai.currentBet += diff;
      setPot((p) => p + diff);
      ai.lastAction = `Call (${diff})`;
    } else {
      ai.hasFolded = true;
      ai.lastAction = 'Fold';
    }

    setPlayers([...currentPlayers]);

    setTimeout(() => {
      runLocalAiTurns(currentPlayers, aiIdx + 1);
    }, 600);
  };

  // Advance phase
  const advanceLocalPhase = (currentPlayers: PokerPlayer[]) => {
    const d = [...deck];
    const resetBets = currentPlayers.map((p) => ({ ...p, currentBet: 0 }));
    setPlayers(resetBets);
    setCurrentHighestBet(0);

    if (phase === 'preflop') {
      const flop = [d.pop()!, d.pop()!, d.pop()!];
      setDeck(d);
      setCommunityCards(flop);
      setPhase('flop');
      setAnnouncement('THE FLOP: 3 Community cards dealt.');
      sound.playSelect();
    } else if (phase === 'flop') {
      const turnCard = d.pop()!;
      setDeck(d);
      setCommunityCards((c) => [...c, turnCard]);
      setPhase('turn');
      setAnnouncement('THE TURN: 4th Community card dealt.');
      sound.playSelect();
    } else if (phase === 'turn') {
      const riverCard = d.pop()!;
      setDeck(d);
      setCommunityCards((c) => [...c, riverCard]);
      setPhase('river');
      setAnnouncement('THE RIVER: Final 5th card dealt. Final bets!');
      sound.playSelect();
    } else if (phase === 'river') {
      setPhase('showdown');
      evaluateLocalShowdown(resetBets);
    }
  };

  // Evaluate Showdown
  const evaluateLocalShowdown = (finalPlayers: PokerPlayer[]) => {
    sound.playWinFanfare();
    let bestScore = -1;
    let winner: PokerPlayer | null = null;
    let winHandName = '';

    finalPlayers.forEach((p) => {
      if (!p.hasFolded) {
        const result = evaluate7CardHand([...p.holeCards, ...communityCards]);
        if (result.score > bestScore) {
          bestScore = result.score;
          winner = p;
          winHandName = result.name;
        }
      }
    });

    if (winner) {
      const w = winner as PokerPlayer;
      w.chips += pot;
      const wonByHuman = w.id === 'p0';

      if (wonByHuman) {
        setPlayerWins((pw) => pw + 1);
        confetti({ particleCount: 90, spread: 70 });
        setAnnouncement(`YOU WIN THE POT (+${pot} Chips) with ${winHandName}!`);
      } else {
        setAnnouncement(`${w.name} won the pot (${pot} Chips) with ${winHandName}.`);
      }

      // Record finished game
      recordFinishedGame({
        gameId: 'poker',
        score: finalPlayers[0].chips,
        mode: selectedMode === 'versus_ai' ? 'versus_ai' : 'solo',
        result: wonByHuman ? 'win' : 'loss',
        aiScore: selectedMode === 'versus_ai' ? (finalPlayers[1]?.chips || 0) : undefined,
        detail: wonByHuman ? `Won pot of ${pot} with ${winHandName}` : `Lost hand to ${w.name} (${winHandName})`,
      });
    }
  };

  // -------------------------------------------------------------
  // REAL ONLINE MULTIPLAYER (FIRESTORE SYNCHRONIZATION)
  // -------------------------------------------------------------
  const createMultiplayerRoom = async () => {
    sound.playInsertCoin();
    setIsJoiningRoom(true);

    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomId = `poker_${generatedCode}`;

    const hostPlayerData = {
      id: player.playerId,
      name: player.username,
      chips: 1000,
      currentBet: 0,
      hasFolded: false,
      isReady: true,
      isHost: true,
    };

    const initialRoom: FirestoreRoom = {
      roomCode: generatedCode,
      hostPlayerId: player.playerId,
      isStarted: false,
      phase: 'preflop',
      pot: 0,
      currentHighestBet: 20,
      activePlayerIdx: 0,
      communityCards: [],
      players: [hostPlayerData],
      holeCardsMap: {},
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'rooms', roomId), initialRoom);
      setCurrentRoomCode(generatedCode);
      setIsRoomHost(true);
      setSelectedMode('multiplayer');
      addToast(`Multiplayer Room ${generatedCode} Created!`, 'success');
    } catch (err) {
      console.error('Error creating room:', err);
      addToast('Could not create room in Firestore.', 'error');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const joinMultiplayerRoom = async () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      addToast('Please enter a room code.', 'warning');
      return;
    }
    sound.playClick();
    setIsJoiningRoom(true);

    const roomId = `poker_${code}`;
    try {
      const roomSnap = await getDoc(doc(db, 'rooms', roomId));
      if (!roomSnap.exists()) {
        addToast(`Room ${code} not found!`, 'error');
        setIsJoiningRoom(false);
        return;
      }

      const roomData = roomSnap.data() as FirestoreRoom;
      if (roomData.players.length >= 6) {
        addToast('Room is full (max 6 players).', 'warning');
        setIsJoiningRoom(false);
        return;
      }

      // Check if already in room
      const existing = roomData.players.find((p) => p.id === player.playerId);
      if (!existing) {
        const newPlayers = [
          ...roomData.players,
          {
            id: player.playerId,
            name: player.username,
            chips: 1000,
            currentBet: 0,
            hasFolded: false,
            isReady: true,
            isHost: false,
          },
        ];
        await updateDoc(doc(db, 'rooms', roomId), {
          players: newPlayers,
          updatedAt: new Date().toISOString(),
        });
      }

      setCurrentRoomCode(code);
      setIsRoomHost(roomData.hostPlayerId === player.playerId);
      setSelectedMode('multiplayer');
      addToast(`Joined Room ${code}!`, 'success');
    } catch (err) {
      console.error('Error joining room:', err);
      addToast('Failed to join room.', 'error');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Real-time listener for current multiplayer room
  useEffect(() => {
    if (!currentRoomCode || selectedMode !== 'multiplayer') return;

    const roomId = `poker_${currentRoomCode}`;
    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as FirestoreRoom;

      setIsRoomHost(data.hostPlayerId === player.playerId);
      setPot(data.pot || 0);
      setCommunityCards(data.communityCards || []);
      setPhase(data.phase || 'preflop');
      setCurrentHighestBet(data.currentHighestBet || 20);
      setActivePlayerIdx(data.activePlayerIdx || 0);

      // Hydrate players with client's private hole cards from holeCardsMap
      const myPrivateHole = data.holeCardsMap?.[player.playerId] || [];
      const hydratedPlayers: PokerPlayer[] = data.players.map((p) => ({
        id: p.id,
        name: p.name,
        isAi: false, // Pure real human multiplayer
        chips: p.chips,
        currentBet: p.currentBet,
        hasFolded: p.hasFolded,
        isReady: p.isReady,
        isHost: p.isHost,
        lastAction: p.lastAction,
        holeCards: p.id === player.playerId ? myPrivateHole : [],
      }));

      setPlayers(hydratedPlayers);
    });

    return () => unsubscribe();
  }, [currentRoomCode, selectedMode, player.playerId]);

  // Host starts multiplayer hand
  const handleHostStartMultiplayerHand = async () => {
    if (!currentRoomCode || !isRoomHost) return;
    sound.playSelect();

    const d = generateDeck();
    const roomId = `poker_${currentRoomCode}`;

    const holeCardsMap: { [playerId: string]: Card[] } = {};
    const updatedPlayers = players.map((p, idx) => {
      const c1 = d.pop()!;
      const c2 = d.pop()!;
      holeCardsMap[p.id] = [c1, c2];

      const bet = idx === 1 ? 10 : idx === 2 ? 20 : 0;
      return {
        id: p.id,
        name: p.name,
        chips: Math.max(0, p.chips - bet),
        currentBet: bet,
        hasFolded: false,
        isReady: true,
        isHost: p.id === player.playerId,
        lastAction: idx === 1 ? 'Small Blind (10)' : idx === 2 ? 'Big Blind (20)' : undefined,
      };
    });

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        isStarted: true,
        phase: 'preflop',
        pot: 30,
        currentHighestBet: 20,
        activePlayerIdx: 0,
        communityCards: [],
        players: updatedPlayers,
        holeCardsMap,
        updatedAt: new Date().toISOString(),
      });
      addToast('Multiplayer Hand Dealt! Best of luck!', 'info');
    } catch (err) {
      console.error('Error starting hand:', err);
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    sound.playClick();
    setCurrentRoomCode(null);
    setSelectedMode(null);
  };

  // Copy Room Code
  const copyRoomCode = () => {
    if (!currentRoomCode) return;
    navigator.clipboard.writeText(currentRoomCode);
    setCopiedCode(true);
    addToast(`Room Code ${currentRoomCode} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // -------------------------------------------------------------
  // MODE SELECTION SCREEN (Required First Step)
  // -------------------------------------------------------------
  if (!selectedMode) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-purple-500/40 neon-box-purple flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Club size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-purple-300 font-heading tracking-wide">
                TEXAS HOLD'EM POKER LOUNGE
              </h1>
              <p className="text-xs text-slate-400">
                Select your preferred table format: Solo Practice, Competitive VS AI, or Live Online Multiplayer!
              </p>
            </div>
          </div>
        </div>

        {/* 3 Core Mode Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. SOLO MODE */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between hover:border-purple-500/60 transition shadow-xl space-y-5">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                🃏
              </div>
              <h3 className="text-xl font-black text-purple-300 font-heading">SOLO TABLE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Casual Texas Hold'em against simulated house card players. Perfect for honing your betting strategy, pot equity calculation, and hand reads without stress.
              </p>
              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-800">
                <div>• Single Human Player</div>
                <div>• 3 Configured House Bots</div>
                <div>• Zero Waiting Time</div>
              </div>
            </div>

            <button
              onClick={() => startLocalGame('solo', 3)}
              className="w-full py-3.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider bg-purple-600 hover:bg-purple-500 text-slate-950 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
            >
              <Play size={16} /> PLAY SOLO
            </button>
          </div>

          {/* 2. VS AI COMPETITIVE MODE */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between hover:border-pink-500/60 transition shadow-xl space-y-5">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                <Bot size={24} />
              </div>
              <h3 className="text-xl font-black text-pink-300 font-heading">VS AI CHALLENGE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                High-stakes competitive tournament match against CyberShark and adaptive Neural Cardmasters. Configure opponent count and AI aggressiveness.
              </p>

              {/* Configure AI Table */}
              <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    AI Opponents: <span className="text-pink-400 font-arcade">{aiCount} Bot Rivals</span>
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setAiCount(cnt)}
                        className={`flex-1 py-1.5 rounded-lg font-arcade text-xs transition cursor-pointer ${
                          aiCount === cnt ? 'bg-pink-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Difficulty Profile:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAiDifficulty('standard')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        aiDifficulty === 'standard' ? 'bg-pink-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Balanced
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDifficulty('shark')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        aiDifficulty === 'shark' ? 'bg-pink-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Card Shark
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => startLocalGame('versus_ai', aiCount)}
              className="w-full py-3.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider bg-pink-600 hover:bg-pink-500 text-slate-950 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-600/20"
            >
              <Play size={16} /> PLAY VS AI
            </button>
          </div>

          {/* 3. REAL ONLINE MULTIPLAYER */}
          <div className="rounded-3xl bg-slate-900/90 border border-cyan-500/40 p-6 flex flex-col justify-between hover:border-cyan-400 transition shadow-xl space-y-5">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-black text-cyan-300 font-heading">ONLINE MULTIPLAYER</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect live with real players across devices using synchronized Firestore rooms. Share your unique Room Code or join an existing table!
              </p>

              <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                {/* Create Room Button */}
                <button
                  type="button"
                  disabled={isJoiningRoom}
                  onClick={createMultiplayerRoom}
                  className="w-full py-2.5 px-3 rounded-xl font-bold uppercase text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins size={14} /> CREATE NEW ROOM
                </button>

                {/* Join Existing Room Input */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="ROOM CODE"
                      className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 font-arcade text-xs text-center text-cyan-300 placeholder-slate-600 uppercase focus:border-cyan-400 outline-none"
                    />
                    <button
                      type="button"
                      disabled={isJoiningRoom}
                      onClick={joinMultiplayerRoom}
                      className="py-2 px-4 rounded-xl font-bold uppercase text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
                    >
                      JOIN
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic text-center">
              Supports 2 to 6 live human players synchronized in real time.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MULTIPLAYER LOBBY (WAITING FOR PLAYERS)
  // -------------------------------------------------------------
  if (selectedMode === 'multiplayer' && (!players || players.length < 2 || !players.some(p => p.holeCards && p.holeCards.length > 0))) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/40 neon-box-cyan flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-heading text-xl font-black">
              <Users size={22} /> MULTIPLAYER ROOM #{currentRoomCode}
            </div>
            <p className="text-xs text-slate-400">
              Share the room code below with other players to join the table on their phones or browsers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleLeaveRoom}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-rose-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} /> Leave
            </button>
          </div>
        </div>

        {/* Connected Players List */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={16} className="text-cyan-400" /> Connected Players ({players.length}/6)
            </h3>
            <span className="text-xs text-slate-500">Live Firestore Sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">{p.name}</span>
                    {p.id === player.playerId && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500 text-slate-950 font-black">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-amber-400 font-arcade">{p.chips} Chips</span>
                </div>
                {p.isHost && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Host Start Game Controls */}
          {isRoomHost ? (
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                {players.length < 2
                  ? 'Waiting for at least 2 real human players to join...'
                  : 'All ready! Click Deal to shuffle and deal the hand to all players.'}
              </p>
              <button
                type="button"
                disabled={players.length < 2}
                onClick={handleHostStartMultiplayerHand}
                className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25"
              >
                <Play size={16} /> DEAL MULTIPLAYER HAND
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400 italic">
              Waiting for the Room Host to start the hand...
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE POKER TABLE (SOLO, VS AI, OR MULTIPLAYER)
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Table Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 neon-box-purple shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Club size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-purple-400 font-heading">
              TEXAS HOLD'EM TABLE
            </h1>
            <p className="text-xs text-slate-400">
              {selectedMode === 'multiplayer'
                ? `Online Multiplayer Room #${currentRoomCode}`
                : selectedMode === 'versus_ai'
                ? `VS AI Tournament (${aiCount} Rivals)`
                : 'Solo Practice Lounge'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedMode(null)}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
          >
            ← Table Modes
          </button>
        </div>
      </div>

      {/* Main Oval Poker Table */}
      <div className="relative rounded-[48px] bg-gradient-to-b from-emerald-950 via-slate-950 to-emerald-950 border-8 border-amber-950/80 p-6 sm:p-8 shadow-2xl">
        {/* Felt Rail Inner Ring */}
        <div className="absolute inset-4 rounded-[40px] border-2 border-emerald-500/30 pointer-events-none" />

        {/* Top/Other Players */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {players.slice(1).map((p, idx) => (
            <div
              key={p.id || idx}
              className={`p-3.5 rounded-2xl border transition ${
                p.hasFolded
                  ? 'bg-slate-900/40 border-slate-800 opacity-50'
                  : 'bg-slate-900/90 border-slate-700 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-200 truncate">{p.name}</span>
                <span className="text-[10px] font-bold text-cyan-400">
                  {p.isAi ? 'AI BOT' : 'HUMAN'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-arcade">{p.chips}p</span>
                {p.lastAction && (
                  <span className="text-[10px] text-amber-400 font-bold uppercase">
                    {p.lastAction}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Center Community Board & Pot */}
        <div className="my-8 flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-arcade text-amber-400">
            <Coins size={14} /> POT: {pot} CHIPS ({phase.toUpperCase()})
          </div>

          <div className="flex gap-2.5">
            {communityCards.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Waiting for Flop...</span>
            ) : (
              communityCards.map((c, i) => (
                <div
                  key={i}
                  className={`w-12 h-16 rounded-xl border-2 shadow-lg flex flex-col items-center justify-between p-1.5 font-bold ${
                    c.suit === '♥' || c.suit === '♦'
                      ? 'bg-slate-100 text-rose-600 border-rose-300'
                      : 'bg-slate-100 text-slate-950 border-slate-400'
                  }`}
                >
                  <span className="text-xs self-start">{formatRank(c.rank)}</span>
                  <span className="text-xl">{c.suit}</span>
                  <span className="text-xs self-end">{formatRank(c.rank)}</span>
                </div>
              ))
            )}
          </div>

          <div className="text-xs text-purple-300 font-bold tracking-wide">
            {announcement}
          </div>
        </div>

        {/* Bottom Player Hand & Action Buttons */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Player Hole Cards */}
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="text-xs font-bold text-slate-200">{player.username}'s Hand</div>
              <div className="text-xs font-arcade text-cyan-400">
                {players[0]?.holeCards && players[0].holeCards.length > 0
                  ? evaluate7CardHand([...players[0].holeCards, ...communityCards]).name
                  : 'Holding cards'}
              </div>
            </div>

            <div className="flex gap-2">
              {players[0]?.holeCards?.map((c, i) => (
                <div
                  key={i}
                  className={`w-12 h-16 rounded-xl border-2 shadow-lg flex flex-col items-center justify-between p-1.5 font-bold ${
                    c.suit === '♥' || c.suit === '♦'
                      ? 'bg-slate-100 text-rose-600 border-rose-300'
                      : 'bg-slate-100 text-slate-950 border-slate-400'
                  }`}
                >
                  <span className="text-xs self-start">{formatRank(c.rank)}</span>
                  <span className="text-xl">{c.suit}</span>
                  <span className="text-xs self-end">{formatRank(c.rank)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {phase !== 'showdown' && players[0] && !players[0].hasFolded ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleLocalPlayerAction('fold')}
                className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 cursor-pointer"
              >
                Fold
              </button>

              {currentHighestBet <= (players[0]?.currentBet || 0) ? (
                <button
                  type="button"
                  onClick={() => handleLocalPlayerAction('check')}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 cursor-pointer"
                >
                  Check
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLocalPlayerAction('call')}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 cursor-pointer"
                >
                  Call ({currentHighestBet - (players[0]?.currentBet || 0)})
                </button>
              )}

              <button
                type="button"
                onClick={() => handleLocalPlayerAction('raise')}
                className="py-2.5 px-5 rounded-xl text-xs font-bold uppercase bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-slate-950 font-black shadow-md shadow-purple-500/25 active:scale-95 cursor-pointer"
              >
                Raise (+50)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (selectedMode === 'multiplayer' && isRoomHost) {
                  handleHostStartMultiplayerHand();
                } else {
                  dealNewLocalHand(players);
                }
              }}
              className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-gradient-to-r from-purple-400 to-pink-400 text-slate-950 hover:from-purple-300 hover:to-pink-300 shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={14} /> Deal Next Hand
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
