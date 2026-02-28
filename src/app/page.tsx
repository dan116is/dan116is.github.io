"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const DISTRICTS = [
  {
    id: "casino",
    name: "Casino District",
    nameHe: "רובע הקזינו",
    description: "Roulette, Blackjack, Poker, Slots & Live Dealers",
    icon: "🎰",
    color: "from-red-900 to-red-700",
    border: "border-red-500/30",
    href: "/city/casino",
  },
  {
    id: "sports",
    name: "Sports Arena",
    nameHe: "מתחם הספורט",
    description: "Football, Basketball, Golf & Live Betting",
    icon: "⚽",
    color: "from-green-900 to-green-700",
    border: "border-green-500/30",
    href: "/city/sports",
  },
  {
    id: "finance",
    name: "Financial Hub",
    nameHe: "רובע הפיננסים",
    description: "Binary Predictions on Markets, Crypto & Forex",
    icon: "📈",
    color: "from-blue-900 to-blue-700",
    border: "border-blue-500/30",
    href: "/city/finance",
  },
  {
    id: "realestate",
    name: "Real Estate",
    nameHe: "הנדל״ן",
    description: "Apartments, Penthouses, Villas & Beach Properties",
    icon: "🏙️",
    color: "from-yellow-900 to-yellow-700",
    border: "border-yellow-500/30",
    href: "/city/realestate",
  },
  {
    id: "showroom",
    name: "Luxury Showroom",
    nameHe: "מתחם הרכבים",
    description: "Sports Cars, Motorcycles, Yachts & Helicopters",
    icon: "🏎️",
    color: "from-purple-900 to-purple-700",
    border: "border-purple-500/30",
    href: "/city/showroom",
  },
  {
    id: "fashion",
    name: "Fashion District",
    nameHe: "רובע האופנה",
    description: "Exclusive Clothing, Accessories & Rare Items",
    icon: "👔",
    color: "from-pink-900 to-pink-700",
    border: "border-pink-500/30",
    href: "/city/fashion",
  },
  {
    id: "nightlife",
    name: "Beach & Nightlife",
    nameHe: "רצועת החוף",
    description: "Clubs, VIP Events, Parties & Live Entertainment",
    icon: "🌊",
    color: "from-cyan-900 to-cyan-700",
    border: "border-cyan-500/30",
    href: "/city/nightlife",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    nameHe: "מרקטפלייס",
    description: "Player-to-Player Trading with Platform Security",
    icon: "🏪",
    color: "from-orange-900 to-orange-700",
    border: "border-orange-500/30",
    href: "/city/marketplace",
  },
];

const STATS = [
  { label: "Active Players", value: "127K+", icon: "👤" },
  { label: "Daily Volume", value: "$2.4M+", icon: "💰" },
  { label: "Games Played Today", value: "340K+", icon: "🎮" },
  { label: "Jackpot Pool", value: "$180K", icon: "🏆" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen city-bg">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-screen flex flex-col items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 pointer-events-none" />

        {/* Animated background dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-yellow-400/20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animation: "pulse 3s ease-in-out infinite",
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center z-10"
        >
          <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1 text-yellow-400 text-sm font-medium mb-6">
            The Premier Virtual Entertainment Destination
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-6">
            <span className="text-gold-gradient">VIRTUAL</span>
            <br />
            <span className="text-white">CITY</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A living, breathing 3D city with real-money gaming, exclusive real estate,
            luxury vehicles and a thriving digital economy. Identity-verified. 18+.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl text-lg hover:from-yellow-400 hover:to-yellow-500 transition-all neon-gold"
            >
              Enter the City
            </Link>
            <Link
              href="/city"
              className="px-8 py-4 bg-white/5 border border-white/20 text-white font-bold rounded-xl text-lg hover:bg-white/10 transition-all"
            >
              Explore 3D World
            </Link>
          </div>
        </motion.div>

        {/* Live stats banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 left-0 right-0 flex justify-center"
        >
          <div className="flex gap-8 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-yellow-400">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Districts Grid */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-black mb-4">
            <span className="text-gold-gradient">Explore The City</span>
          </h2>
          <p className="text-gray-400 text-lg">Eight distinct districts, endless possibilities</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DISTRICTS.map((district, i) => (
            <motion.div
              key={district.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={district.href}>
                <div
                  className={`luxury-card p-6 h-full cursor-pointer group hover:scale-105 transition-all duration-300 ${district.border} hover:border-yellow-500/50`}
                >
                  <div className={`text-4xl mb-4`}>{district.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{district.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{district.nameHe}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {district.description}
                  </p>
                  <div className="mt-4 text-yellow-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Enter →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gradient-to-b from-transparent to-black/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-3 text-gold-gradient">Verified & Secure</h3>
              <p className="text-gray-400">
                Full KYC with facial recognition and age verification. 18+ only.
                All transactions encrypted and audited.
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🎭</div>
              <h3 className="text-xl font-bold mb-3 text-gold-gradient">Live Your Avatar</h3>
              <p className="text-gray-400">
                Create a photorealistic 3D character. Dress, drive, and live your
                digital lifestyle in a dynamic virtual world.
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💎</div>
              <h3 className="text-xl font-bold mb-3 text-gold-gradient">Real Economy</h3>
              <p className="text-gray-400">
                Earn, trade, and spend real value. Deposit in USD, play with
                Virtual Coins, and withdraw your winnings anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <div className="text-2xl font-black text-gold-gradient mb-2">VIRTUAL CITY</div>
              <p className="text-gray-500 text-sm">
                For entertainment purposes. 18+ only. Gamble responsibly.
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/legal/responsible-gaming" className="hover:text-white transition-colors">Responsible Gaming</Link>
              <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} VirtualCity Platform. All rights reserved.
            Virtual Coins have no real-world monetary value outside the platform.
            Please gamble responsibly. If you have a gambling problem, call 1-800-522-4700.
          </div>
        </div>
      </footer>
    </main>
  );
}
