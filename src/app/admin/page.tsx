"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface RevenueData {
  period: string;
  totalRevenue: number;
  revenueBySource: { source: string; amount: number; transactions: number }[];
  dailyRevenue: { date: string; total: number }[];
  stats: {
    totalUsers: number;
    activeUsers24h: number;
    totalTransactions: number;
    totalVolume: number;
  };
}

const MOCK_DAILY = [
  { date: "Feb 22", total: 12400 },
  { date: "Feb 23", total: 18900 },
  { date: "Feb 24", total: 14200 },
  { date: "Feb 25", total: 22100 },
  { date: "Feb 26", total: 19800 },
  { date: "Feb 27", total: 31500 },
  { date: "Feb 28", total: 27300 },
];

const MOCK_SOURCES = [
  { source: "HOUSE_EDGE", amount: 48200, transactions: 3241 },
  { source: "MARKETPLACE_FEE", amount: 12800, transactions: 890 },
  { source: "SUBSCRIPTION", amount: 9400, transactions: 188 },
  { source: "TOURNAMENT_FEE", amount: 7600, transactions: 304 },
  { source: "REAL_ESTATE_MARKUP", amount: 5200, transactions: 42 },
  { source: "TRANSACTION_FEE", amount: 3100, transactions: 620 },
];

const RECENT_ERRORS = [
  { id: 1, message: "Payment gateway timeout", time: "2m ago", severity: "error" },
  { id: 2, message: "KYC service slow response (4.2s)", time: "14m ago", severity: "warning" },
  { id: 3, message: "Socket reconnect event — user abc123", time: "31m ago", severity: "info" },
  { id: 4, message: "Rate limit triggered — IP 192.168.1.100", time: "1h ago", severity: "warning" },
];

const SYSTEM_STATUS = [
  { name: "API Server", status: "operational", latency: "42ms" },
  { name: "Database", status: "operational", latency: "8ms" },
  { name: "Redis Cache", status: "operational", latency: "2ms" },
  { name: "WebSocket", status: "operational", latency: "18ms" },
  { name: "KYC Service", status: "degraded", latency: "4200ms" },
  { name: "Payment Gateway", status: "operational", latency: "210ms" },
];

