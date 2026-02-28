"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const MOCK_PROFILE = {
  username: "ShadowKing_X",
  displayName: "Shadow King",
  avatar: "👑",
  vipLevel: "GOLD",
  country: "🇮🇱",
  joinDate: "January 2023",
  bio: "Fortune favors the bold. All in or nothing.",
  totalWon: 340200,
  totalLost: 214770,
  gamesPlayed: 2200,
  winRate: 54.3,
  biggestWin: 75000,
  currentStreak: 3,
  longestStreak: 12,
  rank: 5,
};

const VIP_LEVELS = [
  { level: "SILVER", minWon: 0, color: "text-gray-300", bg: "bg-gray-500/20" },
  { level: "GOLD", minWon: 100000, color: "text-yellow-400", bg: "bg-yellow-500/20" },
  { level: "PLATINUM", minWon: 500000, color: "text-cyan-300", bg: "bg-cyan-500/20" },
  { level: "DIAMOND", minWon: 1000000, color: "text-blue-400", bg: "bg-blue-500/20" },
];

const ACHIEVEMENTS = [
  { id: 1, icon: "🎰", name: "Slot Machine Pro", description: "Win 100 slot spins", progress: 100, max: 100, unlocked: true, rarity: "Common", unlockedAt: "Jan 28" },
  { id: 2, icon: "🔥", name: "Hot Streak", description: "Win 10 games in a row", progress: 10, max: 10, unlocked: true, rarity: "Rare", unlockedAt: "Jan 27" },
  { id: 3, icon: "💰", name: "High Roller", description: "Wager 1M VC total", progress: 100, max: 100, unlocked: true, rarity: "Epic", unlockedAt: "Jan 25" },
  { id: 4, icon: "♠️", name: "Poker Legend", description: "Win 50 poker hands", progress: 38, max: 50, unlocked: false, rarity: "Epic", unlockedAt: null },
  { id: 5, icon: "🎯", name: "Sharpshooter", description: "Achieve 70% win rate over 200 games", progress: 54, max: 70, unlocked: false, rarity: "Legendary", unlockedAt: null },
  { id: 6, icon: "💎", name: "Diamond Hands", description: "Wager 10M VC total", progress: 306970, max: 10000000, unlocked: false, rarity: "Legendary", unlockedAt: null },
  { id: 7, icon: "🃏", name: "Card Shark", description: "Win 500 card games", progress: 312, max: 500, unlocked: false, rarity: "Rare", unlockedAt: null },
  { id: 8, icon: "🎡", name: "Roulette Master", description: "Play 1000 roulette rounds", progress: 780, max: 1000, unlocked: false, rarity: "Common", unlockedAt: null },
];

const GAME_STATS = [
  { game: "Blackjack", icon: "🃏", played: 620, winRate: 58.2, totalWon: 85000, totalLost: 42000 },
  { game: "Poker", icon: "♠️", played: 340, winRate: 62.1, totalWon: 142000, totalLost: 68000 },
  { game: "Slots", icon: "🎰", played: 890, winRate: 47.3, totalWon: 68000, totalLost: 72000 },
  { game: "Roulette", icon: "🎡", played: 210, winRate: 49.5, totalWon: 28000, totalLost: 22000 },
  { game: "Baccarat", icon: "🎴", played: 140, winRate: 53.6, totalWon: 17200, totalLost: 10770 },
];

const RARITY_COLORS: Record<string, string> = {
  Common: "text-gray-400",
  Rare: "text-blue-400",
  Epic: "text-purple-400",
  Legendary: "text-yellow-400",
};

type Tab = "overview" | "achievements" | "games";

