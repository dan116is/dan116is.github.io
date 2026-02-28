import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet, creditWallet } from "@/lib/wallet";
import { TransactionType, BetStatus, BetResult } from "@prisma/client";
import { z } from "zod";

// Binary options house edge: pay 1.8x on wins (vs fair 2.0x) → 10% edge
const BINARY_ODDS = 1.8;

// Mock market data (in production this would come from a live price feed)
const MOCK_MARKETS = [
  { id: "btc-usd", symbol: "BTC/USD", name: "Bitcoin", currentPrice: 67500.0, category: "crypto" },
  { id: "eth-usd", symbol: "ETH/USD", name: "Ethereum", currentPrice: 3200.0, category: "crypto" },
  { id: "eur-usd", symbol: "EUR/USD", name: "Euro / US Dollar", currentPrice: 1.0875, category: "forex" },
  { id: "spx",     symbol: "SPX",     name: "S&P 500 Index",  currentPrice: 5234.0, category: "indices" },
  { id: "gold",    symbol: "GOLD",    name: "Gold (XAU/USD)", currentPrice: 2345.0, category: "commodities" },
  { id: "oil",     symbol: "OIL",     name: "Crude Oil (WTI)", currentPrice: 78.5, category: "commodities" },
] as const;

type MarketId = typeof MOCK_MARKETS[number]["id"];

/** Simulate a price movement for resolution purposes */
function simulatePriceMovement(entryPrice: number, durationSeconds: number): number {
  // Volatility scales with duration: longer = more movement
  const volatilityFactor = Math.sqrt(durationSeconds / 3600) * 0.02; // up to 2% per hour
  const change = (Math.random() * 2 - 1) * volatilityFactor;
  return entryPrice * (1 + change);
}

const ALLOWED_DURATIONS = [60, 300, 900, 3600] as const;
type Duration = typeof ALLOWED_DURATIONS[number];

const PlaceBetSchema = z.object({
  action: z.literal("place_bet"),
  marketId: z.string(),
  direction: z.enum(["up", "down"]),
  amount: z.number().positive().min(10).max(1000000),
  duration: z.union([
    z.literal(60),
    z.literal(300),
    z.literal(900),
    z.literal(3600),
  ]),
});

const ResolveBetSchema = z.object({
  betId: z.string(),
});

// ── GET: List active markets ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    // Enrich mock markets with DB entries if they exist, otherwise use mock data
    const dbMarkets = await prisma.financialMarket.findMany({
      where: { isActive: true },
    });

    const dbMarketMap = new Map(dbMarkets.map((m) => [m.symbol, m]));

    const markets = MOCK_MARKETS.map((m) => {
      const dbMarket = dbMarketMap.get(m.symbol);
      return {
        id: dbMarket?.id ?? m.id,
        symbol: m.symbol,
        name: m.name,
        category: m.category,
        currentPrice: dbMarket?.currentPrice ?? m.currentPrice,
        odds: BINARY_ODDS,
        durations: ALLOWED_DURATIONS,
      };
    });

    return NextResponse.json({ success: true, markets });
  } catch (error) {
    console.error("[Finance GET]", error);
    return NextResponse.json({ error: "Failed to fetch markets." }, { status: 500 });
  }
}

