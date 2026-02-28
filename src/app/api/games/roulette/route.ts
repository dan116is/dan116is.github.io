import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet } from "@/lib/wallet";
import { playRoulette } from "@/lib/games/roulette";
import { TransactionType, GameType, GameOutcome } from "@prisma/client";
import { z } from "zod";

const BetSchema = z.object({
  bets: z.array(
    z.object({
      type: z.object({
        type: z.string(),
        number: z.number().optional(),
        numbers: z.array(z.number()).optional(),
        color: z.string().optional(),
        parity: z.string().optional(),
        half: z.string().optional(),
        column: z.number().optional(),
        dozen: z.number().optional(),
      }),
      amount: z.number().positive(),
    })
  ),
  tableId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    if (!user.isVerified) return NextResponse.json({ error: "Account not verified" }, { status: 403 });

    const body = await req.json();
    const parsed = BetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid bet data" }, { status: 400 });
    }

    const { bets, tableId } = parsed.data;

    // Validate bet amounts
    const MIN_BET = 10;
    const MAX_BET = 50000;
    const totalBet = bets.reduce((acc, b) => acc + b.amount, 0);

    if (totalBet < MIN_BET) {
      return NextResponse.json({ error: `Minimum total bet is ${MIN_BET} VC` }, { status: 400 });
    }

    if (bets.some((b) => b.amount < 1)) {
      return NextResponse.json({ error: "Each bet must be at least 1 VC" }, { status: 400 });
    }

    // Debit wallet
    const debited = await debitWallet(
      user.id,
      totalBet,
      TransactionType.GAME_LOSS, // tentatively
      `Roulette bet — ${bets.length} position(s)`,
      tableId
    );

    if (!debited) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Play the game
    const gameResult = playRoulette(bets as any);

    // Find or create game session
    const gameSession = await prisma.gameSession.create({
      data: {
        gameType: GameType.ROULETTE,
        tableId,
        houseEdge: 0.027,
        minBet: MIN_BET,
        maxBet: MAX_BET,
        status: "CLOSED",
        endedAt: new Date(),
        totalWagered: totalBet,
        totalPaidOut: gameResult.totalWin,
        houseProfit: totalBet - gameResult.totalWin,
      },
    });

    // Record game history
    await prisma.gameHistory.create({
      data: {
        userId: user.id,
        gameSessionId: gameSession.id,
        gameType: GameType.ROULETTE,
        betAmount: totalBet,
        outcome: gameResult.totalWin > totalBet ? GameOutcome.WIN : GameOutcome.LOSS,
        payout: gameResult.totalWin,
        profit: gameResult.totalWin - totalBet,
        houseEdge: 0.027,
        gameData: {
          result: gameResult.result,
          color: gameResult.color,
          bets: gameResult.breakdown,
        },
      },
    });

    // Credit winnings if any
    if (gameResult.totalWin > 0) {
      await creditWallet(
        user.id,
        gameResult.totalWin,
        TransactionType.GAME_WIN,
        `Roulette win — ${gameResult.result} (${gameResult.color})`,
        gameSession.id
      );
    }

    // Track platform revenue
    const houseProfit = totalBet - gameResult.totalWin;
    if (houseProfit > 0) {
      await prisma.platformRevenue.create({
        data: {
          source: "HOUSE_EDGE",
          amount: houseProfit / 100,
          userId: user.id,
          reference: gameSession.id,
          metadata: { game: "roulette", result: gameResult.result },
        },
      });
    }

    return NextResponse.json({
      success: true,
      result: gameResult.result,
      color: gameResult.color,
      totalBet,
      totalWin: gameResult.totalWin,
      profit: gameResult.totalWin - totalBet,
      breakdown: gameResult.breakdown,
    });
  } catch (error) {
    console.error("[Roulette]", error);
    return NextResponse.json({ error: "Game error. Please try again." }, { status: 500 });
  }
}
