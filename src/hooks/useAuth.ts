"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    vipLevel: "STANDARD" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
    isVerified: boolean;
    avatarUrl?: string;
  } | null;
}

export function useAuth() {
  const { user, isAuthenticated, setUser, logout: storeLogout } = useAppStore();
  const isLoading = false; // managed via fetchMe

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          storeLogout();
        }
        return;
      }

      const data: AuthResponse = await res.json();

      if (data.user) {
        setUser(data.user);
      } else {
        storeLogout();
      }
    } catch {
      // Network error — keep existing state, don't force logout
    }
  }, [setUser, storeLogout]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      storeLogout();
      // Redirect to home
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }, [storeLogout]);

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    refresh: fetchMe,
  };
}
