"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAppStore } from "@/store/useAppStore";

interface Position {
  x: number;
  y: number;
  z: number;
  rotation?: number;
}

interface ChatMessage {
  message: string;
  area?: string;
}

type SocketStatus = "disconnected" | "connecting" | "connected" | "error";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const { isAuthenticated, addNotification } = useAppStore();

  const getSessionToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/session-token", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token ?? null;
    } catch {
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    setStatus("connecting");

    const token = await getSessionToken();
    if (!token) {
      setStatus("disconnected");
      return;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? window.location.origin;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: false, // manual reconnect for better control
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      setConnected(true);
      reconnectAttemptsRef.current = 0;
    });

    socket.on("disconnect", (reason) => {
      setStatus("disconnected");
      setConnected(false);

      // Attempt reconnection unless server explicitly disconnected
      if (reason !== "io server disconnect") {
        scheduleReconnect();
      }
    });

    socket.on("connect_error", () => {
      setStatus("error");
      setConnected(false);
      scheduleReconnect();
    });

    socket.on("notification", (payload: { title: string; message: string; type: string }) => {
      addNotification({
        type: (payload.type as "info" | "success" | "warning" | "error") ?? "info",
        title: payload.title,
        message: payload.message,
      });
    });
  }, [getSessionToken, addNotification]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setStatus("error");
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );
    reconnectAttemptsRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated) {
        connect();
      }
    }, delay);
  }, [connect, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      // Disconnect if user logs out
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
      setConnected(false);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, connect]);

  const sendPosition = useCallback((pos: Position) => {
    socketRef.current?.emit("player:position", pos);
  }, []);

  const sendChat = useCallback((msg: ChatMessage) => {
    socketRef.current?.emit("chat:message", msg);
  }, []);

  const joinArea = useCallback((area: string) => {
    socketRef.current?.emit("area:join", { area });
  }, []);

  const leaveArea = useCallback((area: string) => {
    socketRef.current?.emit("area:leave", { area });
  }, []);

  return {
    socket: socketRef.current,
    connected,
    status,
    sendPosition,
    sendChat,
    joinArea,
    leaveArea,
  };
}
