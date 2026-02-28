/**
 * Texas Hold'em Poker Engine
 * Platform earns via rake (typically 2.5-5% of pot, capped)
 */

export const RAKE_PERCENT = 0.05; // 5%
export const RAKE_CAP_VC = 500;   // max rake per hand

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A";

export interface Card {
  suit: Suit;
  rank: Rank;
  numericValue: number;
}

export type HandRank =
  | "Royal Flush"
  | "Straight Flush"
  | "Four of a Kind"
  | "Full House"
  | "Flush"
  | "Straight"
  | "Three of a Kind"
  | "Two Pair"
  | "One Pair"
  | "High Card";

const RANK_VALUES: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, numericValue: RANK_VALUES[rank] });
    }
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface HandEvaluation {
  rank: HandRank;
  rankValue: number;
  bestCards: Card[];
  kickers: number[];
}

function countRanks(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const c of cards) {
    counts.set(c.numericValue, (counts.get(c.numericValue) ?? 0) + 1);
  }
  return counts;
}

function isFlush(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

function isStraight(vals: number[]): boolean {
  const sorted = [...new Set(vals)].sort((a, b) => b - a);
  if (sorted.length < 5) return false;
  for (let i = 0; i < sorted.length - 4; i++) {
    if (sorted[i] - sorted[i + 4] === 4) return true;
  }
  // Wheel: A-2-3-4-5
  if (sorted.includes(14) && sorted.includes(2) && sorted.includes(3) &&
      sorted.includes(4) && sorted.includes(5)) return true;
  return false;
}

/**
 * Evaluate best 5-card hand from 7 cards (2 hole + 5 community)
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  const vals = cards.map((c) => c.numericValue).sort((a, b) => b - a);
  const counts = countRanks(cards);
  const pairs = [...counts.entries()].filter(([, v]) => v === 2).map(([k]) => k).sort((a, b) => b - a);
  const trips = [...counts.entries()].filter(([, v]) => v === 3).map(([k]) => k).sort((a, b) => b - a);
  const quads = [...counts.entries()].filter(([, v]) => v === 4).map(([k]) => k).sort((a, b) => b - a);
  const flush = isFlush(cards.slice(0, 5)) && cards.length >= 5;
  const straight = isStraight(vals);

  if (flush && straight && vals[0] === 14 && vals[1] === 13) {
    return { rank: "Royal Flush", rankValue: 9, bestCards: cards.slice(0, 5), kickers: [] };
  }
  if (flush && straight) {
    return { rank: "Straight Flush", rankValue: 8, bestCards: cards.slice(0, 5), kickers: [vals[0]] };
  }
  if (quads.length > 0) {
    return { rank: "Four of a Kind", rankValue: 7, bestCards: cards.slice(0, 5), kickers: [quads[0]] };
  }
  if (trips.length > 0 && pairs.length > 0) {
    return { rank: "Full House", rankValue: 6, bestCards: cards.slice(0, 5), kickers: [trips[0], pairs[0]] };
  }
  if (flush) {
    return { rank: "Flush", rankValue: 5, bestCards: cards.slice(0, 5), kickers: vals.slice(0, 5) };
  }
  if (straight) {
    return { rank: "Straight", rankValue: 4, bestCards: cards.slice(0, 5), kickers: [vals[0]] };
  }
  if (trips.length > 0) {
    return { rank: "Three of a Kind", rankValue: 3, bestCards: cards.slice(0, 5), kickers: [trips[0]] };
  }
  if (pairs.length >= 2) {
    return { rank: "Two Pair", rankValue: 2, bestCards: cards.slice(0, 5), kickers: [pairs[0], pairs[1]] };
  }
  if (pairs.length === 1) {
    return { rank: "One Pair", rankValue: 1, bestCards: cards.slice(0, 5), kickers: [pairs[0]] };
  }
  return { rank: "High Card", rankValue: 0, bestCards: cards.slice(0, 5), kickers: vals.slice(0, 5) };
}

export interface PokerPlayer {
  id: string;
  holeCards: Card[];
  chips: number;
  bet: number;
  folded: boolean;
  isAllIn: boolean;
}

export interface PokerGameState {
  deck: Card[];
  players: PokerPlayer[];
  communityCards: Card[];
  pot: number;
  rake: number;
  phase: "preflop" | "flop" | "turn" | "river" | "showdown";
  activePlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
}

export function initPokerGame(
  playerIds: string[],
  startingChips: number,
  smallBlind: number
): PokerGameState {
  const deck = createDeck();
  const players: PokerPlayer[] = playerIds.map((id) => ({
    id,
    holeCards: [deck.pop()!, deck.pop()!],
    chips: startingChips,
    bet: 0,
    folded: false,
    isAllIn: false,
  }));

  const bigBlind = smallBlind * 2;
  const dealerIndex = 0;
  const sbIndex = 1 % players.length;
  const bbIndex = 2 % players.length;

  players[sbIndex].chips -= smallBlind;
  players[sbIndex].bet = smallBlind;
  players[bbIndex].chips -= bigBlind;
  players[bbIndex].bet = bigBlind;

  return {
    deck,
    players,
    communityCards: [],
    pot: smallBlind + bigBlind,
    rake: 0,
    phase: "preflop",
    activePlayerIndex: (bbIndex + 1) % players.length,
    dealerIndex,
    smallBlind,
    bigBlind,
    currentBet: bigBlind,
  };
}

export function advancePhase(state: PokerGameState): PokerGameState {
  const newState = { ...state, deck: [...state.deck] };
  const newCommunity = [...newState.communityCards];

  switch (newState.phase) {
    case "preflop":
      newCommunity.push(newState.deck.pop()!, newState.deck.pop()!, newState.deck.pop()!);
      newState.phase = "flop";
      break;
    case "flop":
      newCommunity.push(newState.deck.pop()!);
      newState.phase = "turn";
      break;
    case "turn":
      newCommunity.push(newState.deck.pop()!);
      newState.phase = "river";
      break;
    case "river":
      newState.phase = "showdown";
      break;
  }

  newState.communityCards = newCommunity;
  newState.currentBet = 0;
  newState.players = newState.players.map((p) => ({ ...p, bet: 0 }));
  return newState;
}

export function calculateRake(pot: number): number {
  return Math.min(pot * RAKE_PERCENT, RAKE_CAP_VC);
}

export function determineWinners(state: PokerGameState): {
  winners: string[];
  winnings: Record<string, number>;
  rake: number;
  evaluations: Record<string, HandEvaluation>;
} {
  const activePlayers = state.players.filter((p) => !p.folded);
  const evaluations: Record<string, HandEvaluation> = {};

  for (const player of activePlayers) {
    const allCards = [...player.holeCards, ...state.communityCards];
    evaluations[player.id] = evaluateHand(allCards);
  }

  // Sort by hand rank
  const sorted = [...activePlayers].sort((a, b) => {
    const evalA = evaluations[a.id];
    const evalB = evaluations[b.id];
    if (evalA.rankValue !== evalB.rankValue) return evalB.rankValue - evalA.rankValue;
    const kickersA = evalA.kickers;
    const kickersB = evalB.kickers;
    for (let i = 0; i < Math.min(kickersA.length, kickersB.length); i++) {
      if (kickersA[i] !== kickersB[i]) return kickersB[i] - kickersA[i];
    }
    return 0;
  });

  const topEval = evaluations[sorted[0].id];
  const winners = sorted.filter((p) => {
    const e = evaluations[p.id];
    return e.rankValue === topEval.rankValue;
  });

  const rake = calculateRake(state.pot);
  const netPot = state.pot - rake;
  const winPerPlayer = netPot / winners.length;

  const winnings: Record<string, number> = {};
  for (const w of winners) {
    winnings[w.id] = winPerPlayer;
  }

  return { winners: winners.map((w) => w.id), winnings, rake, evaluations };
}
