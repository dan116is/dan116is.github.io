import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { getWallet } from "@/lib/wallet";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      const response = NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
      response.cookies.set("session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    // Fetch character and wallet in parallel
    const [character, wallet] = await Promise.all([
      prisma.character.findUnique({ where: { userId: user.id } }),
      getWallet(user.id),
    ]);

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      vipLevel: user.vipLevel,
      kycStatus: user.kycStatus,
      isVerified: user.isVerified,
      role: user.role,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      character: character
        ? {
            id: character.id,
            name: character.name,
            gender: character.gender,
            skinTone: character.skinTone,
            hairStyle: character.hairStyle,
            hairColor: character.hairColor,
            eyeColor: character.eyeColor,
            bodyType: character.bodyType,
            height: character.height,
            currentArea: character.currentArea,
            isOnline: character.isOnline,
          }
        : null,
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
    console.error("[Auth/Me]", error);
    return NextResponse.json(
      { error: "Failed to fetch user data." },
      { status: 500 }
    );
  }
}
