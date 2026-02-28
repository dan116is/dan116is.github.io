"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Property {
  id: string;
  name: string;
  type: string;
  location: string;
  area: string;
  size: number;
  price: number;
  features: string[];
  isAvailable: boolean;
  beds?: number;
  baths?: number;
  image: string;
}

const PROPERTIES: Property[] = [
  {
    id: "p1",
    name: "Ocean View Penthouse",
    type: "PENTHOUSE",
    location: "North Beach Tower",
    area: "beachfront",
    size: 320,
    price: 250000,
    features: ["Private Pool", "360° View", "Rooftop Terrace", "Smart Home"],
    isAvailable: true,
    beds: 4,
    baths: 3,
    image: "🏙️",
  },
  {
    id: "p2",
    name: "Casino District Loft",
    type: "APARTMENT",
    location: "Grand Casino Tower",
    area: "city_center",
    size: 120,
    price: 85000,
    features: ["Casino Access", "Concierge", "Valet Parking"],
    isAvailable: true,
    beds: 2,
    baths: 1,
    image: "🏢",
  },
  {
    id: "p3",
    name: "Beachfront Villa",
    type: "VILLA",
    location: "Golden Shore",
    area: "beachfront",
    size: 650,
    price: 580000,
    features: ["Private Beach", "Infinity Pool", "Yacht Dock", "Staff Quarters", "Guest House"],
    isAvailable: true,
    beds: 6,
    baths: 5,
    image: "🏡",
  },
  {
    id: "p4",
    name: "VIP Suite",
    type: "CASINO_SUITE",
    location: "Diamond Palace Hotel",
    area: "vip_district",
    size: 180,
    price: 320000,
    features: ["Private Butler", "VIP Casino Access", "Helipad Access", "Sommelier"],
    isAvailable: true,
    beds: 3,
    baths: 2,
    image: "💎",
  },
  {
    id: "p5",
    name: "Sky Mansion",
    type: "MANSION",
    location: "Cloud Nine District",
    area: "vip_district",
    size: 1200,
    price: 1200000,
    features: ["Private Elevator", "Indoor Pool", "Cinema Room", "Wine Cellar", "Gym", "Staff Apartment"],
    isAvailable: true,
    beds: 8,
    baths: 6,
    image: "🏰",
  },
  {
    id: "p6",
    name: "Marina Condo",
    type: "APARTMENT",
    location: "Yacht Club Marina",
    area: "beachfront",
    size: 95,
    price: 62000,
    features: ["Boat Slip", "Sea View", "Pool Access"],
    isAvailable: false,
    beds: 2,
    baths: 1,
    image: "⛵",
  },
];

const TYPE_ICONS: Record<string, string> = {
  PENTHOUSE: "🌆",
  APARTMENT: "🏢",
  VILLA: "🏡",
  MANSION: "🏰",
  CASINO_SUITE: "💎",
};

export default function RealEstatePage() {
  const [filter, setFilter] = useState<"all" | "beachfront" | "city_center" | "vip_district">("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "size">("price_asc");
  const [selected, setSelected] = useState<Property | null>(null);
  const [balance] = useState(50000);

  const filtered = PROPERTIES
    .filter((p) => filter === "all" || p.area === filter)
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return b.size - a.size;
    });

  const platformMarkup = 0.15;

  return (
    <div className="min-h-screen city-bg">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city" className="text-gray-400 hover:text-white text-sm">← City Map</a>
        <div className="text-yellow-400 font-bold">Real Estate</div>
        <div className="text-sm text-yellow-400 font-bold">{balance.toLocaleString()} VC</div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gold-gradient mb-3">Luxury Real Estate</h1>
          <p className="text-gray-400">Own premium digital properties. Host private events. Build your empire.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 justify-between">
          <div className="flex gap-2 flex-wrap">
            {(["all", "beachfront", "city_center", "vip_district"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === f ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {f === "all" ? "All Locations" :
                 f === "beachfront" ? "🌊 Beachfront" :
                 f === "city_center" ? "🏙️ City Center" : "💎 VIP District"}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
          >
            <option value="price_asc" className="bg-gray-900">Price: Low to High</option>
            <option value="price_desc" className="bg-gray-900">Price: High to Low</option>
            <option value="size" className="bg-gray-900">Size: Largest First</option>
          </select>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property, i) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(property)}
              className={`luxury-card p-6 cursor-pointer group hover:scale-105 transition-all duration-300 hover:border-yellow-500/50 ${
                !property.isAvailable ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {/* Image placeholder */}
              <div className="w-full h-40 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl mb-4 flex items-center justify-center text-6xl">
                {property.image}
              </div>

              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-white text-lg">{property.name}</h3>
                  <p className="text-xs text-gray-500">{property.location}</p>
                </div>
                {!property.isAvailable && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Sold</span>
                )}
              </div>

              <div className="flex gap-3 text-sm text-gray-400 mb-4">
                <span>{property.size} m²</span>
                {property.beds && <span>🛏 {property.beds}</span>}
                {property.baths && <span>🛁 {property.baths}</span>}
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {property.features.slice(0, 3).map((f) => (
                  <span key={f} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
                    {f}
                  </span>
                ))}
                {property.features.length > 3 && (
                  <span className="text-xs text-gray-500">+{property.features.length - 3} more</span>
                )}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-xl font-black text-yellow-400">
                    {Math.round(property.price * (1 + platformMarkup)).toLocaleString()} VC
                  </div>
                </div>
                {property.isAvailable && (
                  <div className="text-yellow-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                    View →
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Property Detail Modal */}
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
                <div className="text-4xl mb-2">{selected.image}</div>
                <h2 className="text-2xl font-black text-white">{selected.name}</h2>
                <p className="text-gray-400">{selected.location}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">Size</div>
                <div className="font-bold text-white">{selected.size} m²</div>
              </div>
              {selected.beds && (
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-500">Bedrooms</div>
                  <div className="font-bold text-white">{selected.beds}</div>
                </div>
              )}
              {selected.baths && (
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-500">Bathrooms</div>
                  <div className="font-bold text-white">{selected.baths}</div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-sm text-gray-400 mb-2">Features</h3>
              <div className="flex flex-wrap gap-2">
                {selected.features.map((f) => (
                  <span key={f} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Base Price</span>
                <span className="text-white">{selected.price.toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Platform Fee (15%)</span>
                <span className="text-white">{Math.round(selected.price * platformMarkup).toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span className="text-yellow-400 text-xl">{Math.round(selected.price * (1 + platformMarkup)).toLocaleString()} VC</span>
              </div>
            </div>

            <button
              disabled={!selected.isAvailable || balance < selected.price * (1 + platformMarkup)}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl disabled:opacity-50 text-lg"
            >
              {!selected.isAvailable ? "Sold Out" :
               balance < selected.price * (1 + platformMarkup) ? "Insufficient Balance" :
               "Purchase Property"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
