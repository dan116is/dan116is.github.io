import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet } from "@/lib/wallet";
import {
  initPokerGame,
  advancePhase,
  determineWinners,
  PokerGameState,
  RAKE_PERCENT,
  RAKE_CAP_VC,
} from "@/lib/games/poker";
import { TransactionType, GameType, GameOutcome } from "@prisma/client";
import { z } from "zod";

const MIN_BUY_IN = 1000;
const MAX_BUY_IN = 500000;
const DEFAULT_SMALL_BLIND = 50;
const AI_PLAYER_ID = "ai_player";

const PokerSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_table"),
    buyIn: z.number().min(MIN_BUY_IN).max(MAX_BUY_IN).default(10000),
    smallBlind: z.number().min(10).default(DEFAULT_SMALL_BLIND),
  }),
  z.object({
    action: z.literal("join"),
    sessionId: z.string(),
  }),
  z.object({
    action: z.literal("fold"),
    gameState: z.record(z.unknown()),
    sessionId: z.string(),
  }),
  z.object({
    action: z.literal("call"),
    gameState: z.record(z.unknown()),
    sessionId: z.string(),
  }),
  z.object({
    action: z.literal("raise"),
    gameState: z.record(z.unknown()),
    sessionId: z.string(),
    raiseAmount: z.number().positive(),
  }),
  z.object({
    action: z.literal("advance_phase"),
    gameState: z.record(z.unknown()),
    sessionId: z.string(),
  }),
]);

/** Simple AI decision: call if cheap, fold otherwise */
function aiDecide(
  gameState: PokerGameState,
  aiIndex: number
): "fold" | "call" | "check" {
  const ai = gameState.players[aiIndex];
  const callAmount = gameState.currentBet - ai.bet;
  if (callAmount === 0) return "check";
  // AI calls up to 30% of their stack
  if (callAmount <= ai.chips * 0.3) return "call";
  return "fold";
}

