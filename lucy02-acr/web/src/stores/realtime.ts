import { create } from "zustand";
import { createTenantSocket } from "../lib/api";

interface RealtimeEvent {
  event: string;
  [key: string]: unknown;
}

interface RealtimeState {
  events: Record<string, RealtimeEvent[]>;  // tenant_id -> events
  sockets: Record<string, WebSocket>;
  subscribe: (tenantId: string) => void;
  unsubscribe: (tenantId: string) => void;
}

export const useRealtime = create<RealtimeState>((set, get) => ({
  events: {},
  sockets: {},

  subscribe: (tenantId) => {
    const existing = get().sockets[tenantId];
    if (existing && existing.readyState === WebSocket.OPEN) return;

    const ws = createTenantSocket(tenantId, (data) => {
      const event = data as RealtimeEvent;
      set((state) => ({
        events: {
          ...state.events,
          [tenantId]: [...(state.events[tenantId] || []).slice(-99), event],
        },
      }));
    });

    set((state) => ({ sockets: { ...state.sockets, [tenantId]: ws } }));
  },

  unsubscribe: (tenantId) => {
    const ws = get().sockets[tenantId];
    if (ws) ws.close();
    set((state) => {
      const sockets = { ...state.sockets };
      delete sockets[tenantId];
      return { sockets };
    });
  },
}));
