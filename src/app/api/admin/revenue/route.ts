import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await validateSession(token);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Revenue by source
  const revenueBySource = await prisma.platformRevenue.groupBy({
    by: ["source"],
    where: { date: { gte: since } },
    _sum: { amount: true },
    _count: true,
  });

  // Daily revenue
  const dailyRevenue = await prisma.$queryRaw<{ date: string; total: number }[]>`
    SELECT DATE(date) as date, SUM(amount) as total
    FROM platform_revenue
    WHERE date >= ${since}
    GROUP BY DATE(date)
    ORDER BY date ASC
  `;

  // Total stats
  const [totalUsers, activeUsers, totalTransactions, totalVolume] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { lastLoginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.transaction.count({ where: { createdAt: { gte: since } } }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = revenueBySource.reduce(
    (acc, r) => acc + (r._sum.amount ?? 0),
    0
  );

  return NextResponse.json({
    period: `${days} days`,
    totalRevenue,
    revenueBySource: revenueBySource.map((r) => ({
      source: r.source,
      amount: r._sum.amount ?? 0,
      transactions: r._count,
    })),
    dailyRevenue,
    stats: {
      totalUsers,
      activeUsers24h: activeUsers,
      totalTransactions,
      totalVolume: totalVolume._sum.amount ?? 0,
    },
  });
}
