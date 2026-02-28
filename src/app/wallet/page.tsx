"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_WALLET = {
  balance: 125430,
  lockedBalance: 8000,
  totalDeposited: 500000,
  totalWithdrawn: 162140,
  totalWon: 340200,
  totalLost: 214770,
  currency: "VC",
  usdRate: 0.01,
};

const TRANSACTIONS = [
  { id: 1, type: "deposit", amount: 50000, method: "Credit Card", status: "completed", date: "2024-01-28 14:32", txId: "TXN-001-2024" },
  { id: 2, type: "win", amount: 12500, game: "Blackjack", status: "completed", date: "2024-01-28 13:15", txId: "WIN-442-2024" },
  { id: 3, type: "loss", amount: 3000, game: "Roulette", status: "completed", date: "2024-01-28 12:45", txId: "GAME-331-2024" },
  { id: 4, type: "win", amount: 75000, game: "Poker", status: "completed", date: "2024-01-27 22:10", txId: "WIN-221-2024" },
  { id: 5, type: "withdrawal", amount: 20000, method: "Bank Transfer", status: "pending", date: "2024-01-27 18:00", txId: "WDR-111-2024" },
  { id: 6, type: "deposit", amount: 100000, method: "Crypto (BTC)", status: "completed", date: "2024-01-26 09:30", txId: "TXN-002-2024" },
  { id: 7, type: "loss", amount: 5000, game: "Slots", status: "completed", date: "2024-01-25 21:00", txId: "GAME-220-2024" },
  { id: 8, type: "win", amount: 8800, game: "Baccarat", status: "completed", date: "2024-01-25 19:45", txId: "WIN-112-2024" },
];

const PAYMENT_METHODS = [
  { id: "card", icon: "💳", name: "Credit/Debit Card", desc: "Instant deposit", fee: "2.5%", min: 100, max: 50000 },
  { id: "crypto", icon: "₿", name: "Cryptocurrency", desc: "BTC, ETH, USDT", fee: "0%", min: 500, max: 500000 },
  { id: "bank", icon: "🏦", name: "Bank Transfer", desc: "1-3 business days", fee: "0%", min: 1000, max: 250000 },
  { id: "ewallet", icon: "📱", name: "E-Wallet", desc: "PayPal, Skrill", fee: "1%", min: 200, max: 100000 },
];

type TxFilter = "all" | "deposit" | "withdrawal" | "win" | "loss";
type ModalType = "deposit" | "withdraw" | null;

const TX_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string; sign: string }> = {
  deposit: { label: "Deposit", color: "text-blue-400", icon: "⬇️", sign: "+" },
  withdrawal: { label: "Withdrawal", color: "text-orange-400", icon: "⬆️", sign: "-" },
  win: { label: "Win", color: "text-green-400", icon: "🏆", sign: "+" },
  loss: { label: "Loss", color: "text-red-400", icon: "📉", sign: "-" },
};

export default function WalletPage() {
  const [filter, setFilter] = useState<TxFilter>("all");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedMethod, setSelectedMethod] = useState("card");
  const [amount, setAmount] = useState("");

  const filtered = TRANSACTIONS.filter(tx => filter === "all" || tx.type === filter);
  const netPnL = MOCK_WALLET.totalWon - MOCK_WALLET.totalLost;
  const isPnLPositive = netPnL >= 0;
  const totalBalance = MOCK_WALLET.balance + MOCK_WALLET.lockedBalance;

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/50 backdrop-blur-md">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <div className="text-yellow-400 font-bold">Wallet</div>
        <div className="text-sm text-gray-400">{MOCK_WALLET.balance.toLocaleString()} VC</div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card p-8 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-transparent to-purple-900/10 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="text-6xl font-black text-yellow-400 mb-2">
                {totalBalance.toLocaleString()} <span className="text-3xl text-yellow-600">VC</span>
              </div>
              <div className="text-gray-400 text-sm">
                ≈ ${(totalBalance * MOCK_WALLET.usdRate).toFixed(2)} USD
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <span className="text-white">{MOCK_WALLET.balance.toLocaleString()} VC</span> available •{" "}
                <span className="text-orange-400">{MOCK_WALLET.lockedBalance.toLocaleString()} VC</span> locked in bets
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setModal("deposit")}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl transition-all"
              >
                + Deposit
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setModal("withdraw")}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition-all"
              >
                ↑ Withdraw
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Deposited", value: MOCK_WALLET.totalDeposited, color: "text-blue-400", icon: "⬇️" },
            { label: "Total Withdrawn", value: MOCK_WALLET.totalWithdrawn, color: "text-orange-400", icon: "⬆️" },
            { label: "Total Won", value: MOCK_WALLET.totalWon, color: "text-green-400", icon: "🏆" },
            { label: "Net P&L", value: netPnL, color: isPnLPositive ? "text-green-400" : "text-red-400", icon: isPnLPositive ? "📈" : "📉" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="luxury-card p-4 text-center"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className={`text-lg font-black ${item.color}`}>
                {isPnLPositive && item.label === "Net P&L" ? "+" : ""}
                {item.value.toLocaleString()} VC
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="luxury-card overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-gray-300">Transaction History</h2>
            <div className="flex gap-2 flex-wrap">
              {(["all", "deposit", "withdrawal", "win", "loss"] as TxFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all capitalize ${
                    filter === f ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {filtered.map((tx, i) => {
              const config = TX_TYPE_CONFIG[tx.type];
              const isPositive = tx.type === "deposit" || tx.type === "win";
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{config.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                        {tx.status === "pending" && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {tx.game || tx.method} • {tx.date}
                      </div>
                      <div className="text-xs text-gray-600 font-mono">{tx.txId}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : "-"}{tx.amount.toLocaleString()} VC
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deposit/Withdraw Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="luxury-card w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white">
                  {modal === "deposit" ? "💰 Deposit VC" : "↑ Withdraw VC"}
                </h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedMethod === m.id
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="text-xl mb-1">{m.icon}</div>
                    <div className="text-xs font-medium text-white">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.desc}</div>
                    <div className="text-xs text-yellow-400 mt-1">Fee: {m.fee}</div>
                  </button>
                ))}
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-2 block">Amount (VC)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
                <div className="flex gap-2 mt-2">
                  {[1000, 5000, 10000, 50000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(String(preset))}
                      className="flex-1 text-xs py-1 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors"
                    >
                      {preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {amount && (
                <div className="mb-4 p-3 bg-white/5 rounded-xl text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="text-white">{Number(amount).toLocaleString()} VC</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Fee</span>
                    <span className="text-white">
                      {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.fee}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 text-white font-bold">
                    <span>Total</span>
                    <span className="text-yellow-400">{Number(amount).toLocaleString()} VC</span>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl transition-all"
              >
                {modal === "deposit" ? "Confirm Deposit" : "Confirm Withdrawal"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
