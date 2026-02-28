"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const MOCK_USER = {
  username: "ShadowKing_X",
  vipLevel: "GOLD",
  avatar: "👑",
  balance: 125430,
  lockedBalance: 8000,
  totalWon: 340200,
  totalLost: 214770,
  gamesPlayedToday: 47,
  totalWageredToday: 92000,
  biggestWin: 75000,
  winRate: 54.3,
};

const RECENT_GAMES = [
  { id: 1, game: "Blackjack", icon: "🃏", bet: 500, outcome: "win", payout: 1000, time: "2m ago" },
  { id: 2, game: "Roulette", icon: "🎡", bet: 1000, outcome: "loss", payout: 0, time: "15m ago" },
  { id: 3, game: "Slots", icon: "🎰", bet: 200, outcome: "win", payout: 4800, time: "34m ago" },
  { id: 4, game: "Poker", icon: "♠️", bet: 2000, outcome: "win", payout: 5500, time: "1h ago" },
  { id: 5, game: "Baccarat", icon: "🎴", bet: 750, outcome: "loss", payout: 0, time: "2h ago" },
];

const ACTIVE_BETS = [
  { id: 1, type: "Sports", event: "Real Madrid vs Barcelona", selection: "Real Madrid", stake: 3000, odds: "2.1", potential: 6300, status: "live" },
  { id: 2, type: "Finance", event: "BTC/USD Prediction", selection: "Above $60k by EOD", stake: 1500, odds: "1.8", potential: 2700, status: "pending" },
];

const DISTRICTS = [
  { id: "casino", name: "Casino", icon: "🎰", href: "/city/casino", color: "border-red-500/30 hover:border-red-400/60" },
  { id: "sports", name: "Sports Arena", icon: "⚽", href: "/city/sports", color: "border-green-500/30 hover:border-green-400/60" },
  { id: "finance", name: "Financial Hub", icon: "📈", href: "/city/finance", color: "border-blue-500/30 hover:border-blue-400/60" },
  { id: "realestate", name: "Real Estate", icon: "🏙️", href: "/city/realestate", color: "border-yellow-500/30 hover:border-yellow-400/60" },
  { id: "showroom", name: "Showroom", icon: "🏎️", href: "/city/showroom", color: "border-purple-500/30 hover:border-purple-400/60" },
  { id: "fashion", name: "Fashion", icon: "👔", href: "/city/fashion", color: "border-pink-500/30 hover:border-pink-400/60" },
  { id: "nightlife", name: "Nightlife", icon: "🌊", href: "/city/nightlife", color: "border-cyan-500/30 hover:border-cyan-400/60" },
  { id: "marketplace", name: "Marketplace", icon: "🏪", href: "/city/marketplace", color: "border-orange-500/30 hover:border-orange-400/60" },
];

const LEADERBOARD_PREVIEW = [
  { rank: 1, username: "DiamondLord99", avatar: "💎", vip: "DIAMOND", totalWon: 2140000 },
  { rank: 2, username: "GoldRush_Z", avatar: "🏆", vip: "PLATINUM", totalWon: 1830000 },
  { rank: 3, username: "LuckyAce_7", avatar: "🎯", vip: "GOLD", totalWon: 1450000 },
  { rank: 4, username: "NightKing_V", avatar: "🦅", vip: "GOLD", totalWon: 1220000 },
  { rank: 5, username: "ShadowKing_X", avatar: "👑", vip: "GOLD", totalWon: 340200, isCurrentUser: true },
];

const RECENT_ACHIEVEMENTS = [
  { id: 1, icon: "🎰", name: "Slot Machine Pro", description: "Win 100 slot spins", unlockedAt: "Today" },
  { id: 2, icon: "🔥", name: "Hot Streak", description: "Win 10 games in a row", unlockedAt: "Yesterday" },
  { id: 3, icon: "💰", name: "High Roller", description: "Wager 1M VC total", unlockedAt: "3 days ago" },
];

