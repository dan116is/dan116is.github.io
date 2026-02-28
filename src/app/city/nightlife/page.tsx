"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Event {
  id: string;
  name: string;
  venue: string;
  type: string;
  date: string;
  time: string;
  entryFee: number;
  platformCut: number;
  capacity: number;
  filled: number;
  vipOnly: boolean;
  description: string;
  icon: string;
  performers?: string[];
}

const EVENTS: Event[] = [
  {
    id: "e1",
    name: "Diamond Gala 2025",
    venue: "Diamond Palace Ballroom",
    type: "VIP_GATHERING",
    date: "Saturday, March 15",
    time: "22:00",
    entryFee: 5000,
    platformCut: 0.10,
    capacity: 200,
    filled: 147,
    vipOnly: true,
    description: "The most exclusive gathering in VirtualCity. Black tie. Diamond members only.",
    icon: "💎",
    performers: ["DJ Luxe", "Virtual Orchestra"],
  },
  {
    id: "e2",
    name: "Beach Rave — Neon Night",
    venue: "Golden Shore Beach",
    type: "PARTY",
    date: "Friday, March 14",
    time: "23:00",
    entryFee: 500,
    platformCut: 0.10,
    capacity: 2000,
    filled: 1243,
    vipOnly: false,
    description: "Neon lights, ocean breeze, and the best beats. All welcome.",
    icon: "🌊",
    performers: ["DJ Neon Wave", "Bass Collective"],
  },
  {
    id: "e3",
    name: "Poker Grand Tournament",
    venue: "Grand Casino — Main Hall",
    type: "POKER_TOURNAMENT",
    date: "Sunday, March 16",
    time: "18:00",
    entryFee: 10000,
    platformCut: 0.10,
    capacity: 100,
    filled: 72,
    vipOnly: false,
    description: "Texas Hold'em championship. Top 3 split the prize pool minus 10% platform fee.",
    icon: "♠️",
    performers: [],
  },
  {
    id: "e4",
    name: "F1 City Grand Prix Watch Party",
    venue: "Sports Arena Skybox",
    type: "PARTY",
    date: "Sunday, March 16",
    time: "14:00",
    entryFee: 1500,
    platformCut: 0.10,
    capacity: 500,
    filled: 312,
    vipOnly: false,
    description: "Watch the race in style. Bet on the live race from your seat.",
    icon: "🏎️",
    performers: [],
  },
  {
    id: "e5",
    name: "Midnight Yacht Party",
    venue: "Marina — Azzam Elite",
    type: "PARTY",
    date: "Saturday, March 15",
    time: "00:00",
    entryFee: 8000,
    platformCut: 0.10,
    capacity: 60,
    filled: 48,
    vipOnly: true,
    description: "Private yacht experience on the virtual ocean. Platinum+ members only.",
    icon: "⛵",
    performers: ["Acoustic Duo", "DJ Waves"],
  },
  {
    id: "e6",
    name: "VirtualCity Racing Cup",
    venue: "City Expressway",
    type: "RACING",
    date: "Monday, March 17",
    time: "20:00",
    entryFee: 3000,
    platformCut: 0.10,
    capacity: 30,
    filled: 18,
    vipOnly: false,
    description: "Race your virtual vehicles through city streets. Prize pool: 60,000 VC.",
    icon: "🏁",
    performers: [],
  },
];

export default function NightlifePage() {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Event | null>(null);
  const [balance] = useState(50000);

  const filtered = EVENTS.filter(
    (e) => filter === "all" || e.type === filter
  );

  const spotsLeft = (e: Event) => e.capacity - e.filled;

  return (
    <div className="min-h-screen city-bg">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city" className="text-gray-400 hover:text-white text-sm">← City Map</a>
        <div className="text-yellow-400 font-bold">Beach & Nightlife</div>
        <div className="text-sm text-yellow-400 font-bold">{balance.toLocaleString()} VC</div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gold-gradient mb-2">Events & Nightlife</h1>
          <p className="text-gray-400">Exclusive parties, tournaments, and VIP gatherings. 10% platform fee on all events.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-8 flex-wrap justify-center">
          {[
            { key: "all", label: "All Events" },
            { key: "PARTY", label: "🎉 Parties" },
            { key: "VIP_GATHERING", label: "💎 VIP" },
            { key: "POKER_TOURNAMENT", label: "♠️ Tournaments" },
            { key: "RACING", label: "🏎️ Racing" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                filter === key ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelected(event)}
              className="luxury-card p-6 cursor-pointer group hover:scale-105 transition-all duration-300 hover:border-yellow-500/50"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{event.icon}</div>
                <div className="flex flex-col items-end gap-1">
                  {event.vipOnly && (
                    <span className="vip-badge">VIP ONLY</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    spotsLeft(event) < 20 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                  }`}>
                    {spotsLeft(event)} spots left
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{event.name}</h3>
              <p className="text-sm text-gray-500 mb-1">{event.venue}</p>
              <p className="text-xs text-gray-600 mb-4">{event.date} at {event.time}</p>

              {event.performers && event.performers.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {event.performers.map((p) => (
                    <span key={p} className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Capacity bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{event.filled} attending</span>
                  <span>{event.capacity} capacity</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      event.filled / event.capacity > 0.8 ? "bg-red-500" : "bg-green-500"
                    }`}
                    style={{ width: `${(event.filled / event.capacity) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-gray-500">Entry Fee</div>
                  <div className="text-xl font-black text-yellow-400">{event.entryFee.toLocaleString()} VC</div>
                </div>
                <div className="text-yellow-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Join →
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-card p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-5xl mb-2">{selected.icon}</div>
                <h2 className="text-2xl font-black text-white">{selected.name}</h2>
                <p className="text-gray-400 text-sm">{selected.venue}</p>
                <p className="text-gray-600 text-xs">{selected.date} at {selected.time}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-2xl">×</button>
            </div>

            <p className="text-gray-300 text-sm mb-6">{selected.description}</p>

            {selected.performers && selected.performers.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-gray-500 mb-2">Performers</div>
                <div className="flex flex-wrap gap-2">
                  {selected.performers.map((p) => (
                    <span key={p} className="bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Entry Fee</span>
                <span className="text-white">{selected.entryFee.toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Platform Cut ({(selected.platformCut * 100).toFixed(0)}%)</span>
                <span className="text-gray-400">{Math.round(selected.entryFee * selected.platformCut).toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Spots Remaining</span>
                <span className={spotsLeft(selected) < 20 ? "text-red-400 font-bold" : "text-green-400"}>
                  {spotsLeft(selected)}
                </span>
              </div>
            </div>

            <button
              disabled={
                balance < selected.entryFee ||
                spotsLeft(selected) <= 0 ||
                (selected.vipOnly)
              }
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl disabled:opacity-50 text-lg"
            >
              {spotsLeft(selected) <= 0 ? "Sold Out" :
               selected.vipOnly ? "VIP Members Only" :
               balance < selected.entryFee ? "Insufficient Balance" :
               "Join Event"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
