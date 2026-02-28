"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface VehicleModel {
  id: string;
  name: string;
  brand: string;
  type: string;
  speed: number;
  style: number;
  price: number;
  icon: string;
  colors: string[];
  features: string[];
}

const VEHICLES: VehicleModel[] = [
  {
    id: "v1",
    name: "Venom GT",
    brand: "Hennessey",
    type: "SUPERCAR",
    speed: 98,
    style: 95,
    price: 350000,
    icon: "🏎️",
    colors: ["#FF2400", "#000000", "#FFFFFF", "#1a1a5c"],
    features: ["1600 HP", "0-60 in 2.4s", "Top 270 mph", "Carbon Fiber"],
  },
  {
    id: "v2",
    name: "Ghost II",
    brand: "Rolls-Royce",
    type: "LUXURY_SEDAN",
    speed: 72,
    style: 99,
    price: 280000,
    icon: "🚘",
    colors: ["#FFFFFF", "#C0C0C0", "#1C1C1C", "#8B4513"],
    features: ["V12 Engine", "Starlight Ceiling", "Bespoke Interior", "Self-Park"],
  },
  {
    id: "v3",
    name: "Panigale V4",
    brand: "Ducati",
    type: "MOTORCYCLE",
    speed: 90,
    style: 88,
    price: 120000,
    icon: "🏍️",
    colors: ["#CC0000", "#000000", "#FFFFFF"],
    features: ["230 HP", "Race-derived", "Electronic Suspension", "Winglets"],
  },
  {
    id: "v4",
    name: "Azzam Elite",
    brand: "Ocean Dreams",
    type: "YACHT",
    speed: 45,
    style: 97,
    price: 850000,
    icon: "⛵",
    colors: ["#FFFFFF", "#C0C0C0", "#1a2a6c"],
    features: ["180m Length", "Helicopter Pad", "Submarine Bay", "Staff of 60"],
  },
  {
    id: "v5",
    name: "Urus S",
    brand: "Lamborghini",
    type: "SUV",
    speed: 82,
    style: 90,
    price: 195000,
    icon: "🚙",
    colors: ["#FF6B00", "#2E7D32", "#1565C0", "#000000"],
    features: ["666 HP", "0-60 in 3.5s", "4 Seat Luxury", "Off-Road Mode"],
  },
  {
    id: "v6",
    name: "EC145 City",
    brand: "Airbus",
    type: "HELICOPTER",
    speed: 60,
    style: 92,
    price: 2500000,
    icon: "🚁",
    colors: ["#FFFFFF", "#000000", "#FFD700"],
    features: ["Luxury Interior", "City Landing", "9 Passengers", "Autopilot"],
  },
];

const PLATFORM_MARKUP = 0.12;

const TYPE_LABELS: Record<string, string> = {
  SUPERCAR: "Supercar",
  LUXURY_SEDAN: "Luxury Sedan",
  MOTORCYCLE: "Motorcycle",
  YACHT: "Yacht",
  SUV: "Sport SUV",
  HELICOPTER: "Helicopter",
};

export default function ShowroomPage() {
  const [selected, setSelected] = useState<VehicleModel | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [balance] = useState(50000);

  const filtered = VEHICLES.filter((v) => filter === "all" || v.type === filter);

  return (
    <div className="min-h-screen city-bg">
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <a href="/city" className="text-gray-400 hover:text-white text-sm">← City Map</a>
        <div className="text-yellow-400 font-bold">Luxury Showroom</div>
        <div className="text-sm text-yellow-400 font-bold">{balance.toLocaleString()} VC</div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gold-gradient mb-2">Luxury Showroom</h1>
          <p className="text-gray-400">Exclusive vehicles for the elite. Enhance your status and speed.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          {["all", "SUPERCAR", "LUXURY_SEDAN", "MOTORCYCLE", "YACHT", "SUV", "HELICOPTER"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "All Vehicles" : TYPE_LABELS[f] ?? f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((vehicle, i) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => { setSelected(vehicle); setSelectedColor(vehicle.colors[0]); }}
              className="luxury-card p-6 cursor-pointer group hover:scale-105 transition-all duration-300 hover:border-yellow-500/50"
            >
              {/* Vehicle display */}
              <div
                className="w-full h-40 rounded-xl mb-4 flex items-center justify-center text-7xl"
                style={{ background: `radial-gradient(ellipse at center, ${vehicle.colors[0]}22, transparent)` }}
              >
                {vehicle.icon}
              </div>

              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-black text-white">{vehicle.name}</h3>
                  <p className="text-sm text-gray-500">{vehicle.brand} · {TYPE_LABELS[vehicle.type]}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">Speed</div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${vehicle.speed}%` }}
                      />
                    </div>
                    <span className="text-xs text-white">{vehicle.speed}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">Style</div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${vehicle.style}%` }}
                      />
                    </div>
                    <span className="text-xs text-white">{vehicle.style}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1 mb-4">
                {vehicle.features.slice(0, 2).map((f) => (
                  <span key={f} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-2xl font-black text-yellow-400">
                    {Math.round(vehicle.price * (1 + PLATFORM_MARKUP)).toLocaleString()} VC
                  </div>
                </div>
                <div className="text-yellow-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  View →
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Vehicle Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-card p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full h-48 rounded-xl mb-6 flex items-center justify-center text-8xl relative overflow-hidden"
              style={{ background: `radial-gradient(ellipse at center, ${selectedColor ?? selected.colors[0]}44, transparent)` }}
            >
              <span className="relative z-10">{selected.icon}</span>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-black text-white">{selected.name}</h2>
                <p className="text-gray-400">{selected.brand} · {TYPE_LABELS[selected.type]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-2xl">×</button>
            </div>

            {/* Color selector */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">Color</div>
              <div className="flex gap-2">
                {selected.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === c ? "border-yellow-400 scale-110" : "border-transparent"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-2">Features</div>
              <div className="flex flex-wrap gap-2">
                {selected.features.map((f) => (
                  <span key={f} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Base Price</span>
                <span className="text-white">{selected.price.toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Platform Markup (12%)</span>
                <span className="text-white">{Math.round(selected.price * PLATFORM_MARKUP).toLocaleString()} VC</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span className="text-yellow-400 text-xl">{Math.round(selected.price * (1 + PLATFORM_MARKUP)).toLocaleString()} VC</span>
              </div>
            </div>

            <button
              disabled={balance < selected.price * (1 + PLATFORM_MARKUP)}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl disabled:opacity-50 text-lg"
            >
              {balance < selected.price * (1 + PLATFORM_MARKUP) ? "Insufficient Balance" : "Purchase Vehicle"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
