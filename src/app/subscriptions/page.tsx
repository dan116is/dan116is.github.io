"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "free",
    name: "Street Level",
    icon: "🏙️",
    price: 0,
    vipLevel: "SILVER",
    color: "border-gray-500/30",
    activeColor: "border-gray-400/60 bg-gray-500/5",
    buttonColor: "bg-white/10 text-white hover:bg-white/20",
    features: [
      "Access to all basic games",
      "Standard leaderboard access",
      "1x daily bonus spin",
      "Basic chat access",
    ],
    excluded: [
      "VIP lounge access",
      "Priority withdrawals",
      "Private tables",
      "Dedicated account manager",
    ],
  },
  {
    id: "gold",
    name: "Gold Member",
    icon: "🥇",
    price: 9900,
    priceUsd: 99,
    vipLevel: "GOLD",
    color: "border-yellow-500/30",
    activeColor: "border-yellow-400/60 bg-yellow-500/5",
    buttonColor: "bg-yellow-500 text-black hover:bg-yellow-400",
    popular: true,
    features: [
      "Everything in Street Level",
      "3x daily bonus spins",
      "Gold VIP badge",
      "5% cashback on losses",
      "VIP lounge access",
      "Priority 24h withdrawals",
    ],
    excluded: [
      "Private high-roller tables",
      "Dedicated account manager",
    ],
  },
  {
    id: "platinum",
    name: "Platinum Elite",
    icon: "💎",
    price: 24900,
    priceUsd: 249,
    vipLevel: "PLATINUM",
    color: "border-cyan-500/30",
    activeColor: "border-cyan-400/60 bg-cyan-500/5",
    buttonColor: "bg-cyan-500 text-black hover:bg-cyan-400",
    features: [
      "Everything in Gold",
      "10x daily bonus spins",
      "Platinum VIP badge",
      "10% cashback on losses",
      "Private high-roller tables",
      "Instant withdrawals",
      "Monthly VC bonus (50,000 VC)",
    ],
    excluded: [
      "Dedicated account manager",
    ],
  },
  {
    id: "diamond",
    name: "Diamond Syndicate",
    icon: "💠",
    price: 99900,
    priceUsd: 999,
    vipLevel: "DIAMOND",
    color: "border-blue-500/30",
    activeColor: "border-blue-400/60 bg-blue-500/5",
    buttonColor: "bg-blue-500 text-white hover:bg-blue-400",
    features: [
      "Everything in Platinum",
      "Unlimited bonus spins",
      "Diamond VIP badge",
      "20% cashback on losses",
      "Dedicated account manager",
      "Custom withdrawal limits",
      "Monthly VC bonus (200,000 VC)",
      "Exclusive city events access",
      "Early access to new games",
    ],
    excluded: [],
  },
];

const CURRENT_PLAN = "gold";

const BILLING_HISTORY = [
  { date: "Jan 1, 2024", plan: "Gold Member", amount: 9900, status: "paid" },
  { date: "Dec 1, 2023", plan: "Gold Member", amount: 9900, status: "paid" },
  { date: "Nov 1, 2023", plan: "Gold Member", amount: 9900, status: "paid" },
];

const VIP_COLORS: Record<string, string> = {
  SILVER: "text-gray-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-300",
  DIAMOND: "text-blue-400",
};

export default function SubscriptionsPage() {
  const [billingTab, setBillingTab] = useState<"plans" | "billing">("plans");
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/50 backdrop-blur-md">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <div className="text-yellow-400 font-bold">VIP Subscriptions</div>
        <div className="text-xs text-gray-400">Current: <span className="text-yellow-400 font-bold">GOLD</span></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card p-8 mb-8 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-900/20 via-transparent to-blue-900/20 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-5xl mb-3">👑</div>
            <h1 className="text-3xl font-black text-white mb-2">Unlock Your Full Potential</h1>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Upgrade your VIP status and gain access to exclusive benefits, higher limits, and premium cashback rewards.
            </p>
          </div>
        </motion.div>

        {/* Tab Switch */}
        <div className="flex gap-2 mb-6">
          {(["plans", "billing"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setBillingTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                billingTab === t ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t === "plans" ? "VIP Plans" : "Billing History"}
            </button>
          ))}
        </div>

        {/* Plans */}
        {billingTab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLANS.map((plan, i) => {
              const isCurrentPlan = plan.id === CURRENT_PLAN;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`luxury-card p-5 flex flex-col border ${
                    isCurrentPlan ? plan.activeColor : plan.color
                  } transition-all relative`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-black px-3 py-1 rounded-full">
                      POPULAR
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-3 bg-green-500 text-black text-xs font-black px-3 py-1 rounded-full">
                      CURRENT
                    </div>
                  )}

                  <div className="text-4xl mb-3">{plan.icon}</div>
                  <div className="text-lg font-black text-white mb-1">{plan.name}</div>
                  <div className={`text-xs font-bold vip-badge mb-3 ${VIP_COLORS[plan.vipLevel]}`}>
                    {plan.vipLevel} TIER
                  </div>

                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <div className="text-2xl font-black text-white">Free</div>
                    ) : (
                      <div>
                        <span className="text-2xl font-black text-white">{plan.price.toLocaleString()} VC</span>
                        <span className="text-xs text-gray-500">/month</span>
                        <div className="text-xs text-gray-500">≈ ${plan.priceUsd}/mo USD</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 mb-5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-xs text-gray-300">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {plan.excluded.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-gray-700 mt-0.5 flex-shrink-0">✗</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => !isCurrentPlan && setConfirmPlan(plan.id)}
                    disabled={isCurrentPlan}
                    className={`w-full py-2.5 rounded-xl text-sm font-black transition-all ${
                      isCurrentPlan
                        ? "bg-white/5 text-gray-500 cursor-default"
                        : plan.buttonColor
                    }`}
                  >
                    {isCurrentPlan ? "Current Plan" : plan.price === 0 ? "Downgrade" : "Upgrade →"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Billing History */}
        {billingTab === "billing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="luxury-card overflow-hidden"
          >
            <div className="p-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-gray-300">Payment History</h2>
            </div>
            <div className="divide-y divide-white/5">
              {BILLING_HISTORY.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-white">{item.plan}</div>
                    <div className="text-xs text-gray-500">{item.date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-yellow-400">{item.amount.toLocaleString()} VC</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Confirm Upgrade Modal */}
        {confirmPlan && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmPlan(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="luxury-card w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const plan = PLANS.find(p => p.id === confirmPlan)!;
                return (
                  <>
                    <div className="text-4xl mb-3 text-center">{plan.icon}</div>
                    <h3 className="text-lg font-black text-white text-center mb-2">
                      Upgrade to {plan.name}?
                    </h3>
                    <p className="text-sm text-gray-400 text-center mb-6">
                      You will be charged {plan.price?.toLocaleString()} VC/month
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmPlan(null)}
                        className="flex-1 py-2.5 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setConfirmPlan(null)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${plan.buttonColor}`}
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