// ── POST: Place a binary prediction bet ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    if (!user.isVerified)
      return NextResponse.json({ error: "Account not verified" }, { status: 403 });

    const body = await req.json();
    const parsed = PlaceBetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { marketId, direction, amount, duration } = parsed.data;

    // Resolve market — check DB first, fall back to mock
    let dbMarketId: string;
    let entryPrice: number;

    const dbMarket = await prisma.financialMarket.findFirst({
      where: { OR: [{ id: marketId }, { symbol: marketId }], isActive: true },
    });

    if (dbMarket) {
      dbMarketId = dbMarket.id;
      entryPrice = dbMarket.currentPrice;
    } else {
      // Look up in mock data (by id or symbol)
      const mockMarket = MOCK_MARKETS.find(
        (m) => m.id === marketId || m.symbol === marketId
      );
      if (!mockMarket) {
        return NextResponse.json({ error: "Market not found or inactive" }, { status: 404 });
      }

      // Upsert mock market into DB for tracking
      const created = await prisma.financialMarket.upsert({
        where: { id: mockMarket.id },
        update: {},
        create: {
          id: mockMarket.id,
          symbol: mockMarket.symbol,
          name: mockMarket.name,
          currentPrice: mockMarket.currentPrice,
          priceHistory: [],
          isActive: true,
        },
      });
      dbMarketId = created.id;
      entryPrice = created.currentPrice;
    }

    // Debit wallet
    const debited = await debitWallet(
      user.id,
      amount,
      TransactionType.BET_PLACE,
      `Financial bet — ${direction.toUpperCase()} ${marketId} for ${duration}s`
    );
    if (!debited) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + duration * 1000);

    // Create FinancialBet record
    const bet = await prisma.financialBet.create({
      data: {
        userId: user.id,
        marketId: dbMarketId,
        direction,
        duration,
        entryPrice,
        amount,
        odds: BINARY_ODDS,
        status: BetStatus.ACTIVE,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      betId: bet.id,
      marketId: dbMarketId,
      direction,
      amount,
      entryPrice,
      odds: BINARY_ODDS,
      potentialPayout: amount * BINARY_ODDS,
      expiresAt,
      durationSeconds: duration,
    });
  } catch (error) {
    console.error("[Finance POST]", error);
    return NextResponse.json({ error: "Failed to place bet." }, { status: 500 });
  }
}

// ── PATCH: Resolve a bet ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const parsed = ResolveBetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { betId } = parsed.data;

    const bet = await prisma.financialBet.findUnique({
      where: { id: betId },
      include: { market: true },
    });

    if (!bet) {
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    // Only the bet owner or an admin can resolve
    if (bet.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (bet.status !== BetStatus.ACTIVE) {
      return NextResponse.json({ error: "Bet already resolved" }, { status: 400 });
    }

    if (new Date() < bet.expiresAt) {
      return NextResponse.json(
        {
          error: "Bet has not expired yet",
          expiresAt: bet.expiresAt,
          remainingSeconds: Math.ceil((bet.expiresAt.getTime() - Date.now()) / 1000),
        },
        { status: 400 }
      );
    }

    // Simulate exit price based on duration and entry price
    const exitPrice = simulatePriceMovement(bet.entryPrice, bet.duration);
    const priceWentUp = exitPrice > bet.entryPrice;
    const playerWon =
      (bet.direction === "up" && priceWentUp) ||
      (bet.direction === "down" && !priceWentUp);

    const result: BetResult = playerWon ? BetResult.WIN : BetResult.LOSS;
    const payout = playerWon ? bet.amount * BINARY_ODDS : 0;

    // Update bet record
    await prisma.financialBet.update({
      where: { id: betId },
      data: {
        exitPrice,
        status: BetStatus.RESOLVED,
        result,
        payout,
        resolvedAt: new Date(),
      },
    });

    // Credit wallet if won
    if (playerWon && payout > 0) {
      await creditWallet(
        bet.userId,
        payout,
        TransactionType.BET_WIN,
        `Financial bet win — ${bet.direction.toUpperCase()} ${bet.market.symbol} × ${BINARY_ODDS}`,
        betId
      );
    }

    // Track house revenue on losses
    if (!playerWon) {
      await prisma.platformRevenue.create({
        data: {
          source: "HOUSE_EDGE",
          amount: bet.amount / 100,
          userId: bet.userId,
          reference: betId,
          metadata: {
            game: "financial_bet",
            market: bet.market.symbol,
            direction: bet.direction,
            entryPrice: bet.entryPrice,
            exitPrice,
          },
        },
      });
    } else {
      // Track the house edge portion even on wins (odds < 2.0 means house keeps difference)
      const houseEdgeAmount = bet.amount * (2.0 - BINARY_ODDS);
      await prisma.platformRevenue.create({
        data: {
          source: "HOUSE_EDGE",
          amount: houseEdgeAmount / 100,
          userId: bet.userId,
          reference: betId,
          metadata: {
            game: "financial_bet",
            market: bet.market.symbol,
            direction: bet.direction,
            houseEdgeFraction: 2.0 - BINARY_ODDS,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      betId,
      result,
      won: playerWon,
      entryPrice: bet.entryPrice,
      exitPrice,
      direction: bet.direction,
      amount: bet.amount,
      payout,
      profit: payout - bet.amount,
      market: bet.market.symbol,
    });
  } catch (error) {
    console.error("[Finance PATCH]", error);
    return NextResponse.json({ error: "Failed to resolve bet." }, { status: 500 });
  }
}
