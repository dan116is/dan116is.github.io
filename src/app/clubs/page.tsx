"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const CLUBS = [
  {
    id: "phantom",
    name: "The Phantom Syndicate",
    icon: "👻",
    tag: "PHANTOM",
    description: "Elite traders and high rollers. Invitation only.",
    members: 142,
    maxMembers: 200,
    minVip: "DIAMOND",
    totalWon: 8420000,
    weeklyRank: 1,
    isJoined: false,
    isPrivate: true,
    color: "border-purple-500/30 hover:border-purple-400/60",
    leader: "DiamondLord99",
    achievements: ["🏆 Season 1 Champions", "⚡ Most Active Club"],
  },
  {
    id: "golden",
    name: "Golden Eagles",
    icon: "🦅",
    tag: "EAGLES",
    description: "Gold and above players chasing glory together.",
    members: 387,
    maxMembers: 500,
    minVip: "GOLD",
    totalWon: 5120000,
    weeklyRank: 2,
    isJoined: true,
    isPrivate: false,
    color: "border-yellow-500/30 hover:border-yellow-400/60",
    leader: "NightKing_V",
    achievements: ["🥇 Top 3 Season 2"],
  },
  {
    id: "crypto",
    name: "CryptoWhales",
    icon: "🐋",
    tag: "WHALES",
    description: "Crypto enthusiasts and financial betting specialists.",
    members: 256,
    maxMembers: 300,
    minVip: "PLATINUM",
    totalWon: 4380000,
    weeklyRank: 3,
    isJoined: false,
    isPrivate: false,
    color: "border-cyan-500/30 hover:border-cyan-400/60",
    leader: "CryptoWolf99",
    achievements: ["📈 Best Finance Traders"],
  },
  {
    id: "knights",
    name: "Night Knights",
    icon: "🌙",
    tag: "KNIGHTS",
    description: "We dominate the city after midnight. Late night grinders.",
    members: 198,
    maxMembers: 250,
    minVip: "SILVER",
    totalWon: 2140000,
    weeklyRank: 4,
    isJoined: false,
    isPrivate: false,
    color: "border-indigo-500/30 hover:border-indigo-400/60",
    leader: "LuckyAce_7",
    achievements: ["🌙 Night Owl Badge"],
  },
  {
    id: "sharks",
    name: "Card Sharks",
    icon: "🦈",
    tag: "SHARKS",
    description: "Poker and blackjack specialists. Master card players.",
    members: 312,
    maxMembers: 400,
    minVip: "GOLD",
    totalWon: 3760000,
    weeklyRank: 5,
    isJoined: false,
    isPrivate: false,
    color: "border-blue-500/30 hover:border-blue-400/60",
    leader: "PokerFace_K",
    achievements: ["♠️ Poker Masters", "🃏 Card Game Dominators"],
  },
  {
    id: "newbies",
    name: "Rising Stars",
    icon: "⭐",
    tag: "RISING",
    description: "New players and beginners welcome. Learn and grow together.",
    members: 521,
    maxMembers: 1000,
    minVip: "SILVER",
    totalWon: 890000,
    weeklyRank: 8,
    isJoined: false,
    isPrivate: false,
    color: "border-green-500/30 hover:border-green-400/60",
    leader: "SlotMaster_9",
    achievements: [],
  },
];

const MY_CLUB = CLUBS.find(c => c.isJoined);

const CLUB_EVENTS = [
  { icon: "🏆", title: "Weekly Tournament", desc: "Top 10 players win bonus VC", prize: "500,000 VC", ends: "3 days" },
  { icon: "⚔️", title: "Club vs Club Battle", desc: "Eagles vs Sharks - most won this week", prize: "Club Points", ends: "5 days" },
  { icon: "🎲", title: "Slots Marathon", desc: "Play 500 slots rounds this week", prize: "25,000 VC", ends: "2 days" },
];

const VIP_COLORS: Record<string, string> = {
  SILVER: "text-gray-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  DIAMOND: "text-blue-400",
};

