import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet } from "@/lib/wallet";
import {
  initGame,
  hit,
  stand,
  finishGame,
  canDouble,
  canSplit,
  handTotal,
  BlackjackGameState,
  HOUSE_EDGE_BLACKJACK,
} from "@/lib/games/blackjack";
import { TransactionType, GameType, GameOutcome } from "@prisma/client";
import { z } from "zod";

const MIN_BET = 10;
const MAX_BET = 100000;

const BlackjackSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("deal"),
    betAmount: z.number().min(MIN_BET).max(MAX_BET),
  }),
  z.object({
    action: z.enum(["hit", "stand", "double", "split"]),
    gameState: z.record(z.unknown()),
  }),
]);

async function recordGameEnd(
  userId: string,
  betAmount: number,
  totalPayout: number,
  gameData: Record<string, unknown>
) {
  const profit = totalPayout - betAmount;
  const outcome =
    totalPayout > betAmount
      ? GameOutcome.WIN
      : totalPayout === betAmount
      ? GameOutcome.PUSH
      : totalPayout > 0 && totalPayout === betAmount * 2.5
      ? GameOutcome.BLACKJACK
      : GameOutcome.LOSS;

  const gameSession = await prisma.gameSession.create({
    data: {
      gameType: GameType.BLACKJACK,
      houseEdge: HOUSE_EDGE_BLACKJACK,
      minBet: MIN_BET,
      maxBet: MAX_BET,
      status: "CLOSED",
      endedAt: new Date(),
      totalWagered: betAmount,
      totalPaidOut: totalPayout,
      houseProfit: Math.max(0, betAmount - totalPayout),
    },
  });

  await prisma.gameHistory.create({
    data: {
      userId,
      gameSessionId: gameSession.id,
      gameType: GameType.BLACKJACK,
      betAmount,
      outcome,
      payout: totalPayout,
      profit,
      houseEdge: HOUSE_EDGE_BLACKJACK,
      gameData: gameData as any,
    },
  });

  if (totalPayout > 0) {
    await creditWallet(
      userId,
      totalPayout,
      TransactionType.GAME_WIN,
      `Blackjack win — payout ${totalPayout} VC`,
      gameSession.id
    );
  }

  const houseProfit = betAmount - totalPayout;
  if (houseProfit > 0) {
    await prisma.platformRevenue.create({
      data: {
        source: "HOUSE_EDGE",
        amount: houseProfit / 100,
        userId,
        reference: gameSession.id,
        metadata: { game: "blackjack" },
      },
    });
  }

  return { gameSession, profit, outcome };
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    if (!user.isVerified)
      return NextResponse.json({ error: "Account not verified" }, { status: 403 });

    const body = await req.json();
    const parsed = BlackjackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // ── DEAL ────────────────────────────────────────────────────────────────
    if (data.action === "deal") {
      const { betAmount } = data;

      const debited = await debitWallet(
        user.id,
        betAmount,
        TransactionType.GAME_LOSS,
        `Blackjack bet — ${betAmount} VC`
      );
      if (!debited) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      const gameState = initGame(betAmount);

      // Check for immediate blackjack (player blackjack on deal)
      if (gameState.phase === "dealer_turn") {
        const result = finishGame(gameState);
        const { profit, outcome } = await recordGameEnd(
          user.id,
          betAmount,
          result.totalPayout,
          { initialState: gameState, result }
        );

        return NextResponse.json({
          success: true,
          finished: true,
          gameState: {
            ...gameState,
            dealerHand: result.dealerHand,
            phase: "complete",
          },
          outcomes: result.outcomes,
          payouts: result.payouts,
          totalPayout: result.totalPayout,
          profit,
          outcome,
          canHit: false,
          canDouble: false,
          canSplit: false,
        });
      }

      const activeHand = gameState.playerHands[gameState.activeHandIndex];

      return NextResponse.json({
        success: true,
        finished: false,
        gameState,
        playerTotal: handTotal(activeHand),
        dealerUpCard: gameState.dealerHand.cards[0],
        canHit: true,
        canDouble: canDouble(activeHand),
        canSplit: canSplit(activeHand),
      });
    }

    // ── HIT / STAND / DOUBLE / SPLIT ────────────────────────────────────────
    let gameState = data.gameState as BlackjackGameState;

    if (!gameState || !gameState.playerHands || !gameState.deck) {
      return NextResponse.json({ error: "Invalid game state" }, { status: 400 });
    }

    const betAmount = gameState.bets.reduce((a, b) => a + b, 0);

    if (data.action === "double") {
      const activeHand = gameState.playerHands[gameState.activeHandIndex];
      if (!canDouble(activeHand)) {
        return NextResponse.json({ error: "Cannot double down on this hand" }, { status: 400 });
      }

      const extraBet = gameState.bets[gameState.activeHandIndex];
      const debited = await debitWallet(
        user.id,
        extraBet,
        TransactionType.GAME_LOSS,
        `Blackjack double down — ${extraBet} VC`
      );
      if (!debited) {
        return NextResponse.json({ error: "Insufficient balance for double down" }, { status: 400 });
      }

      // Double: hit once then stand
      gameState = hit(gameState);
      gameState = stand(gameState);

      // Update bet for the doubled hand
      const newBets = [...gameState.bets];
      newBets[gameState.activeHandIndex === 0 && gameState.phase === "dealer_turn"
        ? 0
        : gameState.activeHandIndex] *= 2;
      gameState = { ...gameState, bets: newBets };
    } else if (data.action === "split") {
      const activeHand = gameState.playerHands[gameState.activeHandIndex];
      if (!canSplit(activeHand)) {
        return NextResponse.json({ error: "Cannot split this hand" }, { status: 400 });
      }

      const splitBet = gameState.bets[gameState.activeHandIndex];
      const debited = await debitWallet(
        user.id,
        splitBet,
        TransactionType.GAME_LOSS,
        `Blackjack split — ${splitBet} VC`
      );
      if (!debited) {
        return NextResponse.json({ error: "Insufficient balance for split" }, { status: 400 });
      }

      // Create two hands from the split
      const [card1, card2] = activeHand.cards;
      const newDeck = [...gameState.deck];
      const hand1 = { cards: [card1, newDeck.pop()!], status: "active" as const };
      const hand2 = { cards: [card2, newDeck.pop()!], status: "active" as const };

      const newHands = [...gameState.playerHands];
      newHands.splice(gameState.activeHandIndex, 1, hand1, hand2);
      const newBets = [...gameState.bets];
      newBets.splice(gameState.activeHandIndex, 1, splitBet, splitBet);

      gameState = {
        ...gameState,
        deck: newDeck,
        playerHands: newHands,
        bets: newBets,
      };
    } else if (data.action === "hit") {
      gameState = hit(gameState);
    } else if (data.action === "stand") {
      gameState = stand(gameState);
    }

    // If dealer's turn, finish the game
    if (gameState.phase === "dealer_turn" || gameState.phase === "complete") {
      const result = finishGame(gameState);
      const totalBetAmount = gameState.bets.reduce((a, b) => a + b, 0);
      const { profit, outcome } = await recordGameEnd(
        user.id,
        totalBetAmount,
        result.totalPayout,
        {
          action: data.action,
          playerHands: gameState.playerHands,
          dealerHand: result.dealerHand,
          outcomes: result.outcomes,
          payouts: result.payouts,
        }
      );

      return NextResponse.json({
        success: true,
        finished: true,
        gameState: {
          ...gameState,
          dealerHand: result.dealerHand,
          phase: "complete",
        },
        outcomes: result.outcomes,
        payouts: result.payouts,
        totalPayout: result.totalPayout,
        profit,
        outcome,
        canHit: false,
        canDouble: false,
        canSplit: false,
      });
    }

    // Game still in progress
    const activeHand = gameState.playerHands[gameState.activeHandIndex];
    return NextResponse.json({
      success: true,
      finished: false,
      gameState,
      playerTotal: handTotal(activeHand),
      dealerUpCard: gameState.dealerHand.cards[0],
      canHit: activeHand.status === "active",
      canDouble: canDouble(activeHand),
      canSplit: canSplit(activeHand),
    });
  } catch (error) {
    console.error("[Blackjack]", error);
    return NextResponse.json({ error: "Game error. Please try again." }, { status: 500 });
  }
}
