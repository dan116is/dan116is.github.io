"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Suit = "♥" | "♦" | "♣" | "♠";
type Rank = "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A";

interface Card {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

type Phase = "betting" | "player" | "dealer" | "result";
type Outcome = "blackjack" | "win" | "push" | "loss" | "bust";

const SUITS: Suit[] = ["♥", "♦", "♣", "♠"];
const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RED_SUITS = new Set(["♥","♦"]);

function cardValue(rank: Rank): number {
  if (["J","Q","K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 6; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function handTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.hidden) continue;
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

const CHIP_VALUES = [25, 100, 500, 1000, 5000];
const CHIP_COLORS: Record<number, string> = {
  25: "bg-green-600",
  100: "bg-red-600",
  500: "bg-purple-700",
  1000: "bg-yellow-600",
  5000: "bg-gray-800 border border-yellow-500",
};

function CardDisplay({ card }: { card: Card }) {
  const isRed = RED_SUITS.has(card.suit);
  if (card.hidden) {
    return (
      <div className="w-14 h-20 rounded-lg bg-blue-900 border border-blue-700 flex items-center justify-center">
        <span className="text-blue-600 text-2xl">🂠</span>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ rotateY: 90 }}
      animate={{ rotateY: 0 }}
      className={`w-14 h-20 rounded-lg bg-white border border-gray-200 shadow-lg flex flex-col p-1 ${isRed ? "text-red-600" : "text-gray-900"}`}
    >
      <div className="text-sm font-black leading-none">{card.rank}</div>
      <div className="flex-1 flex items-center justify-center text-2xl">{card.suit}</div>
      <div className="text-sm font-black leading-none self-end rotate-180">{card.rank}</div>
    </motion.div>
  );
}

export default function BlackjackPage() {
  const [balance, setBalance] = useState(50000);
  const [bet, setBet] = useState(0);
  const [selectedChip, setSelectedChip] = useState(100);
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("betting");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [history, setHistory] = useState<{ outcome: Outcome; amount: number }[]>([]);

  function addChip() {
    if (phase !== "betting") return;
    if (balance < selectedChip) return;
    setBet((b) => b + selectedChip);
    setBalance((b) => b - selectedChip);
  }

  function clearBet() {
    if (phase !== "betting") return;
    setBalance((b) => b + bet);
    setBet(0);
  }

  const deal = useCallback(() => {
    if (bet === 0) return;

    const newDeck = createDeck();
    const pCards = [newDeck.pop()!, newDeck.pop()!];
    const dCards = [newDeck.pop()!, { ...newDeck.pop()!, hidden: true }];

    setDeck(newDeck);
    setPlayerCards(pCards);
    setDealerCards(dCards);
    setOutcome(null);

    const pTotal = handTotal(pCards);
    const dVisible = handTotal([dCards[0]]);

    if (pTotal === 21) {
      // Check dealer blackjack first
      if (dCards[1].rank === "A" || cardValue(dCards[1].rank) === 10) {
        if (handTotal([dCards[0], { ...dCards[1], hidden: false }]) === 21) {
          // Both blackjack = push
          const revealed = [dCards[0], { ...dCards[1], hidden: false }];
          setDealerCards(revealed);
          setPhase("result");
          setOutcome("push");
          setBalance((b) => b + bet);
          setHistory((h) => [{ outcome: "push", amount: 0 }, ...h.slice(0, 9)]);
          return;
        }
      }
      // Player blackjack
      const revealed = [dCards[0], { ...dCards[1], hidden: false }];
      setDealerCards(revealed);
      setPhase("result");
      setOutcome("blackjack");
      setBalance((b) => b + Math.floor(bet * 2.5));
      setHistory((h) => [{ outcome: "blackjack", amount: Math.floor(bet * 1.5) }, ...h.slice(0, 9)]);
      return;
    }

    setPhase("player");
  }, [bet]);

  function hit() {
    if (phase !== "player") return;
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newCards = [...playerCards, card];
    setDeck(newDeck);
    setPlayerCards(newCards);

    const total = handTotal(newCards);
    if (total > 21) {
      setPhase("result");
      setOutcome("bust");
      setHistory((h) => [{ outcome: "bust", amount: -bet }, ...h.slice(0, 9)]);
    }
  }

  function stand() {
    if (phase !== "player") return;

    // Reveal dealer's hole card
    const revealedDealer = dealerCards.map((c) => ({ ...c, hidden: false }));
    let currentDealer = [...revealedDealer];
    let currentDeck = [...deck];

    while (handTotal(currentDealer) < 17) {
      const card = currentDeck.pop()!;
      currentDealer.push(card);
    }

    setDeck(currentDeck);
    setDealerCards(currentDealer);
    setPhase("dealer");

    setTimeout(() => {
      const playerTotal = handTotal(playerCards);
      const dealerTotal = handTotal(currentDealer);
      const dealerBust = dealerTotal > 21;

      let result: Outcome;
      let payout = 0;

      if (dealerBust || playerTotal > dealerTotal) {
        result = "win";
        payout = bet * 2;
      } else if (playerTotal === dealerTotal) {
        result = "push";
        payout = bet;
      } else {
        result = "loss";
        payout = 0;
      }

      setBalance((b) => b + payout);
      setOutcome(result);
      setPhase("result");
      setHistory((h) => [{ outcome: result, amount: payout - bet }, ...h.slice(0, 9)]);
    }, 1500);
  }

  function double() {
    if (phase !== "player" || playerCards.length !== 2) return;
    if (balance < bet) return;
    setBalance((b) => b - bet);
    setBet((b) => b * 2);

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newCards = [...playerCards, card];
    setDeck(newDeck);
    setPlayerCards(newCards);
    setPhase("player");

    setTimeout(() => stand(), 500);
  }

  function newGame() {
    setPlayerCards([]);
    setDealerCards([]);
    setBet(0);
    setOutcome(null);
    setPhase("betting");
  }

  const playerTotal = handTotal(playerCards);
  const dealerTotal = handTotal(dealerCards.map((c) => ({ ...c, hidden: false })));
  const dealerVisible = handTotal(dealerCards);

  const OUTCOME_STYLES: Record<Outcome, { text: string; label: string }> = {
    blackjack: { text: "text-yellow-400", label: "BLACKJACK! +150%" },
    win: { text: "text-green-400", label: "YOU WIN!" },
    push: { text: "text-gray-400", label: "PUSH" },
    loss: { text: "text-red-400", label: "DEALER WINS" },
    bust: { text: "text-red-400", label: "BUST!" },
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city/casino" className="text-gray-400 hover:text-white text-sm">← Casino</a>
        <h1 className="font-black text-gold-gradient">Blackjack — 6 Deck</h1>
        <div className="text-sm">
          <span className="text-gray-500">Balance: </span>
          <span className="text-yellow-400 font-bold">{balance.toLocaleString()} VC</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Dealer's hand */}
        <div className="casino-felt rounded-2xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Dealer</div>
            {dealerCards.length > 0 && (
              <div className="text-lg font-bold text-white">
                {phase === "betting" || phase === "player"
                  ? dealerVisible
                  : dealerTotal}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-2 min-h-20 mb-8">
            {dealerCards.map((card, i) => (
              <CardDisplay key={i} card={card} />
            ))}
          </div>

          {/* Outcome */}
          <AnimatePresence>
            {outcome && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`text-center text-3xl font-black mb-4 ${OUTCOME_STYLES[outcome].text}`}
              >
                {OUTCOME_STYLES[outcome].label}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player's hand */}
          <div className="flex justify-center gap-2 min-h-20 mb-6">
            {playerCards.map((card, i) => (
              <CardDisplay key={i} card={card} />
            ))}
          </div>

          <div className="text-center mb-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Player</div>
            {playerCards.length > 0 && (
              <div className={`text-lg font-bold ${playerTotal > 21 ? "text-red-400" : "text-white"}`}>
                {playerTotal}{playerTotal > 21 ? " (BUST)" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="luxury-card p-6">
          {/* Chip selector */}
          {phase === "betting" && (
            <div className="flex gap-2 mb-4 justify-center">
              {CHIP_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedChip(v)}
                  className={`chip text-white text-xs ${CHIP_COLORS[v]} ${
                    selectedChip === v ? "ring-2 ring-yellow-400" : ""
                  }`}
                >
                  {v >= 1000 ? `${v / 1000}K` : v}
                </button>
              ))}
            </div>
          )}

          {/* Bet display */}
          <div className="text-center mb-6">
            <div className="text-xs text-gray-500 mb-1">Current Bet</div>
            <div className="text-3xl font-black text-yellow-400">{bet.toLocaleString()} VC</div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center flex-wrap">
            {phase === "betting" && (
              <>
                <button
                  onClick={addChip}
                  disabled={balance < selectedChip}
                  className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 disabled:opacity-50"
                >
                  +{selectedChip.toLocaleString()} VC
                </button>
                <button
                  onClick={clearBet}
                  disabled={bet === 0}
                  className="px-6 py-3 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  onClick={deal}
                  disabled={bet === 0}
                  className="px-10 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black rounded-xl disabled:opacity-50 text-lg"
                >
                  DEAL
                </button>
              </>
            )}

            {phase === "player" && (
              <>
                <button
                  onClick={hit}
                  className="px-8 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-500"
                >
                  HIT
                </button>
                <button
                  onClick={stand}
                  className="px-8 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-500"
                >
                  STAND
                </button>
                {playerCards.length === 2 && balance >= bet && (
                  <button
                    onClick={double}
                    className="px-8 py-3 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-500"
                  >
                    DOUBLE
                  </button>
                )}
              </>
            )}

            {phase === "result" && (
              <button
                onClick={newGame}
                className="px-10 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black rounded-xl text-lg"
              >
                New Hand
              </button>
            )}

            {phase === "dealer" && (
              <div className="text-gray-400 font-medium">Dealer playing...</div>
            )}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6 luxury-card p-4">
            <h3 className="text-sm font-bold text-yellow-400 mb-3">Recent Hands</h3>
            <div className="flex gap-2 flex-wrap">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    h.outcome === "blackjack" || h.outcome === "win"
                      ? "bg-green-900/30 text-green-400"
                      : h.outcome === "push"
                      ? "bg-gray-800 text-gray-400"
                      : "bg-red-900/30 text-red-400"
                  }`}
                >
                  {h.outcome === "blackjack" ? "BJ" :
                   h.outcome === "win" ? "W" :
                   h.outcome === "push" ? "P" :
                   h.outcome === "bust" ? "B" : "L"}
                  {h.amount !== 0 && ` ${h.amount > 0 ? "+" : ""}${h.amount}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
