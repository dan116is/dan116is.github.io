"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type ItemCategory = "all" | "CLOTHING" | "ACCESSORY" | "FOOTWEAR" | "HAT";
type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "EXCLUSIVE";

interface FashionItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  price: number;
  description: string;
  icon: string;
  isLimited?: boolean;
  totalSupply?: number;
  soldCount?: number;
}

const RARITY_COLORS: Record<Rarity, { text: string; bg: string; border: string }> = {
  COMMON:    { text: "text-gray-400",   bg: "bg-gray-800",    border: "border-gray-600" },
  UNCOMMON:  { text: "text-green-400",  bg: "bg-green-900/20", border: "border-green-600" },
  RARE:      { text: "text-blue-400",   bg: "bg-blue-900/20",  border: "border-blue-600" },
  EPIC:      { text: "text-purple-400", bg: "bg-purple-900/20", border: "border-purple-600" },
  LEGENDARY: { text: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-600" },
  EXCLUSIVE: { text: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-500" },
};

const ITEMS: FashionItem[] = [
  { id: "i1", name: "City Founder Jacket", category: "CLOTHING", rarity: "EXCLUSIVE", price: 15000, description: "Worn only by city founders. Never to be re-released.", icon: "🧥", isLimited: true, totalSupply: 100, soldCount: 87 },
  { id: "i2", name: "Casino Royale Suit", category: "CLOTHING", rarity: "LEGENDARY", price: 8000, description: "Tailored for high-roller nights.", icon: "🤵", isLimited: false },
  { id: "i3", name: "Neon Runner Shoes", category: "FOOTWEAR", rarity: "EPIC", price: 2500, description: "Glow-in-the-dark soles for nightclub life.", icon: "👟" },
  { id: "i4", name: "Diamond Earrings", category: "ACCESSORY", rarity: "LEGENDARY", price: 6000, description: "12-carat virtual diamonds.", icon: "💍", isLimited: true, totalSupply: 500, soldCount: 412 },
  { id: "i5", name: "Gold Snapback", category: "HAT", rarity: "RARE", price: 900, description: "24K gold thread embroidery.", icon: "🧢" },
  { id: "i6", name: "VIP Sunglasses", category: "ACCESSORY", rarity: "RARE", price: 1200, description: "See the city in gold tint.", icon: "🕶️" },
  { id: "i7", name: "Silk Kimono", category: "CLOTHING", rarity: "EPIC", price: 4200, description: "Traditional meets futuristic.", icon: "👘" },
  { id: "i8", name: "Combat Boots", category: "FOOTWEAR", rarity: "UNCOMMON", price: 650, description: "Built for city exploration.", icon: "🥾" },
  { id: "i9", name: "Platinum Chain", category: "ACCESSORY", rarity: "EPIC", price: 3800, description: "Heavyweight statement piece.", icon: "⛓️", isLimited: true, totalSupply: 250, soldCount: 178 },
  { id: "i10", name: "Beach Hat", category: "HAT", rarity: "COMMON", price: 150, description: "Perfect for the golden shore.", icon: "👒" },
  { id: "i11", name: "Stealth Hoodie", category: "CLOTHING", rarity: "UNCOMMON", price: 400, description: "Dark mode activated.", icon: "🎽" },
  { id: "i12", name: "City Crown", category: "HAT", rarity: "EXCLUSIVE", price: 25000, description: "Reserved for city royalty. Status symbol above all.", icon: "👑", isLimited: true, totalSupply: 10, soldCount: 7 },
];

const PLATFORM_MARKUP = 0.10;

export default function FashionPage() {
  const [category, setCategory] = useState<ItemCategory>("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [balance] = useState(50000);
  const [selected, setSelected] = useState<FashionItem | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());

  const filtered = ITEMS
    .filter((i) => category === "all" || i.category === category)
    .filter((i) => rarity === "all" || i.rarity === rarity);

  function purchase(item: FashionItem) {
    if (owned.has(item.id)) return;
    setOwned((prev) => new Set([...prev, item.id]));
    setSelected(null);
  }

  return (
    <div className="min-h-screen city-bg">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city" className="text-gray-400 hover:text-white text-sm">← City Map</a>
        <div className="text-yellow-400 font-bold">Fashion District</div>
        <div className="text-sm text-yellow-400 font-bold">{balance.toLocaleString()} VC</div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gold-gradient mb-2">Fashion District</h1>
          <p className="text-gray-400">Exclusive wearables for your avatar. Rare items grant elevated social status.</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {(["all", "CLOTHING", "ACCESSORY", "FOOTWEAR", "HAT"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === c ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {c === "all" ? "All" : c.charAt(0) + c.slice(1).toLowerCase()}
            </button>
          ))}
          <div className="w-px bg-white/10" />
          {(["all", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "EXCLUSIVE"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRarity(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                rarity === r
                  ? "bg-yellow-500 text-black border-yellow-500"
                  : r === "all"
                  ? "bg-white/5 border-white/10 text-gray-400"
                  : `${RARITY_COLORS[r as Rarity].text} ${RARITY_COLORS[r as Rarity].border} bg-transparent hover:opacity-80`
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Limited items banner */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-8">
          {ITEMS.filter((i) => i.isLimited).map((item) => {
            const remaining = (item.totalSupply ?? 0) - (item.soldCount ?? 0);
            return (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                className="flex-shrink-0 flex items-center gap-3 bg-gradient-to-r from-red-900/30 to-red-700/10 border border-red-500/30 rounded-xl px-4 py-3 cursor-pointer hover:border-red-500/60"
              >
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <div className="text-xs text-red-400 font-bold">LIMITED — {remaining} LEFT</div>
                  <div className="text-sm font-bold text-white">{item.name}</div>
                  <div className="text-xs text-yellow-400">{Math.round(item.price * (1 + PLATFORM_MARKUP)).toLocaleString()} VC</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((item, i) => {
            const rarityStyle = RARITY_COLORS[item.rarity];
            const isOwned = owned.has(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(item)}
                className={`luxury-card p-4 cursor-pointer group hover:scale-105 transition-all duration-200 border ${rarityStyle.border} ${isOwned ? "opacity-60" : ""}`}
              >
                <div className="text-4xl mb-3 text-center">{item.icon}</div>
                <div className="text-sm font-bold text-white mb-1 truncate">{item.name}</div>
                <div className={`text-xs mb-2 font-bold ${rarityStyle.text}`}>{item.rarity}</div>
                {item.isLimited && (
                  <div className="text-xs text-red-400 mb-1">
                    {(item.totalSupply ?? 0) - (item.soldCount ?? 0)} / {item.totalSupply} left
                  </div>
                )}
                <div className="text-sm font-bold text-yellow-400">
                  {isOwned ? "✓ Owned" : `${Math.round(item.price * (1 + PLATFORM_MARKUP)).toLocaleString()} VC`}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`luxury-card p-8 max-w-md w-full border ${RARITY_COLORS[selected.rarity].border}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-7xl mb-4">{selected.icon}</div>
              <h2 className="text-2xl font-black text-white">{selected.name}</h2>
              <div className={`text-sm font-bold mt-1 ${RARITY_COLORS[selected.rarity].text}`}>
                {selected.rarity} · {selected.category}
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-6 text-center">{selected.description}</p>

            {selected.isLimited && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 mb-6 text-center">
                <div className="text-red-400 text-sm font-bold">Limited Edition</div>
                <div className="text-xs text-gray-400">
                  {(selected.totalSupply ?? 0) - (selected.soldCount ?? 0)} of {selected.totalSupply} remaining
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-4 mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Price</span>
                <span className="text-white">{selected.price.toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Platform Markup (10%)</span>
                <span className="text-gray-400">{Math.round(selected.price * PLATFORM_MARKUP).toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span className="text-yellow-400 text-xl">{Math.round(selected.price * (1 + PLATFORM_MARKUP)).toLocaleString()} VC</span>
              </div>
            </div>

            <button
              onClick={() => purchase(selected)}
              disabled={
                owned.has(selected.id) ||
                balance < selected.price * (1 + PLATFORM_MARKUP)
              }
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl disabled:opacity-50 text-lg"
            >
              {owned.has(selected.id) ? "Already Owned" :
               balance < selected.price * (1 + PLATFORM_MARKUP) ? "Insufficient Balance" :
               "Purchase Item"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
