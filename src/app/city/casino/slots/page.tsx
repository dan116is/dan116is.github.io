"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Symbol = "🍒" | "🍋" | "🍊" | "🍇" | "🔔" | "7️⃣" | "💎" | "⭐" | "🃏";

const SYMBOLS: Symbol[] = ["🍒", "🍋", "🍊", "🍇", "🔔", "7️⃣", "💎", "⭐", "🃏"];

const SYMBOL_PAYOUTS: Record<Symbol, Record<number, number>> = {
  "🍒": { 3: 5, 4: 15, 5: 50 },
  "🍋": { 3: 8, 4: 20, 5: 75 },
  "🍊": { 3: 10, 4: 25, 5: 100 },
  "🍇": { 3: 15, 4: 40, 5: 150 },
  "🔔": { 3: 20, 4: 75, 5: 250 },
  "7️⃣": { 3: 50, 4: 200, 5: 777 },
  "💎": { 3: 100, 4: 500, 5: 2000 },
  "⭐": { 3: 25, 4: 100, 5: 500 },
  "🃏": { 3: 5, 4: 20, 5: 100 }, // scatter
};

const WEIGHTS = [40, 35, 30, 25, 20, 12, 8, 5, 7];
const TOTAL_WEIGHT = WEIGHTS.reduce((a, b) => a + b, 0);

function getRandomSymbol(): Symbol {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < SYMBOLS.length; i++) {
    rand -= WEIGHTS[i];
    if (rand <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function spinReels(): Symbol[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => getRandomSymbol())
  );
}

interface Win {
  symbol: Symbol;
  count: number;
  multiplier: number;
  payout: number;
}

function evaluateWins(reels: Symbol[][], betPerLine: number): Win[] {
  const wins: Win[] = [];
  // Check middle row (main payline)
  const middle = reels.map((r) => r[1]);
  let count = 1;
  const first = middle[0] === "⭐" ? (middle.find((s) => s !== "⭐") ?? "⭐") : middle[0];

  for (let i = 1; i < 5; i++) {
    if (middle[i] === first || middle[i] === "⭐") count++;
    else break;
  }

  if (count >= 3 && SYMBOL_PAYOUTS[first]?.[count]) {
    const multiplier = SYMBOL_PAYOUTS[first][count];
    wins.push({ symbol: first, count, multiplier, payout: betPerLine * multiplier });
  }

  return wins;
}

const CHIP_OPTIONS = [5, 10, 25, 50, 100, 500];

