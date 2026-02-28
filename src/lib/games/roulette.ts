/**
 * Roulette Game Engine
 * European roulette: numbers 0-36, house edge = 1/37 ≈ 2.7%
 */

export const HOUSE_EDGE_ROULETTE = 1 / 37; // 2.70%

export type RouletteColor = "red" | "black" | "green";

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function getColor(number: number): RouletteColor {
  if (number === 0) return "green";
  return RED_NUMBERS.has(number) ? "red" : "black";
}

export function spin(): number {
  return Math.floor(Math.random() * 37); // 0 to 36
}

export type RouletteBetType =
  | { type: "straight"; number: number }
  | { type: "split"; numbers: [number, number] }
  | { type: "street"; numbers: [number, number, number] }
  | { type: "corner"; numbers: [number, number, number, number] }
  | { type: "line"; numbers: number[] }
  | { type: "column"; column: 1 | 2 | 3 }
  | { type: "dozen"; dozen: 1 | 2 | 3 }
  | { type: "color"; color: "red" | "black" }
  | { type: "parity"; parity: "even" | "odd" }
  | { type: "half"; half: "low" | "high" };

export interface RouletteBetResult {
  won: boolean;
  payout: number; // multiplier (e.g., 35 means 35x + stake back = 36x)
  number: number;
  color: RouletteColor;
}

export function calculatePayout(betType: RouletteBetType): number {
  switch (betType.type) {
    case "straight":  return 35;
    case "split":     return 17;
    case "street":    return 11;
    case "corner":    return 8;
    case "line":      return 5;
    case "column":    return 2;
    case "dozen":     return 2;
    case "color":     return 1;
    case "parity":    return 1;
    case "half":      return 1;
  }
}

export function resolveBet(
  betType: RouletteBetType,
  result: number
): RouletteBetResult {
  const color = getColor(result);
  let won = false;

  switch (betType.type) {
    case "straight":
      won = betType.number === result;
      break;

    case "split":
      won = betType.numbers.includes(result);
      break;

    case "street":
      won = betType.numbers.includes(result);
      break;

    case "corner":
      won = betType.numbers.includes(result);
      break;

    case "line":
      won = betType.numbers.includes(result);
      break;

    case "column":
      if (result === 0) { won = false; break; }
      won = result % 3 === betType.column % 3;
      break;

    case "dozen":
      if (result === 0) { won = false; break; }
      const dozen = Math.ceil(result / 12);
      won = dozen === betType.dozen;
      break;

    case "color":
      won = result !== 0 && color === betType.color;
      break;

    case "parity":
      if (result === 0) { won = false; break; }
      won = betType.parity === "even" ? result % 2 === 0 : result % 2 !== 0;
      break;

    case "half":
      if (result === 0) { won = false; break; }
      won = betType.half === "low" ? result <= 18 : result >= 19;
      break;
  }

  const payout = calculatePayout(betType);
  return { won, payout, number: result, color };
}

export function playRoulette(bets: { type: RouletteBetType; amount: number }[]): {
  result: number;
  color: RouletteColor;
  totalWin: number;
  totalBet: number;
  breakdown: { bet: RouletteBetType; amount: number; won: boolean; payout: number }[];
} {
  const result = spin();
  const color = getColor(result);
  let totalWin = 0;
  let totalBet = 0;

  const breakdown = bets.map((b) => {
    const resolved = resolveBet(b.type, result);
    const winAmount = resolved.won ? b.amount * (resolved.payout + 1) : 0;
    totalBet += b.amount;
    totalWin += winAmount;
    return { bet: b.type, amount: b.amount, won: resolved.won, payout: resolved.payout };
  });

  return { result, color, totalWin, totalBet, breakdown };
}
