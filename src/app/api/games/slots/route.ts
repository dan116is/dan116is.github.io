import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet } from "@/lib/wallet";
import { playSlots, HOUSE_EDGE_SLOTS } from "@/lib/games/slots";
import { TransactionType, GameType, GameOutcome } from "@prisma/client";
import { z } from "zod";

const MIN_BET_PER_LINE = 1;
const MAX_BET_PER_LINE = 1000;
const MAX_LINES = 25;

const SlotsSchema = z.object({
  betPerLine: z.number().min(MIN_BET_PER_LINE).max(MAX_BET_PER_LINE),
  activeLines: z.number().int().min(1).max(MAX_LINES).default(25),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    if (!user.isVerified)
      return NextResponse.json({ error: "Account not verified" }, { status: 403 });

    const body = await req.json();
    const parsed = SlotsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { betPerLine, activeLines } = parsed.data;
    const totalBet = betPerLine * activeLines;

    // Debit the total bet from wallet
    const debited = await debitWallet(
      user.id,
      totalBet,
      TransactionType.GAME_LOSS,
      `Slots bet — ${betPerLine} VC × ${activeLines} lines = ${totalBet} VC`
    );
    if (!debited) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Spin the reels
    const result = playSlots(betPerLine, activeLines);
    const { reels, results, totalWin, profit } = result;
    const { paylineResults, freeSpinsAwarded } = results;

    // Determine outcome
    const outcome = totalWin > totalBet ? GameOutcome.WIN : GameOutcome.LOSS;

    // Create game session record
    const gameSession = await prisma.gameSession.create({
      data: {
        gameType: GameType.SLOTS,
        houseEdge: HOUSE_EDGE_SLOTS,
        minBet: MIN_BET_PER_LINE,
        maxBet: MAX_BET_PER_LINE * MAX_LINES,
        status: "CLOSED",
        endedAt: new Date(),
        totalWagered: totalBet,
        totalPaidOut: totalWin,
        houseProfit: Math.max(0, totalBet - totalWin),
      },
    });

    // Record game history
    await prisma.gameHistory.create({
      data: {
        userId: user.id,
        gameSessionId: gameSession.id,
        gameType: GameType.SLOTS,
        betAmount: totalBet,
        outcome,
        payout: totalWin,
        profit,
        houseEdge: HOUSE_EDGE_SLOTS,
        gameData: {
          betPerLine,
          activeLines,
          reels,
          paylineResults,
          freeSpinsAwarded,
        } as any,
      },
    });

    // Credit winnings if any
    if (totalWin > 0) {
      await creditWallet(
        user.id,
        totalWin,
        TransactionType.GAME_WIN,
        `Slots win — ${totalWin} VC${freeSpinsAwarded > 0 ? ` + ${freeSpinsAwarded} free spins` : ""}`,
        gameSession.id
      );
    }

    // Track platform revenue from house edge
    const houseProfit = totalBet - totalWin;
    if (houseProfit > 0) {
      await prisma.platformRevenue.create({
        data: {
          source: "HOUSE_EDGE",
          amount: houseProfit / 100,
          userId: user.id,
          reference: gameSession.id,
          metadata: { game: "slots", lines: activeLines, betPerLine },
        },
      });
    }

    return NextResponse.json({
      success: true,
      reels,
      paylineResults,
      totalBet,
      totalWin,
      profit,
      freeSpinsAwarded,
      outcome,
    });
  } catch (error) {
    console.error("[Slots]", error);
    return NextResponse.json({ error: "Game error. Please try again." }, { status: 500 });
  }
}
