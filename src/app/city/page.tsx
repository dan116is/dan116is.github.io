"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// 3D City Components
// ============================================================

function Building({
  position,
  size,
  height,
  color,
  emissive,
  label,
  onClick,
}: {
  position: [number, number, number];
  size: [number, number];
  height: number;
  color: string;
  emissive?: string;
  label?: string;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        hovered ? 0.4 : 0.1;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <Box
        ref={meshRef}
        args={[size[0], height, size[1]]}
        position={[0, height / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={emissive ?? color}
          emissiveIntensity={0.1}
          roughness={0.2}
          metalness={0.8}
        />
      </Box>
      {label && (
        <Text
          position={[0, height + 0.5, 0]}
          fontSize={0.4}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

function Road({ start, end, width = 0.5 }: { start: [number, number]; end: [number, number]; width?: number }) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  return (
    <Box
      args={[length, 0.02, width]}
      position={[(start[0] + end[0]) / 2, 0.01, (start[1] + end[1]) / 2]}
      rotation={[0, -angle, 0]}
    >
      <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
    </Box>
  );
}

function StreetLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Cylinder args={[0.05, 0.05, 3, 6]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#888" metalness={0.8} />
      </Cylinder>
      <mesh position={[0.3, 3, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0.3, 3, 0]} intensity={0.5} distance={5} color="#fffde7" />
    </group>
  );
}

function CityScene({ onDistrictClick }: { onDistrictClick: (district: string) => void }) {
  useFrame(() => {});

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#4444ff" />

      {/* Ground */}
      <Box args={[60, 0.1, 60]} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#0a0a1e" roughness={0.9} />
      </Box>

      {/* Roads */}
      <Road start={[-30, 0]} end={[30, 0]} width={2} />
      <Road start={[0, -30]} end={[0, 30]} width={2} />
      <Road start={[-30, -15]} end={[30, -15]} width={1.5} />
      <Road start={[-30, 15]} end={[30, 15]} width={1.5} />
      <Road start={[-15, -30]} end={[-15, 30]} width={1.5} />
      <Road start={[15, -30]} end={[15, 30]} width={1.5} />

      {/* Casino District - Center */}
      <Building
        position={[0, 0, 0]}
        size={[8, 8]}
        height={12}
        color="#8b0000"
        emissive="#ff0000"
        label="Grand Casino"
        onClick={() => onDistrictClick("casino")}
      />
      <Building position={[5, 0, 3]} size={[3, 3]} height={8} color="#6b0000" />
      <Building position={[-4, 0, 4]} size={[3, 3]} height={6} color="#7a0000" />

      {/* Sports Arena - NE */}
      <Building
        position={[12, 0, -12]}
        size={[10, 10]}
        height={5}
        color="#006400"
        emissive="#00a800"
        label="Sports Arena"
        onClick={() => onDistrictClick("sports")}
      />

      {/* Financial Hub - NW */}
      <Building
        position={[-12, 0, -12]}
        size={[6, 6]}
        height={15}
        color="#003b8e"
        emissive="#0055cc"
        label="Financial Hub"
        onClick={() => onDistrictClick("finance")}
      />
      <Building position={[-16, 0, -10]} size={[4, 4]} height={12} color="#002a6b" />

      {/* Real Estate - SW */}
      <Building
        position={[-12, 0, 12]}
        size={[5, 5]}
        height={10}
        color="#4a3000"
        emissive="#c87800"
        label="Real Estate"
        onClick={() => onDistrictClick("realestate")}
      />
      <Building position={[-14, 0, 8]} size={[3, 3]} height={7} color="#3d2800" />
      <Building position={[-8, 0, 15]} size={[3, 3]} height={8} color="#3d2800" />

      {/* Vehicle Showroom - SE */}
      <Building
        position={[12, 0, 12]}
        size={[7, 4]}
        height={3}
        color="#3b1a5e"
        emissive="#7c3aed"
        label="Showroom"
        onClick={() => onDistrictClick("showroom")}
      />

      {/* Nightlife - South Beach */}
      <Building
        position={[0, 0, 20]}
        size={[8, 4]}
        height={4}
        color="#1a2a6c"
        emissive="#3b82f6"
        label="Beach & Nightlife"
        onClick={() => onDistrictClick("nightlife")}
      />

      {/* Marketplace - North */}
      <Building
        position={[0, 0, -20]}
        size={[6, 4]}
        height={5}
        color="#c25000"
        emissive="#f97316"
        label="Marketplace"
        onClick={() => onDistrictClick("marketplace")}
      />

      {/* Street Lights */}
      {[-10, 0, 10].flatMap((x) =>
        [-10, 0, 10].map((z) => (
          <StreetLight key={`${x}-${z}`} position={[x + 3, 0, z + 3]} />
        ))
      )}

      {/* Water / Ocean */}
      <Box args={[60, 0.1, 20]} position={[0, -0.08, 32]}>
        <meshStandardMaterial color="#001a4d" roughness={0.1} metalness={0.5} transparent opacity={0.8} />
      </Box>

      {/* Atmosphere fog effect via background */}
    </>
  );
}

// ============================================================
// Mini-map
// ============================================================
const DISTRICT_POSITIONS: Record<string, { x: number; y: number; label: string; icon: string }> = {
  casino: { x: 50, y: 50, label: "Casino", icon: "🎰" },
  sports: { x: 75, y: 25, label: "Sports", icon: "⚽" },
  finance: { x: 25, y: 25, label: "Finance", icon: "📈" },
  realestate: { x: 25, y: 75, label: "Real Estate", icon: "🏙️" },
  showroom: { x: 75, y: 75, label: "Showroom", icon: "🏎️" },
  nightlife: { x: 50, y: 85, label: "Beach", icon: "🌊" },
  marketplace: { x: 50, y: 15, label: "Market", icon: "🏪" },
  fashion: { x: 40, y: 60, label: "Fashion", icon: "👔" },
};

const DISTRICT_HREFS: Record<string, string> = {
  casino: "/city/casino",
  sports: "/city/sports",
  finance: "/city/finance",
  realestate: "/city/realestate",
  showroom: "/city/showroom",
  nightlife: "/city/nightlife",
  marketplace: "/city/marketplace",
  fashion: "/city/fashion",
};

// ============================================================
// Main Page
// ============================================================
export default function CityPage() {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  function handleDistrictClick(district: string) {
    setSelectedDistrict(district);
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [25, 20, 25], fov: 60 }}
        shadows
        style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a20 100%)" }}
      >
        <fog attach="fog" args={["#050510", 30, 60]} />
        <CityScene onDistrictClick={handleDistrictClick} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.5}
          minDistance={5}
          maxDistance={40}
        />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-sm bg-black/50 backdrop-blur px-3 py-2 rounded-lg border border-white/10"
          >
            ← Home
          </Link>
        </div>

        <div className="text-center">
          <div className="text-gold-gradient font-black text-xl">VIRTUAL CITY</div>
          <div className="text-xs text-gray-500">Click buildings to explore</div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-black/50 backdrop-blur border border-white/10 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500">Balance: </span>
            <span className="text-yellow-400 font-bold">50,000 VC</span>
          </div>
          <button
            onClick={() => setShowMap((m) => !m)}
            className="bg-black/50 backdrop-blur border border-white/10 rounded-lg px-3 py-2 text-sm text-white hover:border-yellow-500/50 transition-colors"
          >
            {showMap ? "🗺️ Hide Map" : "🗺️ Map"}
          </button>
        </div>
      </div>

      {/* District Selection Popup */}
      <AnimatePresence>
        {selectedDistrict && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur border border-yellow-500/30 rounded-2xl p-6 text-center min-w-64"
          >
            <div className="text-2xl mb-2">{DISTRICT_POSITIONS[selectedDistrict]?.icon}</div>
            <h2 className="text-xl font-black text-gold-gradient mb-2">
              {DISTRICT_POSITIONS[selectedDistrict]?.label}
            </h2>
            <div className="flex gap-3 justify-center">
              <Link
                href={DISTRICT_HREFS[selectedDistrict] ?? "/city"}
                className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Enter
              </Link>
              <button
                onClick={() => setSelectedDistrict(null)}
                className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Map */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-4 right-4 w-48 h-48 bg-black/80 backdrop-blur border border-white/10 rounded-xl overflow-hidden"
          >
            <div className="relative w-full h-full">
              {/* Map grid */}
              <div className="absolute inset-0 opacity-10">
                {[25, 50, 75].map((p) => (
                  <div key={p}>
                    <div className="absolute w-full h-px bg-white" style={{ top: `${p}%` }} />
                    <div className="absolute h-full w-px bg-white" style={{ left: `${p}%` }} />
                  </div>
                ))}
              </div>

              {Object.entries(DISTRICT_POSITIONS).map(([key, d]) => (
                <Link
                  key={key}
                  href={DISTRICT_HREFS[key] ?? "/city"}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-lg hover:scale-125 transition-transform"
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                  title={d.label}
                >
                  {d.icon}
                </Link>
              ))}

              {/* Player position */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-400 border-2 border-white"
                style={{ left: "50%", top: "50%" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick navigation bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex gap-2 bg-black/80 backdrop-blur border border-white/10 rounded-2xl px-4 py-2">
          {Object.entries(DISTRICT_POSITIONS).slice(0, 6).map(([key, d]) => (
            <Link
              key={key}
              href={DISTRICT_HREFS[key] ?? "/city"}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg hover:bg-white/10 transition-colors group"
              title={d.label}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{d.icon}</span>
              <span className="text-xs text-gray-500 hidden sm:block">{d.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
