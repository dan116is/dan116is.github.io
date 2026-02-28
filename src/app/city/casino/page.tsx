"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const GAMES = [
  {
    id: "roulette",
    name: "Roulette",
    nameHe: "רולטה",
    description: "European Roulette — single zero, 2.7% house edge",
    icon: "🎡",
    minBet: 10,
    maxBet: 50000,
    players: 342,
    isLive: false,
    href: "/city/casino/roulette",
    tags: ["Classic", "European"],
  },
  {
    id: "blackjack",
    name: "Blackjack",
    nameHe: "בלאק ג׳ק",
    description: "6-deck shoe, dealer stands on soft 17, 3:2 blackjack",
    icon: "🃏",
    minBet: 25,
    maxBet: 100000,
    players: 518,
    isLive: true,
    href: "/city/casino/blackjack",
    tags: ["Live Dealer", "Classic"],
  },
  {
    id: "poker",
    name: "Texas Hold'em",
    nameHe: "פוקר",
    description: "Cash tables & tournaments with 5% rake (capped)",
    icon: "♠️",
    minBet: 50,
    maxBet: 500000,
    players: 1204,
    isLive: false,
    href: "/city/casino/poker",
    tags: ["Multiplayer", "Tournament"],
  },
  {
    id: "slots",
    name: "Slot Machines",
    nameHe: "מכונות מזל",
    description: "5-reel video slots, 95% RTP, progressive jackpots",
    icon: "🎰",
    minBet: 1,
    maxBet: 5000,
    players: 2891,
    isLive: false,
    href: "/city/casino/slots",
    tags: ["Jackpot", "Bonus Rounds"],
  },
  {
    id: "baccarat",
    name: "Baccarat",
    nameHe: "באקרה",
    description: "Punto Banco variant with live dealer streaming",
    icon: "🎴",
    minBet: 100,
    maxBet: 200000,
    players: 187,
    isLive: true,
    href: "/city/casino/baccarat",
    tags: ["Live Dealer", "VIP"],
  },
  {
    id: "vip_roulette",
    name: "VIP Roulette",
    nameHe: "רולטה VIP",
    description: "Private tables for Diamond & Platinum members",
    icon: "💎",
    minBet: 1000,
    maxBet: 500000,
    players: 23,
    isLive: true,
    href: "/city/casino/vip-roulette",
    tags: ["VIP", "Private", "Live"],
  },
];

const JACKPOTS = [
  { game: "Mega Slots", amount: 182430, currency: "VC" },
  { game: "Progressive Poker", amount: 94800, currency: "VC" },
  { game: "Diamond Jackpot", amount: 41200, currency: "VC" },
];

export default function CasinoPage() {
  const [filter, setFilter] = useState<"all" | "live" | "vip">("all");

  const filtered = GAMES.filter((g) => {
    if (filter === "live") return g.isLive;
    if (filter === "vip") return g.tags.includes("VIP");
    return true;
  });

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/city" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← City Map
        </Link>
        <div className="text-yellow-400 font-bold">Casino District</div>
        <div className="text-sm text-gray-500">Balance: 50,000 VC</div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden py-16 px-6 text-center">
        <div className="absolute inset-0 casino-felt opacity-20" />
        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black mb-4"
          >
            <span className="text-gold-gradient">GRAND CASINO</span>
          </motion.h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            World-class casino games with live dealers, private tables, and
            progressive jackpots. Fair play guaranteed.
          </p>
        </div>
      </div>

      {/* Jackpot Display */}
      <div className="flex gap-4 overflow-x-auto px-6 pb-4 justify-center">
        {JACKPOTS.map((j) => (
          <motion.div
            key={j.game}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex-shrink-0 bg-gradient-to-r from-yellow-900/40 to-yellow-700/20 border border-yellow-500/30 rounded-xl px-6 py-3 text-center"
          >
            <div className="text-xs text-yellow-500 uppercase tracking-widest mb-1">{j.game}</div>
            <div className="text-2xl font-black text-yellow-400">
              {j.amount.toLocaleString()} <span className="text-sm">VC</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex gap-3">
        {(["all", "live", "vip"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? "bg-yellow-500 text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {f === "all" ? "All Games" : f === "live" ? "Live Dealer" : "VIP Tables"}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="px-6 pb-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={game.href}>
                <div className="luxury-card p-6 h-full cursor-pointer group hover:scale-105 transition-all duration-300 hover:border-yellow-500/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{game.icon}</div>
                    <div className="flex flex-col items-end gap-1">
                      {game.isLive && (
                        <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          LIVE
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{game.players.toLocaleString()} playing</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{game.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{game.nameHe}</p>
                  <p className="text-sm text-gray-400 mb-4">{game.description}</p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {game.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Min: {game.minBet.toLocaleString()} VC</span>
                    <span>Max: {game.maxBet.toLocaleString()} VC</span>
                  </div>

                  <div className="mt-4 text-yellow-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Play Now →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
