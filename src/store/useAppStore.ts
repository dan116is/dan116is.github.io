import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VipLevel = "STANDARD" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";

export interface User {
  id: string;
  username: string;
  email: string;
  vipLevel: VipLevel;
  isVerified: boolean;
  avatarUrl?: string;
}

export interface Wallet {
  balance: number;
  lockedBalance: number;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "game" | "transaction";
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

interface AppState {
  // State
  user: User | null;
  wallet: Wallet;
  notifications: Notification[];
  isAuthenticated: boolean;
  characterName: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setWallet: (wallet: Wallet) => void;
  updateBalance: (balance: number) => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setCharacterName: (name: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      wallet: { balance: 0, lockedBalance: 0 },
      notifications: [],
      isAuthenticated: false,
      characterName: null,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setWallet: (wallet) =>
        set({ wallet }),

      updateBalance: (balance) =>
        set((state) => ({
          wallet: { ...state.wallet, balance },
        })),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ].slice(0, 50), // keep last 50
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      setCharacterName: (name) =>
        set({ characterName: name }),

      logout: () =>
        set({
          user: null,
          wallet: { balance: 0, lockedBalance: 0 },
          isAuthenticated: false,
          characterName: null,
          // Keep notifications cleared on logout
          notifications: [],
        }),
    }),
    {
      name: "virtual-city-app",
      // Only persist non-sensitive display preferences
      partialize: (state) => ({
        characterName: state.characterName,
        notifications: state.notifications,
      }),
    }
  )
);

// Selectors
export const selectUnreadCount = (state: AppState) =>
  state.notifications.filter((n) => !n.read).length;

export const selectRecentNotifications = (state: AppState) =>
  state.notifications.slice(0, 5);
