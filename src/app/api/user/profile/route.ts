import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores")
    .optional(),
});

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

    // Fetch full profile with stats
    const [profile, wallet, achievementCount, gameStats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        include: {
          character: true,
          _count: {
            select: {
              achievements: true,
              gameHistory: true,
              properties: true,
              vehicles: true,
            },
          },
        },
      }),
      prisma.wallet.findUnique({ where: { userId: user.id } }),
      prisma.userAchievement.count({ where: { userId: user.id } }),
      prisma.gameHistory.aggregate({
        where: { userId: user.id },
        _count: { id: true },
        _sum: { profit: true },
      }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalProfit = gameStats._sum.profit ?? 0;
    const gamesPlayed = gameStats._count.id ?? 0;

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      vipLevel: profile.vipLevel,
      kycStatus: profile.kycStatus,
      isVerified: profile.isVerified,
      role: profile.role,
      isBanned: profile.isBanned,
      totalPlaytime: profile.totalPlaytime,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      lastLoginAt: profile.lastLoginAt,
      character: profile.character,
      stats: {
        totalWon: wallet?.totalWon ?? 0,
        totalLost: wallet?.totalLost ?? 0,
        gamesPlayed,
        netProfit: totalProfit,
        achievementsCount: achievementCount,
        propertiesOwned: profile._count.properties,
        vehiclesOwned: profile._count.vehicles,
      },
      wallet: wallet
        ? {
            balance: wallet.balance,
            lockedBalance: wallet.lockedBalance,
            totalDeposited: wallet.totalDeposited,
            totalWithdrawn: wallet.totalWithdrawn,
            totalWon: wallet.totalWon,
            totalLost: wallet.totalLost,
          }
        : null,
    });
  } catch (error) {
    console.error("[User/Profile GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { username } = parsed.data;

    if (!username) {
      return NextResponse.json(
        { error: "No updatable fields provided." },
        { status: 400 }
      );
    }

    // Check username uniqueness (exclude current user)
    if (username && username !== user.username) {
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: user.id } },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Username already taken." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { username },
      select: {
        id: true,
        username: true,
        email: true,
        vipLevel: true,
        kycStatus: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[User/Profile PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
