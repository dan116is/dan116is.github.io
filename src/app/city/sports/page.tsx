"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Sport = "all" | "football" | "basketball" | "tennis" | "golf" | "formula1";

interface SportEvent {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  status: "upcoming" | "live";
  homeScore?: number;
  awayScore?: number;
  odds: { home: number; draw: number; away: number };
  totalBets: number;
}

const MOCK_EVENTS: SportEvent[] = [
  {
    id: "1",
    sport: "football",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    league: "La Liga",
    startTime: "20:45",
    status: "upcoming",
    odds: { home: 2.1, draw: 3.4, away: 3.6 },
    totalBets: 124500,
  },
  {
    id: "2",
    sport: "football",
    homeTeam: "Man City",
    awayTeam: "Liverpool",
    league: "Premier League",
    startTime: "LIVE",
    status: "live",
    homeScore: 1,
    awayScore: 2,
    odds: { home: 3.8, draw: 4.2, away: 1.9 },
    totalBets: 287300,
  },
  {
    id: "3",
    sport: "basketball",
    homeTeam: "LA Lakers",
    awayTeam: "Golden State Warriors",
    league: "NBA",
    startTime: "02:00",
    status: "upcoming",
    odds: { home: 1.85, draw: 0, away: 2.05 },
    totalBets: 98700,
  },
  {
    id: "4",
    sport: "tennis",
    homeTeam: "Djokovic",
    awayTeam: "Alcaraz",
    league: "Wimbledon",
    startTime: "14:00",
    status: "live",
    homeScore: 1,
    awayScore: 2,
    odds: { home: 2.4, draw: 0, away: 1.65 },
    totalBets: 55200,
  },
  {
    id: "5",
    sport: "formula1",
    homeTeam: "Verstappen",
    awayTeam: "Hamilton",
    league: "F1 World Championship",
    startTime: "15:00",
    status: "upcoming",
    odds: { home: 1.6, draw: 0, away: 2.5 },
    totalBets: 72000,
  },
  {
    id: "6",
    sport: "golf",
    homeTeam: "Rory McIlroy",
    awayTeam: "Tiger Woods",
    league: "The Masters",
    startTime: "18:30",
    status: "upcoming",
    odds: { home: 2.2, draw: 0, away: 1.8 },
    totalBets: 34100,
  },
];

const SPORT_ICONS: Record<string, string> = {
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  golf: "⛳",
  formula1: "🏎️",
  boxing: "🥊",
};

