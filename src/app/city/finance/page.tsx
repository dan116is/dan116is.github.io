"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Market {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  icon: string;
}

const MARKETS: Market[] = [
  { symbol: "BTC/USD", name: "Bitcoin", price: 67850, change: 1240, changePercent: 1.86, icon: "₿" },
  { symbol: "ETH/USD", name: "Ethereum", price: 3420, change: -85, changePercent: -2.43, icon: "⟠" },
  { symbol: "EUR/USD", name: "Euro/Dollar", price: 1.0842, change: 0.0023, changePercent: 0.21, icon: "€" },
  { symbol: "SPX", name: "S&P 500", price: 5234, change: 42, changePercent: 0.81, icon: "📊" },
  { symbol: "GOLD", name: "Gold (oz)", price: 2345, change: -12, changePercent: -0.51, icon: "🥇" },
  { symbol: "OIL", name: "Crude Oil", price: 78.4, change: 0.9, changePercent: 1.16, icon: "🛢️" },
];

const DURATIONS = [
  { label: "1 min", seconds: 60, odds: 1.9 },
  { label: "5 min", seconds: 300, odds: 1.88 },
  { label: "15 min", seconds: 900, odds: 1.85 },
  { label: "1 hour", seconds: 3600, odds: 1.8 },
];

interface ActiveBet {
  id: string;
  market: Market;
  direction: "up" | "down";
  entryPrice: number;
  amount: number;
  odds: number;
  expiresAt: Date;
  status: "active" | "won" | "lost";
}

