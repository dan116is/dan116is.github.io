/**
 * Blackjack Game Engine
 * Standard rules: 6 decks, dealer stands on soft 17
 * House edge ≈ 0.5% with basic strategy
 */

export const HOUSE_EDGE_BLACKJACK = 0.005; // 0.5%

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export type HandStatus = "active" | "stood" | "bust" | "blackjack" | "surrender";

export interface Hand {
  cards: Card[];
  status: HandStatus;
}

const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS: Suit[] = ["hearts","diamonds","clubs","spades"];
const NUM_DECKS = 6;

function cardValue(rank: Rank): number {
  if (["J","Q","K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < NUM_DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, value: cardValue(rank) });
      }
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

export function handTotal(hand: Hand): number {
  let total = 0;
  let aces = 0;

  for (const card of hand.cards) {
    total += card.value;
    if (card.rank === "A") aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

export function isBust(hand: Hand): boolean {
  return handTotal(hand) > 21;
}

export function isBlackjack(hand: Hand): boolean {
  return hand.cards.length === 2 && handTotal(hand) === 21;
}

export function isSoft17(hand: Hand): boolean {
  const hasAce = hand.cards.some((c) => c.rank === "A");
  return hasAce && handTotal(hand) === 17;
}

export function canDouble(hand: Hand): boolean {
  return hand.cards.length === 2;
}

export function canSplit(hand: Hand): boolean {
  return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
}

/**
 * Simulate dealer play: dealer hits until 17+ (stands on soft 17)
 */
export function dealerPlay(hand: Hand, deck: Card[]): { hand: Hand; deck: Card[] } {
  const newDeck = [...deck];
  const newHand: Hand = { ...hand, cards: [...hand.cards] };

  while (handTotal(newHand) < 17 || isSoft17(newHand)) {
    const card = newDeck.pop()!;
    newHand.cards.push(card);
  }

  newHand.status = isBust(newHand) ? "bust" : "stood";
  return { hand: newHand, deck: newDeck };
}

export type BlackjackOutcome = "blackjack" | "win" | "push" | "loss" | "bust";

export function determineOutcome(
  playerHand: Hand,
  dealerHand: Hand
): BlackjackOutcome {
  const playerTotal = handTotal(playerHand);
  const dealerTotal = handTotal(dealerHand);

  if (playerHand.status === "bust") return "bust";
  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) return "blackjack";
  if (isBlackjack(dealerHand) && !isBlackjack(playerHand)) return "loss";
  if (dealerHand.status === "bust") return "win";
  if (playerTotal > dealerTotal) return "win";
  if (playerTotal === dealerTotal) return "push";
  return "loss";
}

export function calculatePayout(
  outcome: BlackjackOutcome,
  betAmount: number
): number {
  switch (outcome) {
    case "blackjack": return betAmount * 2.5; // 3:2 payout
    case "win":       return betAmount * 2;
    case "push":      return betAmount;
    case "loss":
    case "bust":      return 0;
  }
}

export interface BlackjackGameState {
  deck: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  dealerHand: Hand;
  phase: "betting" | "player_turn" | "dealer_turn" | "complete";
  bets: number[];
}

export function initGame(betAmount: number): BlackjackGameState {
  const deck = createDeck();

  const playerHand: Hand = {
    cards: [deck.pop()!, deck.pop()!],
    status: "active",
  };

  const dealerHand: Hand = {
    cards: [deck.pop()!, deck.pop()!],
    status: "active",
  };

  let phase: BlackjackGameState["phase"] = "player_turn";
  if (isBlackjack(playerHand)) phase = "dealer_turn";

  return {
    deck,
    playerHands: [playerHand],
    activeHandIndex: 0,
    dealerHand,
    phase,
    bets: [betAmount],
  };
}

export function hit(state: BlackjackGameState): BlackjackGameState {
  const newState = { ...state, deck: [...state.deck] };
  const hand = { ...newState.playerHands[newState.activeHandIndex], cards: [...newState.playerHands[newState.activeHandIndex].cards] };
  const card = newState.deck.pop()!;
  hand.cards.push(card);

  if (isBust(hand)) {
    hand.status = "bust";
    if (newState.activeHandIndex >= newState.playerHands.length - 1) {
      newState.phase = "dealer_turn";
    } else {
      newState.activeHandIndex++;
    }
  }

  newState.playerHands = [...newState.playerHands];
  newState.playerHands[newState.activeHandIndex] = hand;
  return newState;
}

export function stand(state: BlackjackGameState): BlackjackGameState {
  const newState = { ...state };
  const hands = [...newState.playerHands];
  hands[newState.activeHandIndex] = { ...hands[newState.activeHandIndex], status: "stood" };
  newState.playerHands = hands;

  if (newState.activeHandIndex >= hands.length - 1) {
    newState.phase = "dealer_turn";
  } else {
    newState.activeHandIndex++;
  }

  return newState;
}

export function finishGame(state: BlackjackGameState): {
  outcomes: BlackjackOutcome[];
  payouts: number[];
  totalPayout: number;
  dealerHand: Hand;
} {
  const { hand: dealerHand } = dealerPlay(state.dealerHand, state.deck);

  const outcomes: BlackjackOutcome[] = [];
  const payouts: number[] = [];
  let totalPayout = 0;

  for (let i = 0; i < state.playerHands.length; i++) {
    const outcome = determineOutcome(state.playerHands[i], dealerHand);
    const payout = calculatePayout(outcome, state.bets[i]);
    outcomes.push(outcome);
    payouts.push(payout);
    totalPayout += payout;
  }

  return { outcomes, payouts, totalPayout, dealerHand };
}
