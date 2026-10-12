import React, { useState, useEffect } from 'react';
import { Club, Play, RotateCcw, Bot, Sparkles, Award, Coins, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useArcade } from '../context/ArcadeContext';
import { sound } from '../utils/audio';

// Suit: '♠' | '♥' | '♦' | '♣', Rank: 2..14 (14 = Ace)
interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: number; // 2..14
}

interface PokerPlayer {
  id: string;
  name: string;
  isAi: boolean;
  chips: number;
  currentBet: number;
  holeCards: Card[];
  hasFolded: boolean;
  lastAction?: string;
}

type PokerPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];

export const Poker: React.FC = () => {
  const { player, recordFinishedGame, openUsernameModal } = useArcade();

  const [players, setPlayers] = useState<PokerPlayer[]>([
    { id: 'p0', name: player.username, isAi: false, chips: 1000, currentBet: 0, holeCards: [], hasFolded: false },
    { id: 'p1', name: 'CyberShark', isAi: true, chips: 1000, currentBet: 0, holeCards: [], hasFolded: false },
    { id: 'p2', name: 'ViperBot', isAi: true, chips: 1000, currentBet: 0, holeCards: [], hasFolded: false },
    { id: 'p3', name: 'BluffMaster', isAi: true, chips: 1000, currentBet: 0, holeCards: [], hasFolded: false },
  ]);

  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentHighestBet, setCurrentHighestBet] = useState(20);
  const [phase, setPhase] = useState<PokerPhase>('preflop');
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [announcement, setAnnouncement] = useState('Welcome to High-Stakes Texas Hold\'em (Virtual Chips)');
  const [handHistory, setHandHistory] = useState<string[]>([]);
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
    // Fisher-Yates shuffle
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  };

  // Start new Hand
  const startNewHand = () => {
    sound.playSelect();
    const newDeck = generateDeck();

    const p0Cards = [newDeck.pop()!, newDeck.pop()!];
    const p1Cards = [newDeck.pop()!, newDeck.pop()!];
    const p2Cards = [newDeck.pop()!, newDeck.pop()!];
    const p3Cards = [newDeck.pop()!, newDeck.pop()!];

    // Blinds: Small blind 10, Big blind 20
    const updated = players.map((p, idx) => {
      let bet = 0;
      if (idx === 1) bet = 10;
      if (idx === 2) bet = 20;
      return {
        ...p,
        name: idx === 0 ? player.username : p.name,
        holeCards: idx === 0 ? p0Cards : idx === 1 ? p1Cards : idx === 2 ? p2Cards : p3Cards,
        currentBet: bet,
        chips: p.chips - bet,
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
    setActivePlayerIdx(0); // Human player to act first preflop
    setHandsPlayed(h => h + 1);
    setAnnouncement(`Hand #${handsPlayed + 1} dealt. Pre-Flop: Call 20 or Raise.`);
  };

  useEffect(() => {
    startNewHand();
  }, []);

  // Card rank formatter
  const formatRank = (r: number): string => {
    if (r === 14) return 'A';
    if (r === 13) return 'K';
    if (r === 12) return 'Q';
    if (r === 11) return 'J';
    if (r === 10) return '10';
    return String(r);
  };

  // Hand Evaluation Engine (7 cards -> Hand Rank Score & Name)
  const evaluate7CardHand = (cards: Card[]): { score: number; name: string } => {
    if (cards.length < 5) return { score: 0, name: 'High Card' };

    // Sort descending by rank
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);

    // Group by rank
    const counts: { [r: number]: number } = {};
    const suitCounts: { [s: string]: Card[] } = { '♠': [], '♥': [], '♦': [], '♣': [] };

    sorted.forEach(c => {
      counts[c.rank] = (counts[c.rank] || 0) + 1;
      suitCounts[c.suit].push(c);
    });

    // Check Flush
    let flushCards: Card[] | null = null;
    for (const s of SUITS) {
      if (suitCounts[s].length >= 5) {
        flushCards = suitCounts[s];
        break;
      }
    }

    // Check Straight
    const uniqueRanks = Array.from(new Set(sorted.map(c => c.rank)));
    if (uniqueRanks.includes(14)) uniqueRanks.push(1); // Ace low for A-2-3-4-5

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

    // Straight Flush / Royal Flush
    if (flushCards && straightHigh > 0) {
      if (straightHigh === 14) return { score: 9000, name: 'Royal Flush' };
      return { score: 8000 + straightHigh, name: 'Straight Flush' };
    }

    // Four of a kind
    for (const r in counts) {
      if (counts[r] === 4) return { score: 7000 + Number(r), name: 'Four of a Kind' };
    }

    // Full House (3 + 2)
    const threeRank = Object.keys(counts).find(r => counts[Number(r)] === 3);
    const twoRank = Object.keys(counts).find(r => counts[Number(r)] >= 2 && r !== threeRank);
    if (threeRank && twoRank) {
      return { score: 6000 + Number(threeRank) * 10 + Number(twoRank), name: 'Full House' };
    }

    // Flush
    if (flushCards) return { score: 5000 + flushCards[0].rank, name: 'Flush' };

    // Straight
    if (straightHigh > 0) return { score: 4000 + straightHigh, name: 'Straight' };

    // Three of a kind
    if (threeRank) return { score: 3000 + Number(threeRank), name: 'Three of a Kind' };

    // Two Pair
    const pairs = Object.keys(counts).filter(r => counts[Number(r)] === 2).map(Number).sort((a, b) => b - a);
    if (pairs.length >= 2) {
      return { score: 2000 + pairs[0] * 10 + pairs[1], name: 'Two Pair' };
    }

    // One Pair
    if (pairs.length === 1) {
      return { score: 1000 + pairs[0], name: 'One Pair' };
    }

    // High Card
    return { score: sorted[0].rank, name: `High Card (${formatRank(sorted[0].rank)})` };
  };

  // Player Actions: Fold, Check, Call, Raise
  const handlePlayerAction = (action: 'fold' | 'check' | 'call' | 'raise') => {
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
      setPot(p => p + diff);
      setAnnouncement(`${player.username} calls ${diff}.`);
    } else if (action === 'raise') {
      const raiseAmt = diff + 50;
      updated[0].chips -= raiseAmt;
      updated[0].currentBet += raiseAmt;
      updated[0].lastAction = `Raise (+50)`;
      setPot(p => p + raiseAmt);
      setCurrentHighestBet(updated[0].currentBet);
      setAnnouncement(`${player.username} raises +50!`);
    }

    setPlayers(updated);

    // Trigger AI Actions sequence
    setTimeout(() => {
      runAiRounds(updated, 1);
    }, 800);
  };

  // AI Opponents decision cycle
  const runAiRounds = (currentPlayers: PokerPlayer[], aiIdx: number) => {
    if (aiIdx >= currentPlayers.length) {
      // Betting round completed: advance phase!
      advancePhase(currentPlayers);
      return;
    }

    const ai = currentPlayers[aiIdx];
    if (ai.hasFolded) {
      runAiRounds(currentPlayers, aiIdx + 1);
      return;
    }

    // AI decision heuristic based on cards
    const diff = currentHighestBet - ai.currentBet;
    const handEval = evaluate7CardHand([...ai.holeCards, ...communityCards]);

    if (diff === 0) {
      // Can check
      ai.lastAction = 'Check';
    } else if (diff <= 50 || handEval.score >= 1000) {
      // Call
      ai.chips -= diff;
      ai.currentBet += diff;
      ai.lastAction = `Call (${diff})`;
      setPot(p => p + diff);
    } else {
      // Fold weak hands
      ai.hasFolded = true;
      ai.lastAction = 'Fold';
    }

    setPlayers([...currentPlayers]);

    setTimeout(() => {
      runAiRounds(currentPlayers, aiIdx + 1);
    }, 600);
  };

  // Advance Phase: Preflop -> Flop -> Turn -> River -> Showdown
  const advancePhase = (curPlayers: PokerPlayer[]) => {
    // Reset player bets for new round
    const resetBets = curPlayers.map(p => ({ ...p, currentBet: 0 }));
    setPlayers(resetBets);
    setCurrentHighestBet(0);

    const d = [...deck];

    if (phase === 'preflop') {
      // Deal Flop (3 cards)
      const flop = [d.pop()!, d.pop()!, d.pop()!];
      setDeck(d);
      setCommunityCards(flop);
      setPhase('flop');
      setAnnouncement('THE FLOP: 3 Community cards dealt.');
      sound.playSelect();
    } else if (phase === 'flop') {
      // Deal Turn (1 card)
      const turnCard = d.pop()!;
      setDeck(d);
      setCommunityCards(c => [...c, turnCard]);
      setPhase('turn');
      setAnnouncement('THE TURN: 4th Community card dealt.');
      sound.playSelect();
    } else if (phase === 'turn') {
      // Deal River (1 card)
      const riverCard = d.pop()!;
      setDeck(d);
      setCommunityCards(c => [...c, riverCard]);
      setPhase('river');
      setAnnouncement('THE RIVER: Final 5th card dealt. Final bets!');
      sound.playSelect();
    } else if (phase === 'river') {
      // Showdown!
      setPhase('showdown');
      evaluateShowdown(resetBets);
    }
  };

  // Evaluate Showdown & Distribute Virtual Pot
  const evaluateShowdown = (finalPlayers: PokerPlayer[]) => {
    sound.playWinFanfare();

    let bestScore = -1;
    let winningPlayer: PokerPlayer | null = null;
    let winHandName = '';

    finalPlayers.forEach(p => {
      if (!p.hasFolded) {
        const result = evaluate7CardHand([...p.holeCards, ...communityCards]);
        if (result.score > bestScore) {
          bestScore = result.score;
          winningPlayer = p;
          winHandName = result.name;
        }
      }
    });

    if (winningPlayer) {
      const winner = winningPlayer as PokerPlayer;
      winner.chips += pot;
      const wonByHuman = winner.id === 'p0';

      if (wonByHuman) {
        setPlayerWins(w => w + 1);
        confetti({ particleCount: 90, spread: 70 });
        setAnnouncement(`YOU WIN THE POT (+${pot} Chips) with ${winHandName}!`);
      } else {
        setAnnouncement(`${winner.name} won the pot (${pot} Chips) with ${winHandName}.`);
      }

      setHandHistory(prev => [
        `${winner.name} won ${pot} chips (${winHandName})`,
        ...prev.slice(0, 5),
      ]);

      // Record to Firebase
      recordFinishedGame({
        gameId: 'poker',
        score: finalPlayers[0].chips,
        mode: 'versus_ai',
        result: wonByHuman ? 'win' : 'loss',
        aiScore: finalPlayers[1].chips,
        detail: `Hand: ${winHandName} • Stack: ${finalPlayers[0].chips} chips`,
      });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 neon-box-purple">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Club size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-purple-400 font-heading">
              NEON HOLD'EM POKER
            </h1>
            <p className="text-xs text-slate-400">
              Free Entertainment • Virtual Chips Only • 4-Player AI Table
            </p>
          </div>
        </div>

        {/* Chip Stack Tracker */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Pot</div>
            <div className="text-xl font-black text-amber-400 font-arcade">
              🪙 {pot}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Your Stack</div>
            <div className="text-2xl font-black text-cyan-400 font-arcade">
              {players[0].chips}
            </div>
          </div>
        </div>
      </div>

      {/* Main Poker Table Felt */}
      <div className="relative rounded-3xl bg-gradient-to-b from-indigo-950 via-slate-950 to-indigo-950 border-4 border-slate-800 p-6 shadow-2xl flex flex-col justify-between min-h-[460px]">
        {/* Top AI Opponents Row */}
        <div className="grid grid-cols-3 gap-4">
          {players.slice(1).map(ai => (
            <div
              key={ai.id}
              className={`p-3 rounded-2xl border text-center transition ${
                ai.hasFolded
                  ? 'border-slate-800 bg-slate-900/40 opacity-50'
                  : 'border-slate-700 bg-slate-900/80 shadow-md'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
                <Bot size={14} className="text-purple-400" />
                <span>{ai.name}</span>
              </div>
              <div className="text-xs font-arcade text-amber-400 mt-1">
                🪙 {ai.chips}
              </div>

              {/* AI Cards (Face down until showdown) */}
              <div className="flex justify-center gap-1.5 mt-2">
                {ai.holeCards.map((c, i) => (
                  <div
                    key={i}
                    className={`w-7 h-10 rounded border flex items-center justify-center text-[10px] font-bold ${
                      phase === 'showdown' && !ai.hasFolded
                        ? c.suit === '♥' || c.suit === '♦'
                          ? 'bg-slate-100 text-rose-600 border-rose-300'
                          : 'bg-slate-100 text-slate-950 border-slate-400'
                        : 'bg-purple-900 border-purple-600 text-purple-300'
                    }`}
                  >
                    {phase === 'showdown' && !ai.hasFolded ? `${formatRank(c.rank)}${c.suit}` : '🂠'}
                  </div>
                ))}
              </div>

              {ai.lastAction && (
                <div className="text-[10px] text-cyan-400 mt-1 font-semibold">
                  {ai.lastAction}
                </div>
              )}
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
                {evaluate7CardHand([...players[0].holeCards, ...communityCards]).name}
              </div>
            </div>

            <div className="flex gap-2">
              {players[0].holeCards.map((c, i) => (
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
          {phase !== 'showdown' && !players[0].hasFolded ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handlePlayerAction('fold')}
                className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700"
              >
                Fold
              </button>

              {currentHighestBet <= players[0].currentBet ? (
                <button
                  type="button"
                  onClick={() => handlePlayerAction('check')}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700"
                >
                  Check
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlayerAction('call')}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                >
                  Call ({currentHighestBet - players[0].currentBet})
                </button>
              )}

              <button
                type="button"
                onClick={() => handlePlayerAction('raise')}
                className="py-2.5 px-5 rounded-xl text-xs font-bold uppercase bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-slate-950 font-black shadow-md shadow-purple-500/25 active:scale-95"
              >
                Raise (+50)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startNewHand}
              className="py-3 px-6 rounded-xl font-bold uppercase text-xs bg-gradient-to-r from-purple-400 to-pink-400 text-slate-950 hover:from-purple-300 hover:to-pink-300 shadow-lg shadow-purple-500/30 flex items-center gap-2"
            >
              <RotateCcw size={14} /> Deal Next Hand
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
