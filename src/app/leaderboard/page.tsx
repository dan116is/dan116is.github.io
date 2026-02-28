"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const VIP_LEVELS = ["ALL", "DIAMOND", "PLATINUM", "GOLD", "SILVER"] as const;
type VipFilter = (typeof VIP_LEVELS)[number];

const VIP_COLORS: Record<string, string> = {
  SILVER: "text-gray-300 border-gray-400/30",
  GOLD: "text-yellow-400 border-yellow-500/30",
  PLATINUM: "text-cyan-300 border-cyan-400/30",
  DIAMOND: "text-blue-400 border-blue-500/30",
};

const VIP_BADGE_BG: Record<string, string> = {
  SILVER: "bg-gray-500/20",
  GOLD: "bg-yellow-500/20",
  PLATINUM: "bg-cyan-500/20",
  DIAMOND: "bg-blue-500/20",
};

type Category = "totalWon" | "winRate" | "biggestWin" | "wageredToday";

const CATEGORIES: { key: Category; label: string; icon: string; format: (v: number) => string }[] = [
  { key: "totalWon", label: "Total Won", icon: "🏆", format: (v) => `${v.toLocaleString()} VC` },
  { key: "winRate", label: "Win Rate", icon: "🎯", format: (v) => `${v}%` },
  { key: "biggestWin", label: "Biggest Win", icon: "⚡", format: (v) => `${v.toLocaleString()} VC` },
  { key: "wageredToday", label: "Wagered Today", icon: "📊", format: (v) => `${v.toLocaleString()} VC` },
];

