"use client";

import { useEffect, useCallback, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "bet" | "win" | "transfer";
  amount: number;
  status: "pending" | "completed" | "failed";
  description: string;
  createdAt: string;
}

interface WalletResponse {
  balance: number;
  lockedBalance: number;
  transactions: Transaction[];
}

export function useWallet() {
  const { wallet, setWallet, updateBalance, addNotification } = useAppStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch wallet: ${res.status}`);
      }

      const data: WalletResponse = await res.json();
      setWallet({ balance: data.balance, lockedBalance: data.lockedBalance });
      setTransactions(data.transactions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setIsLoading(false);
    }
  }, [setWallet]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const deposit = useCallback(
    async (amount: number) => {
      if (amount <= 0) throw new Error("Deposit amount must be positive");

      setIsLoading(true);
      try {
        const res = await fetch("/api/wallet/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message ?? "Deposit failed");
        }

        const data = await res.json();
        updateBalance(data.balance);
        addNotification({
          type: "success",
          title: "Deposit Successful",
          message: `${amount.toLocaleString()} VC has been added to your wallet.`,
          href: "/dashboard/wallet",
        });
        await fetchWallet();
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [updateBalance, addNotification, fetchWallet]
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (amount <= 0) throw new Error("Withdrawal amount must be positive");
      if (amount > wallet.balance) throw new Error("Insufficient balance");

      setIsLoading(true);
      try {
        const res = await fetch("/api/wallet/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message ?? "Withdrawal failed");
        }

        const data = await res.json();
        updateBalance(data.balance);
        addNotification({
          type: "info",
          title: "Withdrawal Requested",
          message: `${amount.toLocaleString()} VC withdrawal is being processed.`,
          href: "/dashboard/wallet",
        });
        await fetchWallet();
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet.balance, updateBalance, addNotification, fetchWallet]
  );

  return {
    balance: wallet.balance,
    lockedBalance: wallet.lockedBalance,
    transactions,
    isLoading,
    error,
    deposit,
    withdraw,
    refresh: fetchWallet,
  };
}
