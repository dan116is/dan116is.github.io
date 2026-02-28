"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Category = "all" | "CLOTHING" | "ACCESSORY" | "FOOTWEAR" | "RARE";

interface Listing {
  id: string;
  name: string;
  category: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "EXCLUSIVE";
  price: number;
  seller: string;
  sellerVip: string;
  image: string;
  isHot?: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  COMMON: "text-gray-400 border-gray-600",
  UNCOMMON: "text-green-400 border-green-600",
  RARE: "text-blue-400 border-blue-600",
  EPIC: "text-purple-400 border-purple-600",
  LEGENDARY: "text-orange-400 border-orange-600",
  EXCLUSIVE: "text-yellow-400 border-yellow-500",
};

const MOCK_LISTINGS: Listing[] = [
  { id: "1", name: "Diamond Crown", category: "ACCESSORY", rarity: "EXCLUSIVE", price: 25000, seller: "VIPKing", sellerVip: "DIAMOND", image: "👑", isHot: true },
  { id: "2", name: "Gold Tuxedo", category: "CLOTHING", rarity: "LEGENDARY", price: 8500, seller: "FashionLord", sellerVip: "PLATINUM", image: "🤵", isHot: true },
  { id: "3", name: "Crystal Sneakers", category: "FOOTWEAR", rarity: "EPIC", price: 3200, seller: "StreetKing", sellerVip: "GOLD", image: "👟" },
  { id: "4", name: "Dragon Jacket", category: "CLOTHING", rarity: "RARE", price: 1800, seller: "DragonFire", sellerVip: "SILVER", image: "🧥" },
  { id: "5", name: "Platinum Watch", category: "ACCESSORY", rarity: "LEGENDARY", price: 12000, seller: "TimePiece", sellerVip: "PLATINUM", image: "⌚", isHot: true },
  { id: "6", name: "City Hoodie", category: "CLOTHING", rarity: "UNCOMMON", price: 450, seller: "UrbanStyle", sellerVip: "STANDARD", image: "🎽" },
  { id: "7", name: "VIP Sunglasses", category: "ACCESSORY", rarity: "RARE", price: 2100, seller: "CoolDude", sellerVip: "GOLD", image: "🕶️" },
  { id: "8", name: "Casino Chips Bag", category: "ACCESSORY", rarity: "UNCOMMON", price: 600, seller: "PokerFace", sellerVip: "SILVER", image: "👜" },
  { id: "9", name: "Racing Gloves", category: "ACCESSORY", rarity: "RARE", price: 980, seller: "SpeedRacer", sellerVip: "GOLD", image: "🧤" },
  { id: "10", name: "Silk Dress", category: "CLOTHING", rarity: "EPIC", price: 4500, seller: "Elegance", sellerVip: "PLATINUM", image: "👗" },
  { id: "11", name: "Neon Boots", category: "FOOTWEAR", rarity: "RARE", price: 1450, seller: "NeonCity", sellerVip: "SILVER", image: "🥾" },
  { id: "12", name: "Mystery Box", category: "RARE", rarity: "LEGENDARY", price: 5000, seller: "MysteryShop", sellerVip: "DIAMOND", image: "📦", isHot: true },
];

const VIP_ICONS: Record<string, string> = {
  STANDARD: "",
  SILVER: "🥈",
  GOLD: "🥇",
  PLATINUM: "💎",
  DIAMOND: "💠",
};

export default function MarketplacePage() {
  const [category, setCategory] = useState<Category>("all");
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc">("recent");
  const [search, setSearch] = useState("");
  const [balance] = useState(50000);
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);

  const platformFee = 0.05;

  const filtered = MOCK_LISTINGS
    .filter((l) => category === "all" || l.category === category)
    .filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return 0;
    });

  return (
    <div className="min-h-screen city-bg">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city" className="text-gray-400 hover:text-white text-sm">← City Map</a>
        <div className="text-yellow-400 font-bold">Marketplace</div>
        <div className="text-sm text-yellow-400 font-bold">{balance.toLocaleString()} VC</div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gold-gradient mb-2">Player Marketplace</h1>
          <p className="text-gray-400">Trade rare items. Platform takes 5% commission on all sales.</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
          />

          <div className="flex gap-2 flex-wrap">
            {(["all", "CLOTHING", "ACCESSORY", "FOOTWEAR", "RARE"] as Category[]).map((c) => (
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
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
          >
            <option value="recent" className="bg-gray-900">Most Recent</option>
            <option value="price_asc" className="bg-gray-900">Price: Low to High</option>
            <option value="price_desc" className="bg-gray-900">Price: High to Low</option>
          </select>
        </div>

        {/* Hot Items Banner */}
        <div className="flex gap-4 overflow-x-auto pb-2 mb-6">
          {MOCK_LISTINGS.filter((l) => l.isHot).map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="flex-shrink-0 flex items-center gap-3 bg-gradient-to-r from-yellow-900/30 to-yellow-700/10 border border-yellow-500/30 rounded-xl px-4 py-3 cursor-pointer hover:border-yellow-500/60 transition-colors"
            >
              <span className="text-3xl">{item.image}</span>
              <div>
                <div className="text-xs text-yellow-500 font-bold">HOT</div>
                <div className="text-sm font-bold text-white">{item.name}</div>
                <div className="text-xs text-yellow-400">{item.price.toLocaleString()} VC</div>
              </div>
            </div>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedItem(item)}
              className={`luxury-card p-4 cursor-pointer group hover:scale-105 transition-all duration-200 border ${RARITY_COLORS[item.rarity]}`}
            >
              <div className="text-4xl mb-3 text-center">{item.image}</div>
              <div className="text-sm font-bold text-white mb-1 truncate">{item.name}</div>
              <div className={`text-xs mb-2 ${RARITY_COLORS[item.rarity].split(" ")[0]}`}>
                {item.rarity}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-yellow-400">{item.price.toLocaleString()}</div>
                <div className="text-xs text-gray-500">VC</div>
              </div>
              <div className="text-xs text-gray-600 mt-1 truncate">
                {VIP_ICONS[item.sellerVip]} {item.seller}
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            No items found matching your search
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-card p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-7xl mb-4">{selectedItem.image}</div>
              <h2 className="text-2xl font-black text-white">{selectedItem.name}</h2>
              <div className={`text-sm font-bold mt-1 ${RARITY_COLORS[selectedItem.rarity].split(" ")[0]}`}>
                {selectedItem.rarity}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Category</span>
                <span className="text-white capitalize">{selectedItem.category.toLowerCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Seller</span>
                <span className="text-white">{VIP_ICONS[selectedItem.sellerVip]} {selectedItem.seller}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Listed Price</span>
                <span className="text-white">{selectedItem.price.toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Platform Fee (5%)</span>
                <span className="text-gray-400">{Math.round(selectedItem.price * platformFee).toLocaleString()} VC</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mb-6">
              <div className="flex justify-between font-bold">
                <span className="text-white">You Pay</span>
                <span className="text-yellow-400 text-xl">{selectedItem.price.toLocaleString()} VC</span>
              </div>
            </div>

            <button
              disabled={balance < selectedItem.price}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl disabled:opacity-50 text-lg"
            >
              {balance < selectedItem.price ? "Insufficient Balance" : "Buy Now"}
            </button>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full py-2 text-gray-500 text-sm mt-2 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
