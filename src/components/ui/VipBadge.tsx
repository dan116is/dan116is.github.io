"use client";

import { VipLevel } from "@/store/useAppStore";

interface VipBadgeProps {
  level: VipLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const VIP_CONFIG: Record<
  VipLevel,
  { label: string; className: string; sparkle?: boolean }
> = {
  STANDARD: {
    label: "STANDARD",
    className:
      "bg-gray-700 text-gray-300 border border-gray-600",
    sparkle: false,
  },
  SILVER: {
    label: "SILVER",
    className:
      "bg-gradient-to-r from-gray-400 via-slate-300 to-gray-400 text-gray-900 border border-gray-300",
    sparkle: false,
  },
  GOLD: {
    label: "GOLD",
    className:
      "bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black border border-yellow-400",
    sparkle: false,
  },
  PLATINUM: {
    label: "PLATINUM",
    className:
      "bg-gradient-to-r from-blue-400 via-slate-300 to-blue-400 text-slate-900 border border-blue-300",
    sparkle: false,
  },
  DIAMOND: {
    label: "DIAMOND",
    className:
      "bg-gradient-to-r from-cyan-400 via-blue-300 to-cyan-400 text-blue-900 border border-cyan-300",
    sparkle: true,
  },
};

const SIZE_CLASSES = {
  sm: "text-[0.6rem] px-1.5 py-0.5",
  md: "text-[0.65rem] px-2 py-0.5",
  lg: "text-xs px-3 py-1",
};

export default function VipBadge({
  level,
  size = "md",
  className = "",
}: VipBadgeProps) {
  const config = VIP_CONFIG[level];

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-black tracking-widest rounded
        ${config.className}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      {config.sparkle && (
        <span className="text-[0.6em]" aria-hidden="true">
          ✦
        </span>
      )}
      {config.label}
      {config.sparkle && (
        <span className="text-[0.6em]" aria-hidden="true">
          ✦
        </span>
      )}
    </span>
  );
}
