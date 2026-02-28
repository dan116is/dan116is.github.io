import { prisma } from "./db";
import { creditWallet, debitWallet } from "./wallet";
import { BetResult, BetStatus, EventStatus, TransactionType } from "@prisma/client";

/** Platform margin on sports odds */
export const SPORTS_MARGIN = 0.05; // 5% margin built into odds

export function applyMargin(trueOdds: number): number {
  // Convert to implied probability, add margin, convert back
  const impliedProb = 1 / trueOdds;
  const adjustedProb = impliedProb * (1 + SPORTS_MARGIN);
  return 1 / adjustedProb;
}

export function generateOdds(homeStrength: number, awayStrength: number): {
  home: number;
  draw: number;
  away: number;
} {
  const total = homeStrength + awayStrength + 0.3; // draw factor
  const trueHome = total / homeStrength;
  const trueDraw = total / 0.3;
  const trueAway = total / awayStrength;

  return {
    home: Math.round(applyMargin(trueHome) * 100) / 100,
    draw: Math.round(applyMargin(trueDraw) * 100) / 100,
    away: Math.round(applyMargin(trueAway) * 100) / 100,
  };
}

export async function placeSportsBet(
  userId: string,
  eventId: string,
  selection: string,
  amount: number
): Promise<{ success: boolean; betId: string; potentialWin: number }> {
  const event = await prisma.sportEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");
  if (event.status !== "UPCOMING" && event.status !== "LIVE") {
    throw new Error("Event is not open for betting");
  }

  const odds = event.odds as Record<string, number>;
  const selectionOdds = odds[selection];
  if (!selectionOdds) throw new Error("Invalid selection");

  const potentialWin = amount * selectionOdds;

  const debited = await debitWallet(
    userId,
    amount,
    TransactionType.BET_PLACE,
    `Sports bet: ${event.homeTeam} vs ${event.awayTeam} - ${selection}`,
    eventId
  );

  if (!debited) throw new Error("Insufficient balance");

  const bet = await prisma.sportsBet.create({
    data: {
      userId,
      eventId,
      selection,
      odds: selectionOdds,
      amount,
      potentialWin,
      status: BetStatus.ACTIVE,
    },
  });

  await prisma.sportEvent.update({
    where: { id: eventId },
    data: { totalBetPool: { increment: amount } },
  });

  return { success: true, betId: bet.id, potentialWin };
}

export async function resolveSportsBets(
  eventId: string,
  result: string // "home", "draw", "away"
): Promise<{ resolved: number; totalPaidOut: number; platformRevenue: number }> {
  const event = await prisma.sportEvent.findUnique({
    where: { id: eventId },
    include: { bets: { where: { status: BetStatus.ACTIVE } } },
  });

  if (!event) throw new Error("Event not found");

  let totalPaidOut = 0;
  let platformRevenue = 0;
  let resolved = 0;

  for (const bet of event.bets) {
    const won = bet.selection === result;
    const payout = won ? bet.potentialWin : 0;

    await prisma.sportsBet.update({
      where: { id: bet.id },
      data: {
        status: BetStatus.RESOLVED,
        result: won ? BetResult.WIN : BetResult.LOSS,
        payout,
        resolvedAt: new Date(),
      },
    });

    if (won) {
      await creditWallet(
        bet.userId,
        payout,
        TransactionType.BET_WIN,
        `Sports bet win: ${event.homeTeam} vs ${event.awayTeam}`,
        bet.id
      );
      totalPaidOut += payout;
    }

    resolved++;
  }

  platformRevenue = event.totalBetPool - totalPaidOut;

  await prisma.sportEvent.update({
    where: { id: eventId },
    data: { status: EventStatus.COMPLETED, result },
  });

  if (platformRevenue > 0) {
    await prisma.platformRevenue.create({
      data: {
        source: "HOUSE_EDGE",
        amount: platformRevenue / 100, // convert VC to USD equivalent
        reference: eventId,
        metadata: { type: "sports_betting", eventId },
      },
    });
  }

  return { resolved, totalPaidOut, platformRevenue };
}

export async function getUpcomingEvents(sport?: string, limit = 20) {
  return prisma.sportEvent.findMany({
    where: {
      status: "UPCOMING",
      ...(sport ? { sport: sport as any } : {}),
      startTime: { gt: new Date() },
    },
    orderBy: { startTime: "asc" },
    take: limit,
  });
}

export async function getLiveEvents() {
  return prisma.sportEvent.findMany({
    where: { status: "LIVE" },
    orderBy: { startTime: "asc" },
  });
}
