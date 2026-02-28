/**
 * Slot Machine Game Engine
 * 5-reel, 3-row, 25-payline video slot
 * RTP (Return to Player): 94-96% → House edge 4-6%
 */

export const HOUSE_EDGE_SLOTS = 0.05; // 5%
export const RTP = 1 - HOUSE_EDGE_SLOTS; // 95%

export type SlotSymbol =
  | "CHERRY"
  | "LEMON"
  | "ORANGE"
  | "GRAPE"
  | "BELL"
  | "SEVEN"
  | "DIAMOND"
  | "WILD"
  | "SCATTER";

interface SymbolConfig {
  symbol: SlotSymbol;
  weight: number; // higher = more frequent
  payouts: Record<number, number>; // count → payout multiplier
}

const SYMBOLS: SymbolConfig[] = [
  {
    symbol: "CHERRY",
    weight: 40,
    payouts: { 3: 5, 4: 15, 5: 50 },
  },
  {
    symbol: "LEMON",
    weight: 35,
    payouts: { 3: 8, 4: 20, 5: 75 },
  },
  {
    symbol: "ORANGE",
    weight: 30,
    payouts: { 3: 10, 4: 25, 5: 100 },
  },
  {
    symbol: "GRAPE",
    weight: 25,
    payouts: { 3: 15, 4: 40, 5: 150 },
  },
  {
    symbol: "BELL",
    weight: 20,
    payouts: { 3: 20, 4: 75, 5: 250 },
  },
  {
    symbol: "SEVEN",
    weight: 12,
    payouts: { 3: 50, 4: 200, 5: 777 },
  },
  {
    symbol: "DIAMOND",
    weight: 8,
    payouts: { 3: 100, 4: 500, 5: 2000 },
  },
  {
    symbol: "WILD",
    weight: 5,
    payouts: { 3: 25, 4: 100, 5: 500 },
  },
  {
    symbol: "SCATTER",
    weight: 7,
    payouts: { 3: 5, 4: 20, 5: 100 }, // triggers free spins
  },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);

const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // middle row
  [0, 0, 0, 0, 0], // top row
  [2, 2, 2, 2, 2], // bottom row
  [0, 1, 2, 1, 0], // V shape
  [2, 1, 0, 1, 2], // inverted V
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 2, 2, 0],
  [2, 0, 0, 0, 2],
  [1, 0, 2, 0, 1],
  [1, 2, 0, 2, 1],
];

function getRandomSymbol(): SlotSymbol {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    rand -= s.weight;
    if (rand <= 0) return s.symbol;
  }
  return SYMBOLS[0].symbol;
}

export type Reels = SlotSymbol[][]; // [reel][row] = symbol

export function spinReels(): Reels {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => getRandomSymbol())
  );
}

interface PaylineResult {
  line: number;
  symbols: SlotSymbol[];
  count: number;
  multiplier: number;
}

export function evaluatePaylines(
  reels: Reels,
  betPerLine: number
): {
  paylineResults: PaylineResult[];
  scatterCount: number;
  totalWin: number;
  freeSpinsAwarded: number;
} {
  const paylineResults: PaylineResult[] = [];
  let totalWin = 0;

  for (let lineIdx = 0; lineIdx < PAYLINES.length; lineIdx++) {
    const payline = PAYLINES[lineIdx];
    const lineSymbols: SlotSymbol[] = payline.map(
      (row, reel) => reels[reel][row]
    );

    // Count consecutive matching symbols from left (wilds count as any)
    const firstSymbol = lineSymbols[0] === "WILD"
      ? lineSymbols.find((s) => s !== "WILD") ?? "WILD"
      : lineSymbols[0];

    let count = 0;
    for (const sym of lineSymbols) {
      if (sym === firstSymbol || sym === "WILD") count++;
      else break;
    }

    if (count >= 3) {
      const config = SYMBOLS.find((s) => s.symbol === firstSymbol);
      if (config && config.payouts[count]) {
        const multiplier = config.payouts[count];
        const win = betPerLine * multiplier;
        totalWin += win;
        paylineResults.push({ line: lineIdx, symbols: lineSymbols, count, multiplier });
      }
    }
  }

  // Count scatters (appear anywhere)
  const scatterCount = reels.flat().filter((s) => s === "SCATTER").length;
  let freeSpinsAwarded = 0;

  if (scatterCount >= 3) {
    freeSpinsAwarded = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20;
    const scatterPayout = SYMBOLS.find((s) => s.symbol === "SCATTER")!.payouts[scatterCount] ?? 0;
    totalWin += betPerLine * scatterPayout;
  }

  return { paylineResults, scatterCount, totalWin, freeSpinsAwarded };
}

export function playSlots(betPerLine: number, activelines: number = 25): {
  reels: Reels;
  results: ReturnType<typeof evaluatePaylines>;
  totalBet: number;
  totalWin: number;
  profit: number;
} {
  const lines = Math.min(activelines, PAYLINES.length);
  const totalBet = betPerLine * lines;
  const reels = spinReels();
  const results = evaluatePaylines(reels, betPerLine);

  return {
    reels,
    results,
    totalBet,
    totalWin: results.totalWin,
    profit: results.totalWin - totalBet,
  };
}