export default function SportsPage() {
  const [selectedSport, setSelectedSport] = useState<Sport>("all");
  const [betSlip, setBetSlip] = useState<{
    eventId: string;
    selection: string;
    odds: number;
    team: string;
    matchup: string;
  }[]>([]);
  const [betAmounts, setBetAmounts] = useState<Record<string, number>>({});
  const [balance] = useState(50000);

  const filtered = MOCK_EVENTS.filter(
    (e) => selectedSport === "all" || e.sport === selectedSport
  );

  function addToBetSlip(event: SportEvent, selection: "home" | "draw" | "away") {
    const odds = event.odds[selection];
    const team =
      selection === "home"
        ? event.homeTeam
        : selection === "away"
        ? event.awayTeam
        : "Draw";

    setBetSlip((prev) => {
      const existing = prev.findIndex((b) => b.eventId === event.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { eventId: event.id, selection, odds, team, matchup: `${event.homeTeam} vs ${event.awayTeam}` };
        return updated;
      }
      return [...prev, { eventId: event.id, selection, odds, team, matchup: `${event.homeTeam} vs ${event.awayTeam}` }];
    });
  }

  function removeFromBetSlip(eventId: string) {
    setBetSlip((prev) => prev.filter((b) => b.eventId !== eventId));
    setBetAmounts((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }

  const totalStake = Object.values(betAmounts).reduce((a, b) => a + b, 0);
  const totalPotentialWin = betSlip.reduce((acc, b) => {
    const amount = betAmounts[b.eventId] ?? 0;
    return acc + amount * b.odds;
  }, 0);

  return (
    <div className="min-h-screen city-bg">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city" className="text-gray-400 hover:text-white text-sm">← City Map</a>
        <div className="text-yellow-400 font-bold">Sports Arena</div>
        <div className="text-sm text-yellow-400 font-bold">{balance.toLocaleString()} VC</div>
      </div>

      <div className="flex gap-6 max-w-7xl mx-auto px-6 py-6">
        {/* Events list */}
        <div className="flex-1">
          {/* Sport filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(["all", "football", "basketball", "tennis", "golf", "formula1"] as Sport[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSport(s)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedSport === s
                      ? "bg-yellow-500 text-black"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {s !== "all" && <span>{SPORT_ICONS[s]}</span>}
                  <span className="capitalize">{s === "all" ? "All Sports" : s}</span>
                </button>
              )
            )}
          </div>

          {/* Events */}
          <div className="space-y-4">
            {filtered.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="luxury-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span>{SPORT_ICONS[event.sport]}</span>
                    <span className="text-xs text-gray-500">{event.league}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.status === "live" && (
                      <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        LIVE
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{event.startTime}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <div className="font-bold text-white">{event.homeTeam}</div>
                    {event.status === "live" && (
                      <div className="text-2xl font-black text-yellow-400">{event.homeScore}</div>
                    )}
                  </div>
                  <div className="text-gray-500 px-4">vs</div>
                  <div className="text-center flex-1">
                    <div className="font-bold text-white">{event.awayTeam}</div>
                    {event.status === "live" && (
                      <div className="text-2xl font-black text-yellow-400">{event.awayScore}</div>
                    )}
                  </div>
                </div>

                {/* Odds buttons */}
                <div className={`grid gap-2 ${event.odds.draw > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {[
                    { key: "home" as const, label: event.homeTeam.split(" ").pop()! },
                    ...(event.odds.draw > 0 ? [{ key: "draw" as const, label: "Draw" }] : []),
                    { key: "away" as const, label: event.awayTeam.split(" ").pop()! },
                  ].map(({ key, label }) => {
                    const inSlip = betSlip.find(
                      (b) => b.eventId === event.id && b.selection === key
                    );
                    return (
                      <button
                        key={key}
                        onClick={() => addToBetSlip(event, key)}
                        className={`py-2 rounded-lg text-sm font-bold transition-all ${
                          inSlip
                            ? "bg-yellow-500 text-black"
                            : "bg-white/5 hover:bg-white/10 text-white"
                        }`}
                      >
                        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                        <div>{event.odds[key].toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 text-xs text-gray-600 text-right">
                  {event.totalBets.toLocaleString()} VC bet pool
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bet Slip */}
        <div className="w-72 flex-shrink-0">
          <div className="luxury-card p-4 sticky top-4">
            <h2 className="font-bold text-white mb-4 flex items-center justify-between">
              <span>Bet Slip</span>
              {betSlip.length > 0 && (
                <span className="bg-yellow-500 text-black text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {betSlip.length}
                </span>
              )}
            </h2>

            {betSlip.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Click on odds to add bets
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {betSlip.map((b) => (
                    <div key={b.eventId} className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xs text-gray-500 truncate max-w-40">{b.matchup}</div>
                          <div className="text-sm font-bold text-yellow-400">{b.team}</div>
                        </div>
                        <button
                          onClick={() => removeFromBetSlip(b.eventId)}
                          className="text-gray-500 hover:text-white text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">@ {b.odds.toFixed(2)}</span>
                        <input
                          type="number"
                          min="10"
                          placeholder="Amount"
                          value={betAmounts[b.eventId] ?? ""}
                          onChange={(e) =>
                            setBetAmounts((prev) => ({
                              ...prev,
                              [b.eventId]: Math.max(0, parseInt(e.target.value) || 0),
                            }))
                          }
                          className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-yellow-500/50"
                        />
                      </div>
                      {betAmounts[b.eventId] > 0 && (
                        <div className="text-xs text-green-400 text-right mt-1">
                          Win: {(betAmounts[b.eventId] * b.odds).toFixed(0)} VC
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-3 mb-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Stake</span>
                    <span className="text-white font-bold">{totalStake.toLocaleString()} VC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Potential Win</span>
                    <span className="text-green-400 font-bold">{Math.round(totalPotentialWin).toLocaleString()} VC</span>
                  </div>
                </div>

                <button
                  disabled={totalStake === 0 || totalStake > balance}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg disabled:opacity-50"
                >
                  Place Bet
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
