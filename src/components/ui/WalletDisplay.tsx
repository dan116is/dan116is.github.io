"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, Plus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";

interface WalletDisplayProps {
  className?: string;
  showDepositButton?: boolean;
}

// VC to USD approximate rate (configurable)
const VC_TO_USD_RATE = 0.01;

function useAnimatedNumber(target: number, duration = 600) {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;

    if (from === to) return;

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayed;
}

export default function WalletDisplay({
  className = "",
  showDepositButton = true,
}: WalletDisplayProps) {
  const { wallet } = useAppStore();
  const animatedBalance = useAnimatedNumber(wallet.balance);
  const [showTooltip, setShowTooltip] = useState(false);
  const [prevBalance, setPrevBalance] = useState(wallet.balance);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (wallet.balance !== prevBalance) {
      setDirection(wallet.balance > prevBalance ? "up" : "down");
      setPrevBalance(wallet.balance);
      const timer = setTimeout(() => setDirection(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [wallet.balance, prevBalance]);

  const usdEquivalent = (wallet.balance * VC_TO_USD_RATE).toFixed(2);

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Balance display */}
      <div
        className="relative flex items-center gap-2 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Wallet className="w-4 h-4 text-yellow-400 flex-shrink-0" />

        <div className="flex items-baseline gap-1">
          <motion.span
            key={Math.round(wallet.balance)}
            className={`font-bold text-sm transition-colors duration-300 ${
              direction === "up"
                ? "text-green-400"
                : direction === "down"
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {Math.round(animatedBalance).toLocaleString()}
          </motion.span>
          <span className="text-yellow-600 text-xs font-semibold">VC</span>
        </div>

        {/* Direction indicator */}
        <AnimatePresence>
          {direction && (
            <motion.span
              key={direction}
              initial={{ opacity: 0, y: direction === "up" ? 8 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction === "up" ? -8 : 8 }}
              className={`absolute -top-4 right-0 text-xs font-bold ${
                direction === "up" ? "text-green-400" : "text-red-400"
              }`}
            >
              {direction === "up" ? "+" : "-"}
            </motion.span>
          )}
        </AnimatePresence>

        {/* USD tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none"
            >
              <div className="bg-black/90 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <TrendingUp className="w-3 h-3 text-yellow-400" />
                  <span>≈ ${usdEquivalent} USD</span>
                </div>
                {wallet.lockedBalance > 0 && (
                  <div className="text-gray-500 mt-0.5">
                    {wallet.lockedBalance.toLocaleString()} VC locked in bets
                  </div>
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-black/90" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick deposit button */}
      {showDepositButton && (
        <Link
          href="/dashboard/wallet?action=deposit"
          className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/40 transition-colors"
          title="Quick deposit"
        >
          <Plus className="w-3 h-3 text-yellow-400" />
        </Link>
      )}
    </div>
  );
}