export default function SlotsPage() {
  const [balance, setBalance] = useState(50000);
  const [betPerLine, setBetPerLine] = useState(10);
  const [reels, setReels] = useState<Symbol[][]>(() => spinReels());
  const [spinning, setSpinning] = useState(false);
  const [lastWins, setLastWins] = useState<Win[]>([]);
  const [totalWin, setTotalWin] = useState(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [history, setHistory] = useState<{ bet: number; win: number }[]>([]);
  const [spinCount, setSpinCount] = useState(0);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalBet = betPerLine * 25; // 25 paylines

  async function doSpin(isFree = false) {
    if (spinning) return;
    if (!isFree && balance < totalBet) return;

    setSpinning(true);
    setLastWins([]);
    setTotalWin(0);

    if (!isFree) {
      setBalance((b) => b - totalBet);
    }

    // Simulate reel spinning with multiple intermediate states
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 100));
      setReels(spinReels());
    }

    const finalReels = spinReels();
    setReels(finalReels);
    setSpinning(false);

    const wins = evaluateWins(finalReels, betPerLine);
    const winTotal = wins.reduce((acc, w) => acc + w.payout, 0);

    // Check for scatter (🃏)
    const scatterCount = finalReels.flat().filter((s) => s === "🃏").length;
    let freeSpinsAwarded = 0;
    if (scatterCount >= 3) {
      freeSpinsAwarded = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20;
      setFreeSpins((prev) => prev + freeSpinsAwarded);
    }

    if (winTotal > 0) {
      setBalance((b) => b + winTotal);
    }

    setLastWins(wins);
    setTotalWin(winTotal);
    setHistory((h) => [{ bet: isFree ? 0 : totalBet, win: winTotal }, ...h.slice(0, 9)]);
    setSpinCount((c) => c + 1);

    if (!isFree && freeSpins > 0) {
      setFreeSpins((prev) => prev - 1);
    }
  }

  const handleSpin = () => {
    if (freeSpins > 0) {
      setFreeSpins((f) => f - 1);
      doSpin(true);
    } else {
      doSpin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city/casino" className="text-gray-400 hover:text-white text-sm">← Casino</a>
        <h1 className="font-black text-gold-gradient">Lucky City Slots</h1>
        <div className="text-sm">
          <span className="text-gray-500">Balance: </span>
          <span className="text-yellow-400 font-bold">{balance.toLocaleString()} VC</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Jackpot display */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block bg-gradient-to-r from-yellow-900/40 to-yellow-700/20 border border-yellow-500/30 rounded-2xl px-8 py-4"
          >
            <div className="text-xs text-yellow-500 uppercase tracking-widest mb-1">Progressive Jackpot</div>
            <div className="text-3xl font-black text-yellow-400">182,430 VC</div>
          </motion.div>
        </div>

        {/* Slot machine */}
        <div className="luxury-card p-6 mb-6">
          {/* Reels */}
          <div className="flex gap-2 mb-6">
            {reels.map((reel, reelIdx) => (
              <div
                key={reelIdx}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl overflow-hidden"
              >
                {reel.map((symbol, rowIdx) => (
                  <motion.div
                    key={`${spinCount}-${reelIdx}-${rowIdx}`}
                    initial={{ y: spinning ? -50 : 0, opacity: spinning ? 0 : 1 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: reelIdx * 0.1 + rowIdx * 0.05 }}
                    className={`h-20 flex items-center justify-center text-3xl border-b border-white/5 last:border-0 ${
                      rowIdx === 1 ? "bg-white/5" : ""
                    }`}
                  >
                    {symbol}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {/* Payline indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-0.5 bg-yellow-500/30" />
            <span className="text-xs text-yellow-500">PAYLINE</span>
            <div className="flex-1 h-0.5 bg-yellow-500/30" />
          </div>

          {/* Win display */}
          <AnimatePresence>
            {totalWin > 0 && (
              <motion.div
                key={spinCount}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-4 bg-green-900/30 border border-green-500/30 rounded-xl mb-4"
              >
                <div className="text-3xl font-black text-green-400">+{totalWin.toLocaleString()} VC</div>
                {lastWins.map((w, i) => (
                  <div key={i} className="text-sm text-gray-400">
                    {w.symbol} x{w.count} — {w.multiplier}x multiplier
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {freeSpins > 0 && (
            <div className="text-center py-2 bg-purple-900/30 border border-purple-500/30 rounded-xl mb-4">
              <span className="text-purple-400 font-bold">{freeSpins} Free Spins Remaining!</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="luxury-card p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-500">Bet per line</div>
              <div className="flex gap-2 mt-1">
                {CHIP_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setBetPerLine(v)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      betPerLine === v
                        ? "bg-yellow-500 text-black"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Bet (25 lines)</div>
              <div className="text-xl font-black text-white">{totalBet.toLocaleString()} VC</div>
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={spinning || (balance < totalBet && freeSpins === 0)}
            className={`w-full py-4 font-black text-xl rounded-xl transition-all ${
              freeSpins > 0
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                : "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500"
            } disabled:opacity-50`}
          >
            {spinning ? "🎰 Spinning..." : freeSpins > 0 ? `FREE SPIN (${freeSpins})` : "SPIN"}
          </button>
        </div>

        {/* Paytable & History */}
        <div className="grid grid-cols-2 gap-4">
          <div className="luxury-card p-4">
            <h3 className="text-sm font-bold text-yellow-400 mb-3">Paytable</h3>
            <div className="space-y-1">
              {Object.entries(SYMBOL_PAYOUTS).map(([sym, payouts]) => (
                <div key={sym} className="flex items-center justify-between text-xs">
                  <span>{sym} x5</span>
                  <span className="text-yellow-400">{payouts[5]}x</span>
                </div>
              ))}
            </div>
          </div>

          <div className="luxury-card p-4">
            <h3 className="text-sm font-bold text-yellow-400 mb-3">Last Spins</h3>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Bet: {h.bet}</span>
                  <span className={h.win > 0 ? "text-green-400" : "text-red-400"}>
                    {h.win > 0 ? `+${h.win}` : h.bet > 0 ? `-${h.bet}` : "Free"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