const VIP_COLORS: Record<string, string> = {
  SILVER: "text-gray-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  DIAMOND: "text-blue-400",
};

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<"overview" | "bets" | "games">("overview");

  const netPnL = MOCK_USER.totalWon - MOCK_USER.totalLost;
  const isPnLPositive = netPnL >= 0;

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/50 backdrop-blur-md">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Home
        </Link>
        <div className="text-yellow-400 font-bold">Dashboard</div>
        <div className="flex items-center gap-3">
          <Link href="/wallet" className="text-sm text-gray-400 hover:text-yellow-400 transition-colors">
            {MOCK_USER.balance.toLocaleString()} VC
          </Link>
          <Link
            href="/wallet"
            className="text-xs px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-all"
          >
            Wallet
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card p-6 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-900/20 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-6xl">{MOCK_USER.avatar}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-white">{MOCK_USER.username}</h1>
                  <span className={`vip-badge ${VIP_COLORS[MOCK_USER.vipLevel]}`}>
                    {MOCK_USER.vipLevel}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Welcome back to Virtual City. Fortune favors the bold.</p>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-black text-yellow-400">{MOCK_USER.balance.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Available VC</div>
              </div>
              <div>
                <div className={`text-2xl font-black ${isPnLPositive ? "text-green-400" : "text-red-400"}`}>
                  {isPnLPositive ? "+" : ""}{netPnL.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Net P&L</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Wallet Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Balance", value: `${(MOCK_USER.balance + MOCK_USER.lockedBalance).toLocaleString()} VC`, sub: `$${((MOCK_USER.balance + MOCK_USER.lockedBalance) / 100).toFixed(2)} USD`, icon: "💰", color: "text-yellow-400" },
            { label: "Locked in Bets", value: `${MOCK_USER.lockedBalance.toLocaleString()} VC`, sub: "Active wagers", icon: "🔒", color: "text-orange-400" },
            { label: "Total Won", value: `${MOCK_USER.totalWon.toLocaleString()} VC`, sub: "All time", icon: "🏆", color: "text-green-400" },
            { label: "Total Lost", value: `${MOCK_USER.totalLost.toLocaleString()} VC`, sub: "All time", icon: "📉", color: "text-red-400" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="luxury-card p-4"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-1">{item.label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{item.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Games Played Today", value: MOCK_USER.gamesPlayedToday, icon: "🎮", color: "text-purple-400" },
            { label: "Total Wagered Today", value: `${MOCK_USER.totalWageredToday.toLocaleString()} VC`, icon: "📊", color: "text-blue-400" },
            { label: "Biggest Win", value: `${MOCK_USER.biggestWin.toLocaleString()} VC`, icon: "⚡", color: "text-yellow-400" },
            { label: "Win Rate", value: `${MOCK_USER.winRate}%`, icon: "🎯", color: "text-green-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="luxury-card p-4 text-center"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Recent Games */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {(["overview", "bets", "games"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSection(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeSection === tab
                      ? "bg-yellow-500 text-black"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {tab === "overview" ? "Recent Games" : tab === "bets" ? "Active Bets" : "All Games"}
                </button>
              ))}
            </div>

            {activeSection !== "bets" && (
              <div className="luxury-card overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300">Recent Games</h2>
                </div>
                {RECENT_GAMES.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{game.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{game.game}</div>
                        <div className="text-xs text-gray-500">{game.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Bet: {game.bet.toLocaleString()} VC</div>
                        {game.outcome === "win" && (
                          <div className="text-xs text-green-400">+{game.payout.toLocaleString()} VC</div>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          game.outcome === "win"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {game.outcome === "win" ? "WIN" : "LOSS"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeSection === "bets" && (
              <div className="luxury-card overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h2 className="text-sm font-semibold text-gray-300">Active Bets</h2>
                </div>
                {ACTIVE_BETS.map((bet, i) => (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="px-4 py-4 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full mr-2">{bet.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          bet.status === "live"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {bet.status === "live" ? "● LIVE" : "PENDING"}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-yellow-400">{bet.odds}x odds</div>
                    </div>
                    <div className="text-sm font-medium text-white mb-1">{bet.event}</div>
                    <div className="text-xs text-gray-400 mb-3">Selection: {bet.selection}</div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Stake: <span className="text-white">{bet.stake.toLocaleString()} VC</span></span>
                      <span>Potential: <span className="text-green-400">{bet.potential.toLocaleString()} VC</span></span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Leaderboard Preview + Achievements */}
          <div className="flex flex-col gap-6">
            {/* Leaderboard Preview */}
            <div className="luxury-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300">Top Players</h2>
                <Link href="/leaderboard" className="text-xs text-yellow-400 hover:text-yellow-300">
                  Full Rankings →
                </Link>
              </div>
              {LEADERBOARD_PREVIEW.map((player, i) => (
                <div
                  key={player.rank}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${
                    player.isCurrentUser ? "bg-yellow-500/5 border-l-2 border-l-yellow-500" : ""
                  }`}
                >
                  <div className={`text-sm font-black w-6 text-center ${
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${player.rank}`}
                  </div>
                  <div className="text-lg">{player.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {player.username}
                      {player.isCurrentUser && <span className="text-yellow-400 ml-1">(You)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{player.totalWon.toLocaleString()} VC won</div>
                  </div>
                  <span className={`vip-badge text-xs ${VIP_COLORS[player.vip]}`}>{player.vip}</span>
                </div>
              ))}
            </div>

            {/* Recent Achievements */}
            <div className="luxury-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300">Recent Achievements</h2>
                <Link href="/profile" className="text-xs text-yellow-400 hover:text-yellow-300">
                  View All →
                </Link>
              </div>
              {RECENT_ACHIEVEMENTS.map((ach, i) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
                >
                  <div className="text-2xl">{ach.icon}</div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">{ach.name}</div>
                    <div className="text-xs text-gray-500">{ach.description}</div>
                  </div>
                  <div className="text-xs text-yellow-500">{ach.unlockedAt}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links to Districts */}
        <div className="luxury-card p-6">
          <h2 className="text-lg font-bold mb-4 text-gold-gradient">Explore The City</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {DISTRICTS.map((district, i) => (
              <motion.div
                key={district.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={district.href}>
                  <div className={`luxury-card p-3 text-center cursor-pointer transition-all hover:scale-105 ${district.color}`}>
                    <div className="text-2xl mb-1">{district.icon}</div>
                    <div className="text-xs text-gray-400 leading-tight">{district.name}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