export default function FinancePage() {
  const [selectedMarket, setSelectedMarket] = useState<Market>(MARKETS[0]);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [balance, setBalance] = useState(50000);
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(MARKETS.map((m) => [m.symbol, m.price]))
  );
  const [candles, setCandles] = useState<{ open: number; close: number; high: number; low: number }[]>([]);

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) => {
        const next = { ...prev };
        for (const market of MARKETS) {
          const delta = market.price * (Math.random() - 0.5) * 0.002;
          next[market.symbol] = Math.max(0.001, prev[market.symbol] + delta);
        }
        return next;
      });

      setCandles((prev) => {
        const lastPrice = prices[selectedMarket.symbol];
        const open = prev.length > 0 ? prev[prev.length - 1].close : lastPrice;
        const close = open * (1 + (Math.random() - 0.5) * 0.005);
        const high = Math.max(open, close) * (1 + Math.random() * 0.002);
        const low = Math.min(open, close) * (1 - Math.random() * 0.002);
        return [...prev.slice(-30), { open, close, high, low }];
      });

      // Resolve expired bets
      setActiveBets((prev) =>
        prev.map((bet) => {
          if (bet.status !== "active") return bet;
          if (new Date() < bet.expiresAt) return bet;

          const currentPrice = prices[bet.market.symbol] ?? bet.entryPrice;
          const won =
            (bet.direction === "up" && currentPrice > bet.entryPrice) ||
            (bet.direction === "down" && currentPrice < bet.entryPrice);

          const payout = won ? bet.amount * bet.odds : 0;
          setBalance((b) => b + payout);

          return { ...bet, status: won ? "won" : "lost" };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedMarket, prices]);

  function placeBet() {
    if (!direction || betAmount <= 0 || betAmount > balance) return;

    const bet: ActiveBet = {
      id: Math.random().toString(36).slice(2),
      market: selectedMarket,
      direction,
      entryPrice: prices[selectedMarket.symbol],
      amount: betAmount,
      odds: selectedDuration.odds,
      expiresAt: new Date(Date.now() + selectedDuration.seconds * 1000),
      status: "active",
    };

    setBalance((b) => b - betAmount);
    setActiveBets((prev) => [bet, ...prev]);
    setDirection(null);
  }

  const currentPrice = prices[selectedMarket.symbol];
  const priceFormatted =
    currentPrice < 10
      ? currentPrice.toFixed(4)
      : currentPrice < 100
      ? currentPrice.toFixed(2)
      : currentPrice.toFixed(0);

  return (
    <div className="min-h-screen city-bg">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city" className="text-gray-400 hover:text-white text-sm">← City Map</a>
        <div className="text-yellow-400 font-bold">Financial Hub</div>
        <div className="text-sm text-yellow-400 font-bold">{balance.toLocaleString()} VC</div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col xl:flex-row gap-6">
        {/* Left: Markets & Chart */}
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gold-gradient mb-6">Binary Predictions</h1>
          <p className="text-gray-400 mb-6 text-sm">
            Predict whether an asset price will be higher or lower after a set time period.
            Platform pays {((DURATIONS[0].odds - 1) * 100).toFixed(0)}% on winning bets (5% house edge on binary options).
          </p>

          {/* Market selector */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
            {MARKETS.map((market) => {
              const p = prices[market.symbol];
              const isUp = p >= market.price;
              return (
                <button
                  key={market.symbol}
                  onClick={() => setSelectedMarket(market)}
                  className={`luxury-card p-3 text-center cursor-pointer transition-all ${
                    selectedMarket.symbol === market.symbol
                      ? "border-yellow-500/60"
                      : "hover:border-white/20"
                  }`}
                >
                  <div className="text-xl mb-1">{market.icon}</div>
                  <div className="text-xs font-bold text-white">{market.symbol}</div>
                  <div className={`text-xs ${isUp ? "text-green-400" : "text-red-400"}`}>
                    {isUp ? "▲" : "▼"} {Math.abs(((p - market.price) / market.price) * 100).toFixed(2)}%
                  </div>
                </button>
              );
            })}
          </div>

          {/* Price display */}
          <div className="luxury-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-black text-white">{selectedMarket.name}</div>
                <div className="text-sm text-gray-500">{selectedMarket.symbol}</div>
              </div>
              <div className="text-right">
                <motion.div
                  key={priceFormatted}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-black text-yellow-400"
                >
                  {priceFormatted}
                </motion.div>
              </div>
            </div>

            {/* Simple candlestick chart */}
            <div className="flex items-end gap-0.5 h-32 bg-black/30 rounded-xl p-2 overflow-hidden">
              {candles.slice(-40).map((c, i) => {
                const isGreen = c.close >= c.open;
                const maxPrice = Math.max(...candles.map((x) => x.high));
                const minPrice = Math.min(...candles.map((x) => x.low));
                const range = maxPrice - minPrice || 1;
                const bodyTop = ((maxPrice - Math.max(c.open, c.close)) / range) * 100;
                const bodyHeight = (Math.abs(c.close - c.open) / range) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center relative" style={{ minWidth: "3px" }}>
                    <div
                      className={`w-px ${isGreen ? "bg-green-500" : "bg-red-500"}`}
                      style={{
                        height: `${((c.high - c.low) / range) * 100}%`,
                        marginTop: `${((maxPrice - c.high) / range) * 100}%`,
                        position: "absolute",
                      }}
                    />
                    <div
                      className={`w-full ${isGreen ? "bg-green-500" : "bg-red-500"}`}
                      style={{
                        height: `${Math.max(bodyHeight, 1)}%`,
                        marginTop: `${bodyTop}%`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Bets */}
          {activeBets.length > 0 && (
            <div className="luxury-card p-4">
              <h3 className="font-bold text-white mb-3">Active Predictions</h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {activeBets.slice(0, 5).map((bet) => {
                    const currentP = prices[bet.market.symbol] ?? bet.entryPrice;
                    const isWinning =
                      (bet.direction === "up" && currentP > bet.entryPrice) ||
                      (bet.direction === "down" && currentP < bet.entryPrice);
                    const timeLeft = Math.max(
                      0,
                      Math.ceil((bet.expiresAt.getTime() - Date.now()) / 1000)
                    );

                    return (
                      <motion.div
                        key={bet.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          bet.status === "won"
                            ? "bg-green-900/20 border-green-500/30"
                            : bet.status === "lost"
                            ? "bg-red-900/20 border-red-500/30"
                            : isWinning
                            ? "bg-green-900/10 border-green-500/20"
                            : "bg-red-900/10 border-red-500/20"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-white">
                            {bet.market.symbol} {bet.direction === "up" ? "▲ UP" : "▼ DOWN"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Entry: {bet.entryPrice.toFixed(2)} | Now: {currentP.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-yellow-400">{bet.amount} VC</div>
                          {bet.status === "active" ? (
                            <div className="text-xs text-gray-500">{timeLeft}s</div>
                          ) : (
                            <div className={`text-xs font-bold ${bet.status === "won" ? "text-green-400" : "text-red-400"}`}>
                              {bet.status === "won" ? `+${Math.round(bet.amount * bet.odds)} VC` : "LOST"}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Right: Betting Panel */}
        <div className="w-72 flex-shrink-0">
          <div className="luxury-card p-6 sticky top-4">
            <h2 className="font-black text-xl text-white mb-6">Place Prediction</h2>

            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">Asset</div>
              <div className="font-bold text-yellow-400">{selectedMarket.name} ({selectedMarket.symbol})</div>
              <div className="text-2xl font-black text-white">{priceFormatted}</div>
            </div>

            {/* Duration */}
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-2">Duration</div>
              <div className="grid grid-cols-2 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.seconds}
                    onClick={() => setSelectedDuration(d)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDuration.seconds === d.seconds
                        ? "bg-yellow-500 text-black"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    <div>{d.label}</div>
                    <div className="text-xs opacity-70">{d.odds}x</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-2">Bet Amount (VC)</div>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 text-lg font-bold"
              />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setBetAmount(v)}
                    className="flex-1 bg-white/5 text-gray-400 py-1 rounded text-xs hover:bg-white/10"
                  >
                    {v >= 1000 ? `${v / 1000}K` : v}
                  </button>
                ))}
              </div>
            </div>

            {/* Potential win */}
            <div className="bg-black/30 rounded-lg p-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Stake</span>
                <span className="text-white">{betAmount} VC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payout</span>
                <span className="text-green-400 font-bold">{Math.round(betAmount * selectedDuration.odds)} VC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Profit</span>
                <span className="text-green-400 font-bold">+{Math.round(betAmount * (selectedDuration.odds - 1))} VC</span>
              </div>
            </div>

            {/* Direction buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setDirection("up"); }}
                className={`py-4 rounded-xl font-black text-lg transition-all ${
                  direction === "up"
                    ? "bg-green-500 text-white"
                    : "bg-green-900/30 border border-green-500/30 text-green-400 hover:bg-green-900/50"
                }`}
              >
                ▲ UP
              </button>
              <button
                onClick={() => { setDirection("down"); }}
                className={`py-4 rounded-xl font-black text-lg transition-all ${
                  direction === "down"
                    ? "bg-red-500 text-white"
                    : "bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-900/50"
                }`}
              >
                ▼ DOWN
              </button>
            </div>

            {direction && (
              <button
                onClick={placeBet}
                disabled={betAmount > balance}
                className="w-full mt-3 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black rounded-xl disabled:opacity-50 text-lg"
              >
                Predict {direction === "up" ? "▲" : "▼"} for {selectedDuration.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
