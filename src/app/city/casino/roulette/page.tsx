"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Color = "red" | "black" | "green";
type BetType =
  | "red" | "black" | "even" | "odd" | "low" | "high"
  | "dozen1" | "dozen2" | "dozen3"
  | "col1" | "col2" | "col3"
  | `num_${number}`;

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getColor(n: number): Color {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const CHIP_VALUES = [10, 25, 100, 500, 1000, 5000];
const CHIP_COLORS: Record<number, string> = {
  10: "bg-blue-600",
  25: "bg-green-600",
  100: "bg-red-600",
  500: "bg-purple-700",
  1000: "bg-yellow-600",
  5000: "bg-gray-800 border-yellow-500",
};

interface PlacedBet {
  type: BetType;
  amount: number;
  label: string;
}

interface SpinResult {
  number: number;
  color: Color;
  totalWin: number;
  totalBet: number;
  netProfit: number;
}

function calculatePayout(betType: BetType): number {
  if (betType.startsWith("num_")) return 35;
  if (["red", "black", "even", "odd", "low", "high"].includes(betType)) return 1;
  if (betType.startsWith("dozen") || betType.startsWith("col")) return 2;
  return 1;
}

function checkWin(betType: BetType, result: number): boolean {
  const color = getColor(result);
  if (betType.startsWith("num_")) return parseInt(betType.split("_")[1]) === result;
  if (betType === "red") return color === "red";
  if (betType === "black") return color === "black";
  if (betType === "even") return result !== 0 && result % 2 === 0;
  if (betType === "odd") return result % 2 !== 0;
  if (betType === "low") return result >= 1 && result <= 18;
  if (betType === "high") return result >= 19 && result <= 36;
  if (betType === "dozen1") return result >= 1 && result <= 12;
  if (betType === "dozen2") return result >= 13 && result <= 24;
  if (betType === "dozen3") return result >= 25 && result <= 36;
  if (betType === "col1") return result !== 0 && result % 3 === 1;
  if (betType === "col2") return result !== 0 && result % 3 === 2;
  if (betType === "col3") return result !== 0 && result % 3 === 0;
  return false;
}

export default function RoulettePage() {
  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [history, setHistory] = useState<{ number: number; color: Color }[]>([]);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [balance, setBalance] = useState(50000);

  const totalBet = bets.reduce((acc, b) => acc + b.amount, 0);

  const placeBet = useCallback(
    (type: BetType, label: string) => {
      if (spinning) return;
      setBets((prev) => {
        const existing = prev.findIndex((b) => b.type === type);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], amount: updated[existing].amount + selectedChip };
          return updated;
        }
        return [...prev, { type, amount: selectedChip, label }];
      });
    },
    [spinning, selectedChip]
  );

  const clearBets = () => {
    if (spinning) return;
    setBets([]);
    setResult(null);
  };

  const spin = async () => {
    if (spinning || totalBet === 0) return;
    if (totalBet > balance) return;

    setSpinning(true);
    setResult(null);
    setBalance((b) => b - totalBet);

    // Animate wheel
    const spins = 5 + Math.random() * 5;
    const resultNumber = Math.floor(Math.random() * 37);
    const targetIndex = WHEEL_NUMBERS.indexOf(resultNumber);
    const targetAngle = (360 / 37) * targetIndex;
    setWheelAngle((prev) => prev + spins * 360 + (360 - targetAngle));

    await new Promise((r) => setTimeout(r, 4000));

    const color = getColor(resultNumber);
    let totalWin = 0;

    for (const bet of bets) {
      if (checkWin(bet.type, resultNumber)) {
        const payout = calculatePayout(bet.type);
        totalWin += bet.amount * (payout + 1);
      }
    }

    const netProfit = totalWin - totalBet;
    setBalance((b) => b + totalWin);
    setResult({ number: resultNumber, color, totalWin, totalBet, netProfit });
    setHistory((h) => [{ number: resultNumber, color }, ...h.slice(0, 19)]);
    setSpinning(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city/casino" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← Casino
        </a>
        <h1 className="font-black text-gold-gradient">European Roulette</h1>
        <div className="text-sm">
          <span className="text-gray-500">Balance: </span>
          <span className="text-yellow-400 font-bold">{balance.toLocaleString()} VC</span>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 p-6 max-w-7xl mx-auto">
        {/* Left: Wheel + Result */}
        <div className="flex flex-col items-center gap-6">
          {/* Roulette Wheel Visual */}
          <div className="relative w-64 h-64">
            <motion.div
              className="w-full h-full rounded-full border-4 border-yellow-600"
              style={{
                background: "conic-gradient(from 0deg, " +
                  WHEEL_NUMBERS.map((n, i) => {
                    const color = getColor(n);
                    const start = (i / 37) * 100;
                    const end = ((i + 1) / 37) * 100;
                    const c = color === "red" ? "#c0392b" : color === "black" ? "#1a1a1a" : "#27ae60";
                    return `${c} ${start}%, ${c} ${end}%`;
                  }).join(", ") + ")",
              }}
              animate={{ rotate: wheelAngle }}
              transition={{ duration: spinning ? 4 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gray-900 border-2 border-yellow-600 flex items-center justify-center">
                {result ? (
                  <span
                    className={`text-xl font-black ${
                      result.color === "red" ? "text-red-400" :
                      result.color === "black" ? "text-white" : "text-green-400"
                    }`}
                  >
                    {result.number}
                  </span>
                ) : (
                  <span className="text-gray-600 text-xs">SPIN</span>
                )}
              </div>
            </div>
          </div>

          {/* Result display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`text-center p-4 rounded-xl border ${
                  result.netProfit > 0
                    ? "bg-green-900/30 border-green-500/30"
                    : result.netProfit === 0
                    ? "bg-gray-800/30 border-gray-500/30"
                    : "bg-red-900/30 border-red-500/30"
                }`}
              >
                <div className="text-sm text-gray-400">Result</div>
                <div
                  className={`text-3xl font-black ${
                    result.color === "red" ? "text-red-400" :
                    result.color === "black" ? "text-white" : "text-green-400"
                  }`}
                >
                  {result.number} {result.color.toUpperCase()}
                </div>
                <div className={`text-lg font-bold mt-1 ${result.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {result.netProfit >= 0 ? "+" : ""}{result.netProfit.toLocaleString()} VC
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          <div>
            <div className="text-xs text-gray-500 mb-2">Recent Results</div>
            <div className="flex flex-wrap gap-1 max-w-xs">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    h.color === "red" ? "bg-red-600" :
                    h.color === "black" ? "bg-gray-800 border border-white/20" : "bg-green-600"
                  }`}
                >
                  {h.number}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Betting Table */}
        <div className="flex-1">
          {/* Chip selector */}
          <div className="flex gap-2 mb-6 flex-wrap">
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

          {/* Outside bets */}
          <div className="casino-felt rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { type: "red" as BetType, label: "RED", className: "roulette-red" },
                { type: "black" as BetType, label: "BLACK", className: "roulette-black" },
                { type: "even" as BetType, label: "EVEN", className: "bg-gray-700" },
                { type: "odd" as BetType, label: "ODD", className: "bg-gray-700" },
                { type: "low" as BetType, label: "1-18", className: "bg-gray-700" },
                { type: "high" as BetType, label: "19-36", className: "bg-gray-700" },
              ].map(({ type, label, className }) => {
                const bet = bets.find((b) => b.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => placeBet(type, label)}
                    className={`${className} rounded-lg py-3 text-white font-bold text-sm relative hover:opacity-80 transition-opacity`}
                  >
                    {label}
                    {bet && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                        {bet.amount >= 1000 ? `${bet.amount / 1000}K` : bet.amount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dozens */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { type: "dozen1" as BetType, label: "1st 12" },
                { type: "dozen2" as BetType, label: "2nd 12" },
                { type: "dozen3" as BetType, label: "3rd 12" },
              ].map(({ type, label }) => {
                const bet = bets.find((b) => b.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => placeBet(type, label)}
                    className="bg-gray-700 rounded-lg py-2 text-white text-sm font-bold relative hover:bg-gray-600 transition-colors"
                  >
                    {label}
                    {bet && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                        {bet.amount >= 1000 ? `${Math.round(bet.amount / 1000)}K` : bet.amount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Number grid (simplified) */}
            <div className="grid grid-cols-13 gap-0.5" style={{ gridTemplateColumns: "repeat(13, 1fr)" }}>
              {/* Zero */}
              <button
                onClick={() => placeBet("num_0", "0")}
                className="col-span-1 row-span-3 roulette-green rounded text-xs font-bold py-1 hover:opacity-80 relative"
              >
                0
                {bets.find((b) => b.type === "num_0") && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-black w-4 h-4 rounded-full flex items-center justify-center" style={{ fontSize: "9px" }}>
                    •
                  </span>
                )}
              </button>

              {/* Numbers 1-36 in 3 rows */}
              {[3, 2, 1].map((row) =>
                Array.from({ length: 12 }, (_, col) => {
                  const num = col * 3 + row;
                  const color = getColor(num);
                  const bet = bets.find((b) => b.type === `num_${num}`);
                  return (
                    <button
                      key={num}
                      onClick={() => placeBet(`num_${num}`, String(num))}
                      className={`text-xs font-bold py-1.5 rounded relative hover:opacity-80 ${
                        color === "red" ? "roulette-red" : "roulette-black border border-white/10"
                      }`}
                    >
                      {num}
                      {bet && (
                        <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-black w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ fontSize: "8px" }}>
                          •
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <div className="flex-1 bg-black/30 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Total Bet</div>
              <div className="text-xl font-black text-white">{totalBet.toLocaleString()} VC</div>
              {bets.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">{bets.length} bet{bets.length !== 1 ? "s" : ""} placed</div>
              )}
            </div>

            <button
              onClick={clearBets}
              disabled={spinning || bets.length === 0}
              className="px-6 py-4 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Clear
            </button>

            <button
              onClick={spin}
              disabled={spinning || totalBet === 0 || totalBet > balance}
              className="flex-1 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black rounded-xl text-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
            >
              {spinning ? "Spinning..." : "SPIN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