const VIP_COLORS: Record<string, string> = {
  SILVER: "text-gray-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  DIAMOND: "text-blue-400",
};

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("overview");

  const currentVipIdx = VIP_LEVELS.findIndex((v) => v.level === MOCK_PROFILE.vipLevel);
  const nextVip = VIP_LEVELS[currentVipIdx + 1];
  const vipProgress = nextVip
    ? Math.min(100, ((MOCK_PROFILE.totalWon - VIP_LEVELS[currentVipIdx].minWon) / (nextVip.minWon - VIP_LEVELS[currentVipIdx].minWon)) * 100)
    : 100;

  const netPnL = MOCK_PROFILE.totalWon - MOCK_PROFILE.totalLost;

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/50 backdrop-blur-md">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <div className="text-yellow-400 font-bold">Profile</div>
        <Link href="/settings" className="text-xs text-gray-400 hover:text-white transition-colors">
          Settings ⚙️
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card p-6 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 text-center">
              <div className="text-8xl mb-2">{MOCK_PROFILE.avatar}</div>
              <div className={`text-sm font-bold vip-badge ${VIP_COLORS[MOCK_PROFILE.vipLevel]}`}>
                {MOCK_PROFILE.vipLevel}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-white">{MOCK_PROFILE.username}</h1>
                <span className="text-2xl">{MOCK_PROFILE.country}</span>
              </div>
              <div className="text-gray-400 text-sm mb-3">{MOCK_PROFILE.bio}</div>

              <div className="flex flex-wrap gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-500">Member since: </span>
                  <span className="text-gray-300">{MOCK_PROFILE.joinDate}</span>
                </div>
                <div>
                  <span className="text-gray-500">Rank: </span>
                  <span className="text-yellow-400 font-bold">#{MOCK_PROFILE.rank}</span>
                </div>
                <div>
                  <span className="text-gray-500">Current Streak: </span>
                  <span className="text-green-400 font-bold">🔥 {MOCK_PROFILE.currentStreak}</span>
                </div>
              </div>

              {/* VIP Progress */}
              {nextVip && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{MOCK_PROFILE.vipLevel}</span>
                    <span>{nextVip.level}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full transition-all"
                      style={{ width: `${vipProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {MOCK_PROFILE.totalWon.toLocaleString()} / {nextVip.minWon.toLocaleString()} VC to reach {nextVip.level}
                  </div>
                </div>
              )}
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-3 md:w-48">
              {[
                { label: "Win Rate", value: `${MOCK_PROFILE.winRate}%`, color: "text-green-400" },
                { label: "Games", value: MOCK_PROFILE.gamesPlayed.toLocaleString(), color: "text-blue-400" },
                { label: "Biggest Win", value: `${(MOCK_PROFILE.biggestWin / 1000).toFixed(0)}K`, color: "text-yellow-400" },
                { label: "Net P&L", value: `${netPnL > 0 ? "+" : ""}${(netPnL / 1000).toFixed(0)}K`, color: netPnL >= 0 ? "text-green-400" : "text-red-400" },
              ].map((stat) => (
                <div key={stat.label} className="luxury-card p-3 text-center">
                  <div className={`text-lg font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["overview", "achievements", "games"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                tab === t ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="luxury-card p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Lifetime Stats</h3>
              <div className="space-y-3">
                {[
                  { label: "Total Won", value: `${MOCK_PROFILE.totalWon.toLocaleString()} VC`, color: "text-green-400" },
                  { label: "Total Lost", value: `${MOCK_PROFILE.totalLost.toLocaleString()} VC`, color: "text-red-400" },
                  { label: "Net P&L", value: `${netPnL > 0 ? "+" : ""}${netPnL.toLocaleString()} VC`, color: netPnL >= 0 ? "text-green-400" : "text-red-400" },
                  { label: "Games Played", value: MOCK_PROFILE.gamesPlayed.toLocaleString(), color: "text-blue-400" },
                  { label: "Win Rate", value: `${MOCK_PROFILE.winRate}%`, color: "text-yellow-400" },
                  { label: "Biggest Win", value: `${MOCK_PROFILE.biggestWin.toLocaleString()} VC`, color: "text-yellow-400" },
                  { label: "Longest Win Streak", value: MOCK_PROFILE.longestStreak, color: "text-orange-400" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="luxury-card p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Achievements</h3>
              <div className="space-y-3">
                {ACHIEVEMENTS.filter(a => a.unlocked).slice(0, 5).map((ach) => (
                  <div key={ach.id} className="flex items-center gap-3">
                    <div className="text-2xl">{ach.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{ach.name}</div>
                      <div className="text-xs text-gray-500">{ach.description}</div>
                    </div>
                    <div className={`text-xs font-bold ${RARITY_COLORS[ach.rarity]}`}>{ach.rarity}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {tab === "achievements" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ACHIEVEMENTS.map((ach, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`luxury-card p-4 ${!ach.unlocked ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-3xl ${!ach.unlocked ? "grayscale" : ""}`}>{ach.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">{ach.name}</span>
                      <span className={`text-xs font-bold ${RARITY_COLORS[ach.rarity]}`}>{ach.rarity}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{ach.description}</div>
                    {ach.unlocked ? (
                      <div className="text-xs text-green-400">✓ Unlocked {ach.unlockedAt}</div>
                    ) : (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{typeof ach.progress === "number" && ach.progress > 1000
                            ? `${(ach.progress / 1000).toFixed(0)}K / ${(ach.max / 1000).toFixed(0)}K`
                            : `${ach.progress} / ${ach.max}`
                          }</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full"
                            style={{ width: `${(ach.progress / ach.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Games Tab */}
        {tab === "games" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="luxury-card overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-gray-300">Game Breakdown</h3>
            </div>
            <div className="divide-y divide-white/5">
              {GAME_STATS.map((game, i) => {
                const net = game.totalWon - game.totalLost;
                return (
                  <motion.div
                    key={game.game}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="px-4 py-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">{game.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{game.game}</span>
                          <span className={`text-sm font-bold ${net >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {net >= 0 ? "+" : ""}{net.toLocaleString()} VC
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500 mt-0.5">
                          <span>{game.played} games</span>
                          <span className="text-green-400">{game.winRate}% win rate</span>
                          <span className="text-green-400">Won: {game.totalWon.toLocaleString()}</span>
                          <span className="text-red-400">Lost: {game.totalLost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-300 rounded-full"
                        style={{ width: `${game.winRate}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
