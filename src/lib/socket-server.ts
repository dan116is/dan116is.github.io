import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { validateSession } from "./auth";
import { getWallet } from "./wallet";

let io: SocketIOServer | null = null;

interface PlayerPosition {
  x: number;
  y: number;
  z: number;
  rotY: number;
  area: string;
}

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  area: string;
  timestamp: Date;
}

/** Active player positions in the city */
const playerPositions = new Map<string, { userId: string; username: string; position: PlayerPosition }>();

/** Chat rate limiting: userId → last message timestamp */
const chatRateLimit = new Map<string, number>();
const CHAT_RATE_MS = 1000; // 1 message per second

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const user = await validateSession(token);
    if (!user) {
      return next(new Error("Invalid or expired session"));
    }

    (socket as any).user = user;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user.username}`);

    // ── Player movement ──────────────────────────────────────
    socket.on("position:update", (position: PlayerPosition) => {
      playerPositions.set(socket.id, { userId: user.id, username: user.username, position });

      // Broadcast to others in the same area
      socket.to(`area:${position.area}`).emit("player:moved", {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        position,
      });
    });

    socket.on("area:join", (area: string) => {
      // Leave previous areas
      const prev = playerPositions.get(socket.id);
      if (prev) socket.leave(`area:${prev.position.area}`);

      socket.join(`area:${area}`);

      // Send existing players in area
      const playersInArea = [...playerPositions.entries()]
        .filter(([, p]) => p.position.area === area)
        .map(([sid, p]) => ({ socketId: sid, ...p }));

      socket.emit("area:players", playersInArea);

      // Announce arrival
      socket.to(`area:${area}`).emit("player:entered", {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
      });
    });

    // ── Chat ─────────────────────────────────────────────────
    socket.on("chat:send", (data: { message: string; area: string }) => {
      const now = Date.now();
      const last = chatRateLimit.get(user.id) ?? 0;

      if (now - last < CHAT_RATE_MS) {
        socket.emit("chat:error", "Please wait before sending another message");
        return;
      }

      if (!data.message || data.message.length > 200) {
        socket.emit("chat:error", "Invalid message");
        return;
      }

      chatRateLimit.set(user.id, now);

      const msg: ChatMessage = {
        userId: user.id,
        username: user.username,
        message: data.message.trim(),
        area: data.area,
        timestamp: new Date(),
      };

      io?.to(`area:${data.area}`).emit("chat:message", msg);
    });

    // ── Casino Game Events ────────────────────────────────────
    socket.on("game:join", (tableId: string) => {
      socket.join(`table:${tableId}`);
      socket.to(`table:${tableId}`).emit("game:player_joined", {
        userId: user.id,
        username: user.username,
      });
    });

    socket.on("game:leave", (tableId: string) => {
      socket.leave(`table:${tableId}`);
      socket.to(`table:${tableId}`).emit("game:player_left", {
        userId: user.id,
        username: user.username,
      });
    });

    // ── Wallet Updates ────────────────────────────────────────
    socket.on("wallet:refresh", async () => {
      try {
        const wallet = await getWallet(user.id);
        socket.emit("wallet:updated", {
          balance: wallet?.balance ?? 0,
          lockedBalance: wallet?.lockedBalance ?? 0,
        });
      } catch {
        socket.emit("wallet:error", "Failed to fetch wallet");
      }
    });

    // ── Notifications ─────────────────────────────────────────
    socket.join(`user:${user.id}`); // private room for targeted notifications

    // ── Disconnect ────────────────────────────────────────────
    socket.on("disconnect", () => {
      const playerData = playerPositions.get(socket.id);
      if (playerData) {
        socket.to(`area:${playerData.position.area}`).emit("player:left", {
          socketId: socket.id,
          userId: user.id,
          username: user.username,
        });
        playerPositions.delete(socket.id);
      }

      console.log(`[Socket] User disconnected: ${user.username}`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

/** Send a real-time notification to a specific user */
export function notifyUser(userId: string, type: string, data: object): void {
  io?.to(`user:${userId}`).emit(`notification:${type}`, data);
}

/** Broadcast a bet result to all players at a table */
export function broadcastGameResult(tableId: string, result: object): void {
  io?.to(`table:${tableId}`).emit("game:result", result);
}

/** Broadcast live sports score update */
export function broadcastSportsUpdate(eventId: string, data: object): void {
  io?.emit(`sports:update:${eventId}`, data);
}