const PLAYERS = [
  { rank: 1, username: "DiamondLord99", avatar: "💎", vip: "DIAMOND", totalWon: 2140000, winRate: 68.2, biggestWin: 980000, wageredToday: 450000, country: "🇺🇸", isOnline: true, gamesPlayed: 4821 },
  { rank: 2, username: "GoldRush_Z", avatar: "🏆", vip: "PLATINUM", totalWon: 1830000, winRate: 62.5, biggestWin: 750000, wageredToday: 310000, country: "🇬🇧", isOnline: true, gamesPlayed: 3980 },
  { rank: 3, username: "LuckyAce_7", avatar: "🎯", vip: "GOLD", totalWon: 1450000, winRate: 59.1, biggestWin: 620000, wageredToday: 180000, country: "🇩🇪", isOnline: false, gamesPlayed: 6200 },
  { rank: 4, username: "NightKing_V", avatar: "🦅", vip: "GOLD", totalWon: 1220000, winRate: 57.8, biggestWin: 490000, wageredToday: 220000, country: "🇫🇷", isOnline: true, gamesPlayed: 5100 },
  { rank: 5, username: "ShadowKing_X", avatar: "👑", vip: "GOLD", totalWon: 340200, winRate: 54.3, biggestWin: 75000, wageredToday: 92000, country: "🇮🇱", isOnline: true, gamesPlayed: 2200, isCurrentUser: true },
  { rank: 6, username: "CryptoWolf99", avatar: "🐺", vip: "PLATINUM", totalWon: 980000, winRate: 55.0, biggestWin: 380000, wageredToday: 145000, country: "🇯🇵", isOnline: false, gamesPlayed: 3400 },
  { rank: 7, username: "VegasQueen", avatar: "👸", vip: "DIAMOND", totalWon: 870000, winRate: 61.2, biggestWin: 420000, wageredToday: 280000, country: "🇦🇺", isOnline: true, gamesPlayed: 2900 },
  { rank: 8, username: "PokerFace_K", avatar: "🃏", vip: "GOLD", totalWon: 760000, winRate: 53.7, biggestWin: 290000, wageredToday: 95000, country: "🇨🇦", isOnline: false, gamesPlayed: 7100 },
  { rank: 9, username: "RoyalFlush_X", avatar: "♠️", vip: "SILVER", totalWon: 650000, winRate: 51.2, biggestWin: 220000, wageredToday: 60000, country: "🇧🇷", isOnline: true, gamesPlayed: 4600 },
  { rank: 10, username: "SlotMaster_9", avatar: "🎰", vip: "GOLD", totalWon: 540000, winRate: 49.8, biggestWin: 185000, wageredToday: 72000, country: "🇮🇳", isOnline: true, gamesPlayed: 8900 },
  { rank: 11, username: "BlueChip_E", avatar: "🔵", vip: "SILVER", totalWon: 430000, winRate: 48.5, biggestWin: 150000, wageredToday: 42000, country: "🇪🇸", isOnline: false, gamesPlayed: 3200 },
  { rank: 12, username: "LionHeart_F", avatar: "🦁", vip: "GOLD", totalWon: 390000, winRate: 52.0, biggestWin: 125000, wageredToday: 88000, country: "🇵🇹", isOnline: true, gamesPlayed: 2700 },
];

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const [vipFilter, setVipFilter] = useState<VipFilter>("ALL");
  const [category, setCategory] = useState<Category>("totalWon");

  const filteredAndSorted = PLAYERS
    .filter((p) => vipFilter === "ALL" || p.vip === vipFilter)
    .sort((a, b) => b[category] - a[category])
    .map((p, i) => ({ ...p, displayRank: i + 1 }));

  const categoryConfig = CATEGORIES.find((c) => c.key === category)!;
  const top3 = filteredAndSorted.slice(0, 3);

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/50 backdrop-blur-md">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <div className="text-yellow-400 font-bold">Leaderboard</div>
        <div className="text-sm text-gray-400">{PLAYERS.length} players</div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card p-6 mb-6 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-900/20 via-transparent to-blue-900/20 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-5xl mb-2">🏆</div>
            <h1 className="text-3xl font-black text-white mb-1">Virtual City Rankings</h1>
            <p className="text-gray-400 text-sm">The elite players who dominate the city's economy</p>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat.key
                  ? "bg-yellow-500 text-black"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* VIP Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {VIP_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setVipFilter(level)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                vipFilter === level
                  ? level === "ALL"
                    ? "bg-white text-black border-white"
                    : `${VIP_BADGE_BG[level]} ${VIP_COLORS[level]}`
                  : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {filteredAndSorted.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[top3[1], top3[0], top3[2]].map((player, podiumIdx) => {
              const podiumRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
              const heights = ["h-32", "h-40", "h-28"];
              const heightClass = heights[podiumIdx];
              return (
                <motion.div
                  key={player.username}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: podiumIdx * 0.1 }}
                  className={`luxury-card p-4 text-center flex flex-col justify-end ${heightClass} ${
                    player.isCurrentUser ? "border-yellow-500/50" : ""
                  }`}
                >
                  <div className="text-3xl mb-1">
                    {RANK_MEDALS[podiumRank] || `#${podiumRank}`}
                  </div>
                  <div className="text-2xl mb-1">{player.avatar}</div>
                  <div className="text-xs font-bold text-white truncate">{player.username}</div>
                  <div className={`text-xs font-bold mt-1 ${VIP_COLORS[player.vip]?.split(" ")[0]}`}>
                    {categoryConfig.format(player[category] as number)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{player.country}</div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="luxury-card overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">
              {categoryConfig.icon} Ranked by {categoryConfig.label}
            </h2>
            <div className="text-xs text-gray-500">{filteredAndSorted.length} players</div>
          </div>

          <div className="divide-y divide-white/5">
            {filteredAndSorted.map((player, i) => (
              <motion.div
                key={player.username}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-white/3 transition-colors ${
                  player.isCurrentUser ? "bg-yellow-500/5 border-l-2 border-l-yellow-500" : ""
                }`}
              >
                {/* Rank */}
                <div className={`w-10 text-center font-black text-sm ${
                  player.displayRank === 1 ? "text-yellow-400" :
                  player.displayRank === 2 ? "text-gray-300" :
                  player.displayRank === 3 ? "text-amber-600" : "text-gray-600"
                }`}>
                  {RANK_MEDALS[player.displayRank] || `#${player.displayRank}`}
                </div>

                {/* Avatar + Online */}
                <div className="relative">
                  <div className="text-2xl">{player.avatar}</div>
                  {player.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{player.username}</span>
                    {player.isCurrentUser && (
                      <span className="text-xs text-yellow-400">(You)</span>
                    )}
                    <span className="text-sm">{player.country}</span>
                  </div>
                  <div className="text-xs text-gray-500">{player.gamesPlayed.toLocaleString()} games played</div>
                </div>

                {/* VIP Badge */}
                <div className={`hidden sm:block text-xs font-bold px-2 py-0.5 rounded-full border ${VIP_BADGE_BG[player.vip]} ${VIP_COLORS[player.vip]}`}>
                  {player.vip}
                </div>

                {/* Stat */}
                <div className="text-right">
                  <div className={`text-sm font-black ${
                    player.displayRank <= 3 ? "text-yellow-400" : "text-white"
                  }`}>
                    {categoryConfig.format(player[category] as number)}
                  </div>
                  <div className="text-xs text-gray-500">{categoryConfig.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Your Position */}
        {PLAYERS.find(p => p.isCurrentUser) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 luxury-card p-4 border border-yellow-500/20"
          >
            <div className="text-xs text-yellow-400 font-semibold mb-2">Your Position</div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-black text-yellow-400">
                #{filteredAndSorted.find(p => p.isCurrentUser)?.displayRank ?? "N/A"}
              </div>
              <div className="flex-1 text-sm text-gray-400">
                You need <span className="text-white font-bold">
                  {(() => {
                    const myIdx = filteredAndSorted.findIndex(p => p.isCurrentUser);
                    if (myIdx <= 0) return "—";
                    const above = filteredAndSorted[myIdx - 1];
                    const me = filteredAndSorted[myIdx];
                    const diff = (above[category] as number) - (me[category] as number);
                    return categoryConfig.format(diff);
                  })()}
                </span> more to climb one rank
              </div>
              <Link
                href="/city/casino"
                className="px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg hover:bg-yellow-500/20 transition-all"
              >
                Play Now →
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