export default function AdminDashboard() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [isAdmin, setIsAdmin] = useState(true); // mock admin check

  useEffect(() => {
    // Fetch real revenue data
    fetch(`/api/admin/revenue?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  // Mock live stats
  const liveStats = {
    activeSessions: 1847,
    totalBetsToday: 9412,
    houseProfitToday: 31500,
    kycPending: 23,
    bannedUsers: 14,
    totalUsers: data?.stats.totalUsers ?? 18420,
  };

  const maxBar = Math.max(...MOCK_DAILY.map((d) => d.total));

  if (!isAdmin) {
    return (
      <div className="min-h-screen city-bg flex items-center justify-center">
        <div className="luxury-card p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">Admin privileges required.</p>
          <Link href="/city" className="text-yellow-400 hover:underline">
            Return to City
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10 bg-[#050510]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/city" className="text-gray-400 hover:text-white transition-colors text-sm">
            City Map
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-yellow-400 font-bold">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">System Operational</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Live Stats Row */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Live Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Active Sessions", value: liveStats.activeSessions.toLocaleString(), color: "text-green-400" },
              { label: "Bets Today", value: liveStats.totalBetsToday.toLocaleString(), color: "text-blue-400" },
              { label: "House Profit Today", value: `${liveStats.houseProfitToday.toLocaleString()} VC`, color: "text-yellow-400" },
              { label: "Total Users", value: liveStats.totalUsers.toLocaleString(), color: "text-white" },
              { label: "KYC Pending", value: liveStats.kycPending.toString(), color: "text-orange-400" },
              { label: "Banned Users", value: liveStats.bannedUsers.toString(), color: "text-red-400" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="luxury-card p-4"
              >
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Revenue Chart + Source Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="lg:col-span-2 luxury-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white">Revenue Overview</h3>
              <div className="flex gap-2">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      days === d
                        ? "bg-yellow-500 text-black"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Bar chart using divs */}
            <div className="flex items-end gap-2 h-40">
              {MOCK_DAILY.map((day, i) => {
                const height = (day.total / maxBar) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-yellow-400 font-medium">
                      {(day.total / 1000).toFixed(0)}k
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="w-full rounded-t bg-gradient-to-t from-yellow-600 to-yellow-400 min-h-[4px]"
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs text-gray-500 truncate w-full text-center">
                      {day.date.replace("Feb ", "")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-sm">
              <span className="text-gray-400">
                Total ({days}d):{" "}
                <span className="text-yellow-400 font-bold">
                  {loading
                    ? "..."
                    : `${((data?.totalRevenue ?? MOCK_DAILY.reduce((a, b) => a + b.total, 0)) / 1000).toFixed(1)}k VC`}
                </span>
              </span>
              <span className="text-gray-400">
                Avg/day:{" "}
                <span className="text-white font-medium">
                  {((MOCK_DAILY.reduce((a, b) => a + b.total, 0) / MOCK_DAILY.length) / 1000).toFixed(1)}k VC
                </span>
              </span>
            </div>
          </div>

          {/* Revenue by Source */}
          <div className="luxury-card p-6">
            <h3 className="font-bold text-white mb-4">Revenue by Source</h3>
            <div className="space-y-3">
              {MOCK_SOURCES.map((s) => {
                const total = MOCK_SOURCES.reduce((a, b) => a + b.amount, 0);
                const pct = ((s.amount / total) * 100).toFixed(1);
                return (
                  <div key={s.source}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">
                        {s.source.replace(/_/g, " ")}
                      </span>
                      <span className="text-yellow-400 font-medium">
                        {s.amount.toLocaleString()} VC
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                      />
                    </div>
                    <div className="text-right text-xs text-gray-600 mt-0.5">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/kyc">
              <div className="luxury-card p-5 cursor-pointer hover:border-yellow-500/50 transition-all group">
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                  Approve KYC
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {liveStats.kycPending} pending
                </div>
              </div>
            </Link>
            <Link href="/admin/users">
              <div className="luxury-card p-5 cursor-pointer hover:border-red-500/50 transition-all group">
                <div className="text-2xl mb-2">🚫</div>
                <div className="font-semibold text-white group-hover:text-red-400 transition-colors">
                  Ban User
                </div>
                <div className="text-xs text-gray-500 mt-1">User management</div>
              </div>
            </Link>
            <Link href="/admin/games">
              <div className="luxury-card p-5 cursor-pointer hover:border-blue-500/50 transition-all group">
                <div className="text-2xl mb-2">🎮</div>
                <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Game Config
                </div>
                <div className="text-xs text-gray-500 mt-1">House edge, limits</div>
              </div>
            </Link>
            <Link href="/admin/transactions">
              <div className="luxury-card p-5 cursor-pointer hover:border-green-500/50 transition-all group">
                <div className="text-2xl mb-2">💳</div>
                <div className="font-semibold text-white group-hover:text-green-400 transition-colors">
                  Transactions
                </div>
                <div className="text-xs text-gray-500 mt-1">Review withdrawals</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Platform Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <div className="luxury-card p-6">
            <h3 className="font-bold text-white mb-4">System Status</h3>
            <div className="space-y-3">
              {SYSTEM_STATUS.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s.status === "operational"
                          ? "bg-green-400"
                          : s.status === "degraded"
                          ? "bg-yellow-400 animate-pulse"
                          : "bg-red-400 animate-pulse"
                      }`}
                    />
                    <span className="text-sm text-gray-300">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.status === "operational"
                          ? "bg-green-500/10 text-green-400"
                          : s.status === "degraded"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="text-xs text-gray-500 w-16 text-right">{s.latency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="luxury-card p-6">
            <h3 className="font-bold text-white mb-4">Recent Errors</h3>
            <div className="space-y-3">
              {RECENT_ERRORS.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-3 bg-white/3 rounded-lg">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      e.severity === "error"
                        ? "bg-red-400"
                        : e.severity === "warning"
                        ? "bg-yellow-400"
                        : "bg-blue-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 truncate">{e.message}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{e.time}</div>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      e.severity === "error"
                        ? "bg-red-500/15 text-red-400"
                        : e.severity === "warning"
                        ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {e.severity}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-4 text-xs text-gray-500 hover:text-yellow-400 transition-colors">
              View all logs →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
