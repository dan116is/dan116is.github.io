import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type LeaderboardType = "totalWon" | "gamesPlayed" | "vipLevel";
type LeaderboardPeriod = "daily" | "weekly" | "all";

const VIP_LEVEL_ORDER: Record<string, number> = {
  STANDARD: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  DIAMOND: 4,
};

function getPeriodStart(period: LeaderboardPeriod): Date | null {
  const now = new Date();
  if (period === "daily") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "weekly") {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return null; // "all" — no filter
}

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const type = (searchParams.get("type") ?? "totalWon") as LeaderboardType;
    const period = (searchParams.get("period") ?? "all") as LeaderboardPeriod;

    const validTypes: LeaderboardType[] = ["totalWon", "gamesPlayed", "vipLevel"];
    const validPeriods: LeaderboardPeriod[] = ["daily", "weekly", "all"];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be one of: totalWon, gamesPlayed, vipLevel" },
        { status: 400 }
      );
    }

    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be one of: daily, weekly, all" },
        { status: 400 }
      );
    }

    const periodStart = getPeriodStart(period);

    let leaderboard: Array<{
      rank: number;
      userId: string;
      username: string;
      vipLevel: string;
      value: number;
    }> = [];

    if (type === "totalWon") {
      // Aggregate winnings from game history within the period
      const dateFilter = periodStart
        ? { createdAt: { gte: periodStart } }
        : {};

      const results = await prisma.gameHistory.groupBy({
        by: ["userId"],
        where: {
          profit: { gt: 0 },
          ...dateFilter,
        },
        _sum: { payout: true },
        orderBy: { _sum: { payout: "desc" } },
        take: 100,
      });

      // Fetch user details for the top players
      const userIds = results.map((r) => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isBanned: false },
        select: { id: true, username: true, vipLevel: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      leaderboard = results
        .filter((r) => userMap.has(r.userId))
        .map((r, idx) => {
          const u = userMap.get(r.userId)!;
          return {
            rank: idx + 1,
            userId: u.id,
            username: u.username,
            vipLevel: u.vipLevel,
            value: r._sum.payout ?? 0,
          };
        });
    } else if (type === "gamesPlayed") {
      const dateFilter = periodStart
        ? { createdAt: { gte: periodStart } }
        : {};

      const results = await prisma.gameHistory.groupBy({
        by: ["userId"],
        where: dateFilter,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 100,
      });

      const userIds = results.map((r) => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isBanned: false },
        select: { id: true, username: true, vipLevel: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      leaderboard = results
        .filter((r) => userMap.has(r.userId))
        .map((r, idx) => {
          const u = userMap.get(r.userId)!;
          return {
            rank: idx + 1,
            userId: u.id,
            username: u.username,
            vipLevel: u.vipLevel,
            value: r._count.id,
          };
        });
    } else if (type === "vipLevel") {
      // VIP level leaderboard — period doesn't apply meaningfully, use wallet totalWon as tiebreaker
      const users = await prisma.user.findMany({
        where: { isBanned: false },
        select: {
          id: true,
          username: true,
          vipLevel: true,
          wallet: { select: { totalWon: true } },
        },
        take: 100,
        orderBy: [
          // Prisma doesn't support enum-based custom sort, so we fetch and sort in JS
          { createdAt: "asc" },
        ],
      });

      // Sort by VIP level descending, then by totalWon descending
      const sorted = users.sort((a, b) => {
        const levelDiff =
          (VIP_LEVEL_ORDER[b.vipLevel] ?? 0) - (VIP_LEVEL_ORDER[a.vipLevel] ?? 0);
        if (levelDiff !== 0) return levelDiff;
        return (b.wallet?.totalWon ?? 0) - (a.wallet?.totalWon ?? 0);
      });

      leaderboard = sorted.slice(0, 100).map((u, idx) => ({
        rank: idx + 1,
        userId: u.id,
        username: u.username,
        vipLevel: u.vipLevel,
        value: VIP_LEVEL_ORDER[u.vipLevel] ?? 0,
      }));
    }

    return NextResponse.json({
      type,
      period,
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error("[Leaderboard GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard." },
      { status: 500 }
    );
  }
}