export default function ClubsPage() {
  const [search, setSearch] = useState("");
  const [joinedId, setJoinedId] = useState<string | null>(MY_CLUB?.id ?? null);
  const [activeTab, setActiveTab] = useState<"browse" | "my-club" | "events">("browse");

  const filtered = CLUBS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tag.toLowerCase().includes(search.toLowerCase())
  );

  const handleJoin = (clubId: string) => {
    if (joinedId === clubId) {
      setJoinedId(null);
    } else {
      setJoinedId(clubId);
    }
  };

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/50 backdrop-blur-md">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <div className="text-yellow-400 font-bold">Clubs</div>
        <div className="text-xs text-gray-400">{CLUBS.length} clubs</div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card p-6 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-yellow-900/20 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">🏛️ City Clubs</h1>
              <p className="text-gray-400 text-sm">Join a club, compete together, and dominate the city</p>
            </div>
            <button className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-bold rounded-xl hover:bg-yellow-500/20 transition-all">
              + Create Club
            </button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(["browse", "my-club", "events"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === t ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t === "browse" ? "Browse Clubs" : t === "my-club" ? "My Club" : "Events"}
            </button>
          ))}
        </div>

        {/* Browse Tab */}
        {activeTab === "browse" && (
          <div>
            <div className="mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clubs..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((club, i) => {
                const isMyClub = joinedId === club.id;
                return (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`luxury-card p-5 border transition-all ${club.color} ${isMyClub ? "ring-1 ring-yellow-500/30" : ""}`}
                  >
                    {/* Club Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{club.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">{club.name}</span>
                            {club.isPrivate && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">🔒 Private</span>
                            )}
                            {isMyClub && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">Joined</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">#{club.tag} • Rank #{club.weeklyRank}</div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-3">{club.description}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Members", value: `${club.members}/${club.maxMembers}` },
                        { label: "Total Won", value: `${(club.totalWon / 1000000).toFixed(1)}M VC` },
                        { label: "Min VIP", value: club.minVip },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <div className={`text-xs font-bold ${s.label === "Min VIP" ? VIP_COLORS[s.value] ?? "text-white" : "text-white"}`}>
                            {s.value}
                          </div>
                          <div className="text-xs text-gray-600">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Member progress */}
                    <div className="h-1 bg-white/5 rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full"
                        style={{ width: `${(club.members / club.maxMembers) * 100}%` }}
                      />
                    </div>

                    {/* Leader */}
                    <div className="text-xs text-gray-500 mb-3">
                      Leader: <span className="text-gray-300">{club.leader}</span>
                    </div>

                    {/* Achievements */}
                    {club.achievements.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {club.achievements.map((a) => (
                          <span key={a} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleJoin(club.id)}
                      disabled={club.isPrivate && !isMyClub}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                        isMyClub
                          ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                          : club.isPrivate
                            ? "bg-white/5 text-gray-600 cursor-not-allowed"
                            : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                      }`}
                    >
                      {isMyClub ? "Leave Club" : club.isPrivate ? "Request Invite" : "Join Club →"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* My Club Tab */}
        {activeTab === "my-club" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {joinedId ? (() => {
              const club = CLUBS.find(c => c.id === joinedId)!;
              return (
                <div className="space-y-4">
                  <div className={`luxury-card p-6 border ${club.color}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-6xl">{club.icon}</div>
                      <div>
                        <h2 className="text-xl font-black text-white">{club.name}</h2>
                        <div className="text-sm text-gray-400">#{club.tag} • Weekly Rank #{club.weeklyRank}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="luxury-card p-3 text-center">
                        <div className="text-lg font-black text-yellow-400">{club.members}</div>
                        <div className="text-xs text-gray-500">Members</div>
                      </div>
                      <div className="luxury-card p-3 text-center">
                        <div className="text-lg font-black text-green-400">{(club.totalWon / 1000000).toFixed(1)}M</div>
                        <div className="text-xs text-gray-500">Total Won (VC)</div>
                      </div>
                      <div className="luxury-card p-3 text-center">
                        <div className="text-lg font-black text-blue-400">#{club.weeklyRank}</div>
                        <div className="text-xs text-gray-500">Weekly Rank</div>
                      </div>
                    </div>
                  </div>

                  <div className="luxury-card p-5">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Club Chat</h3>
                    <div className="h-32 bg-white/3 rounded-xl flex items-center justify-center text-gray-600 text-sm mb-3">
                      Chat messages will appear here...
                    </div>
                    <input
                      placeholder="Type a message..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                    />
                  </div>
                </div>
              );
            })() : (
              <div className="luxury-card p-12 text-center">
                <div className="text-5xl mb-4">🏛️</div>
                <div className="text-lg font-bold text-white mb-2">You haven't joined a club yet</div>
                <p className="text-sm text-gray-400 mb-6">Join a club to compete with other players and earn exclusive rewards</p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="px-6 py-2.5 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-all"
                >
                  Browse Clubs →
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {CLUB_EVENTS.map((event, i) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="luxury-card p-5 flex items-center gap-5"
              >
                <div className="text-4xl">{event.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-black text-white mb-1">{event.title}</div>
                  <div className="text-xs text-gray-400 mb-2">{event.desc}</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-yellow-400">🏆 Prize: {event.prize}</span>
                    <span className="text-gray-500">⏰ Ends in {event.ends}</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold rounded-xl hover:bg-yellow-500/20 transition-all flex-shrink-0">
                  Participate →
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