async function settlePokerHand(
  userId: string,
  gameState: PokerGameState,
  sessionId: string
) {
  const result = determineWinners(gameState);
  const { winners, winnings, rake, evaluations } = result;

  // Record rake as platform revenue
  if (rake > 0) {
    await prisma.platformRevenue.create({
      data: {
        source: "HOUSE_EDGE",
        amount: rake / 100,
        userId,
        reference: sessionId,
        metadata: { game: "poker", rake, pot: gameState.pot },
      },
    });
  }

  // Credit winnings to human player if they won
  const humanWinAmount = winnings[userId] ?? 0;
  const aiWinAmount = winnings[AI_PLAYER_ID] ?? 0;

  // Determine outcome for human
  const humanPlayer = gameState.players.find((p) => p.id === userId);
  const humanFolded = humanPlayer?.folded ?? false;

  let outcome: GameOutcome;
  if (humanFolded) {
    outcome = GameOutcome.LOSS;
  } else if (humanWinAmount > 0 && winners.includes(userId)) {
    outcome = GameOutcome.WIN;
  } else if (winners.length > 1 && winners.includes(userId)) {
    outcome = GameOutcome.PUSH;
  } else {
    outcome = GameOutcome.LOSS;
  }

  const humanBet = humanPlayer?.bet ?? 0;
  const totalWagered = gameState.pot;

  // Update game session
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      status: "CLOSED",
      endedAt: new Date(),
      totalWagered,
      totalPaidOut: humanWinAmount,
      houseProfit: rake / 100,
    },
  });

  // Record game history
  await prisma.gameHistory.create({
    data: {
      userId,
      gameSessionId: sessionId,
      gameType: GameType.POKER,
      betAmount: humanBet,
      outcome,
      payout: humanWinAmount,
      profit: humanWinAmount - humanBet,
      houseEdge: RAKE_PERCENT,
      gameData: {
        winners,
        winnings,
        rake,
        evaluations,
        communityCards: gameState.communityCards,
        pot: gameState.pot,
      } as any,
    },
  });

  if (humanWinAmount > 0) {
    await creditWallet(
      userId,
      humanWinAmount,
      TransactionType.GAME_WIN,
      `Poker win — ${humanWinAmount} VC (${evaluations[userId]?.rank ?? "unknown"})`,
      sessionId
    );
  }

  return { result, outcome, humanWinAmount, aiWinAmount };
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
    const parsed = PokerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ── CREATE TABLE ─────────────────────────────────────────────────────────
    if (data.action === "create_table") {
      const { buyIn, smallBlind } = data;

      // Debit buy-in from wallet
      const debited = await debitWallet(
        user.id,
        buyIn,
        TransactionType.GAME_LOSS,
        `Poker buy-in — ${buyIn} VC`
      );
      if (!debited) {
        return NextResponse.json({ error: "Insufficient balance for buy-in" }, { status: 400 });
      }

      // Initialize game with human player vs AI
      const gameState = initPokerGame([user.id, AI_PLAYER_ID], buyIn, smallBlind);

      // Create game session
      const gameSession = await prisma.gameSession.create({
        data: {
          gameType: GameType.POKER,
          houseEdge: RAKE_PERCENT,
          minBet: smallBlind * 2,
          maxBet: buyIn,
          status: "IN_PROGRESS",
          totalWagered: 0,
          totalPaidOut: 0,
          houseProfit: 0,
        },
      });

      // Mask AI hole cards in response
      const sanitizedState = {
        ...gameState,
        players: gameState.players.map((p) => ({
          ...p,
          holeCards: p.id === AI_PLAYER_ID ? [] : p.holeCards,
        })),
      };

      return NextResponse.json({
        success: true,
        sessionId: gameSession.id,
        gameState: sanitizedState,
        message: "Table created. You are playing against AI.",
      });
    }

    // ── JOIN TABLE ───────────────────────────────────────────────────────────
    if (data.action === "join") {
      const gameSession = await prisma.gameSession.findUnique({
        where: { id: data.sessionId },
      });

      if (!gameSession) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }
      if (gameSession.status !== "OPEN") {
        return NextResponse.json({ error: "Table is not available to join" }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        sessionId: gameSession.id,
        message: "Joined table successfully.",
      });
    }

    // ── FOLD ─────────────────────────────────────────────────────────────────
    if (data.action === "fold") {
      const gameState = data.gameState as PokerGameState;
      const playerIndex = gameState.players.findIndex((p) => p.id === user.id);
      if (playerIndex === -1) {
        return NextResponse.json({ error: "Player not in game" }, { status: 400 });
      }

      const newPlayers = [...gameState.players];
      newPlayers[playerIndex] = { ...newPlayers[playerIndex], folded: true };
      const updatedState: PokerGameState = { ...gameState, players: newPlayers };

      const { result, outcome, humanWinAmount } = await settlePokerHand(
        user.id,
        updatedState,
        data.sessionId
      );

      return NextResponse.json({
        success: true,
        action: "fold",
        finished: true,
        outcome,
        winners: result.winners,
        winnings: result.winnings,
        rake: result.rake,
        evaluations: result.evaluations,
        humanWinAmount,
      });
    }

    // ── CALL ─────────────────────────────────────────────────────────────────
    if (data.action === "call") {
      const gameState = data.gameState as PokerGameState;
      const playerIndex = gameState.players.findIndex((p) => p.id === user.id);
      if (playerIndex === -1) {
        return NextResponse.json({ error: "Player not in game" }, { status: 400 });
      }

      const player = gameState.players[playerIndex];
      const callAmount = Math.min(gameState.currentBet - player.bet, player.chips);

      if (callAmount > 0) {
        const debited = await debitWallet(
          user.id,
          callAmount,
          TransactionType.GAME_LOSS,
          `Poker call — ${callAmount} VC`
        );
        if (!debited) {
          return NextResponse.json({ error: "Insufficient balance to call" }, { status: 400 });
        }
      }

      const newPlayers = [...gameState.players];
      newPlayers[playerIndex] = {
        ...player,
        chips: player.chips - callAmount,
        bet: player.bet + callAmount,
        isAllIn: player.chips - callAmount === 0,
      };
      const updatedState: PokerGameState = {
        ...gameState,
        players: newPlayers,
        pot: gameState.pot + callAmount,
      };

      // AI response
      const aiIndex = updatedState.players.findIndex((p) => p.id === AI_PLAYER_ID);
      let finalState = updatedState;
      if (aiIndex !== -1) {
        const aiDecision = aiDecide(updatedState, aiIndex);
        const ai = updatedState.players[aiIndex];
        if (aiDecision === "fold") {
          const aiPlayers = [...updatedState.players];
          aiPlayers[aiIndex] = { ...ai, folded: true };
          finalState = { ...updatedState, players: aiPlayers };
        } else if (aiDecision === "call") {
          const aiCallAmount = Math.min(updatedState.currentBet - ai.bet, ai.chips);
          const aiPlayers = [...updatedState.players];
          aiPlayers[aiIndex] = {
            ...ai,
            chips: ai.chips - aiCallAmount,
            bet: ai.bet + aiCallAmount,
            isAllIn: ai.chips - aiCallAmount === 0,
          };
          finalState = {
            ...updatedState,
            players: aiPlayers,
            pot: updatedState.pot + aiCallAmount,
          };
        }
      }

      const sanitizedState = {
        ...finalState,
        players: finalState.players.map((p) => ({
          ...p,
          holeCards: p.id === AI_PLAYER_ID ? [] : p.holeCards,
        })),
      };

      return NextResponse.json({
        success: true,
        action: "call",
        finished: false,
        gameState: sanitizedState,
        pot: finalState.pot,
      });
    }

    // ── RAISE ─────────────────────────────────────────────────────────────────
    if (data.action === "raise") {
      const gameState = data.gameState as PokerGameState;
      const playerIndex = gameState.players.findIndex((p) => p.id === user.id);
      if (playerIndex === -1) {
        return NextResponse.json({ error: "Player not in game" }, { status: 400 });
      }

      const player = gameState.players[playerIndex];
      const { raiseAmount } = data;
      const totalRequired = gameState.currentBet - player.bet + raiseAmount;
      const actualCharge = Math.min(totalRequired, player.chips);

      const debited = await debitWallet(
        user.id,
        actualCharge,
        TransactionType.GAME_LOSS,
        `Poker raise — ${actualCharge} VC`
      );
      if (!debited) {
        return NextResponse.json({ error: "Insufficient balance to raise" }, { status: 400 });
      }

      const newBet = player.bet + actualCharge;
      const newPlayers = [...gameState.players];
      newPlayers[playerIndex] = {
        ...player,
        chips: player.chips - actualCharge,
        bet: newBet,
        isAllIn: player.chips - actualCharge === 0,
      };
      const updatedState: PokerGameState = {
        ...gameState,
        players: newPlayers,
        pot: gameState.pot + actualCharge,
        currentBet: newBet,
      };

      // AI responds to raise
      const aiIndex = updatedState.players.findIndex((p) => p.id === AI_PLAYER_ID);
      let finalState = updatedState;
      if (aiIndex !== -1) {
        const aiDecision = aiDecide(updatedState, aiIndex);
        const ai = updatedState.players[aiIndex];
        if (aiDecision === "fold") {
          const aiPlayers = [...updatedState.players];
          aiPlayers[aiIndex] = { ...ai, folded: true };
          finalState = { ...updatedState, players: aiPlayers };
        } else if (aiDecision === "call") {
          const aiCallAmount = Math.min(updatedState.currentBet - ai.bet, ai.chips);
          const aiPlayers = [...updatedState.players];
          aiPlayers[aiIndex] = {
            ...ai,
            chips: ai.chips - aiCallAmount,
            bet: ai.bet + aiCallAmount,
            isAllIn: ai.chips - aiCallAmount === 0,
          };
          finalState = {
            ...updatedState,
            players: aiPlayers,
            pot: updatedState.pot + aiCallAmount,
          };
        }
      }

      const sanitizedState = {
        ...finalState,
        players: finalState.players.map((p) => ({
          ...p,
          holeCards: p.id === AI_PLAYER_ID ? [] : p.holeCards,
        })),
      };

      return NextResponse.json({
        success: true,
        action: "raise",
        finished: false,
        gameState: sanitizedState,
        pot: finalState.pot,
      });
    }

    // ── ADVANCE PHASE ─────────────────────────────────────────────────────────
    if (data.action === "advance_phase") {
      const gameState = data.gameState as PokerGameState;

      const updatedState = advancePhase(gameState);

      // If we reached showdown, determine winners
      if (updatedState.phase === "showdown") {
        const { result, outcome, humanWinAmount } = await settlePokerHand(
          user.id,
          updatedState,
          data.sessionId
        );

        return NextResponse.json({
          success: true,
          action: "advance_phase",
          finished: true,
          phase: "showdown",
          communityCards: updatedState.communityCards,
          outcome,
          winners: result.winners,
          winnings: result.winnings,
          rake: result.rake,
          evaluations: result.evaluations,
          humanWinAmount,
          // Reveal AI cards at showdown
          gameState: updatedState,
        });
      }

      const sanitizedState = {
        ...updatedState,
        players: updatedState.players.map((p) => ({
          ...p,
          holeCards: p.id === AI_PLAYER_ID ? [] : p.holeCards,
        })),
      };

      return NextResponse.json({
        success: true,
        action: "advance_phase",
        finished: false,
        phase: updatedState.phase,
        communityCards: updatedState.communityCards,
        gameState: sanitizedState,
        pot: updatedState.pot,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[Poker]", error);
    return NextResponse.json({ error: "Game error. Please try again." }, { status: 500 });
  }
}
