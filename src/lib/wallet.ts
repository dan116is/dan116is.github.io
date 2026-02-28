import { prisma } from "./db";
import { TransactionType, TxStatus } from "@prisma/client";

/** Exchange rate: 1 USD = 100 Virtual Coins */
export const VC_PER_USD = 100;

/** Platform fees */
export const FEES = {
  DEPOSIT: 0.02,       // 2% on deposits
  WITHDRAWAL: 0.03,    // 3% on withdrawals
  MARKETPLACE: 0.05,   // 5% on marketplace transactions
  TOURNAMENT: 0.10,    // 10% of tournament prize pools
  TRANSFER: 0.01,      // 1% on P2P transfers
} as const;

export async function getWallet(userId: string) {
  return prisma.wallet.findUnique({ where: { userId } });
}

export async function createWallet(userId: string) {
  return prisma.wallet.create({
    data: { userId, balance: 0, realBalance: 0 },
  });
}

export async function deposit(
  userId: string,
  amountUSD: number
): Promise<{ success: boolean; virtualCoins: number; fee: number }> {
  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");

  const fee = amountUSD * FEES.DEPOSIT;
  const netAmountUSD = amountUSD - fee;
  const virtualCoins = netAmountUSD * VC_PER_USD;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: {
        balance: { increment: virtualCoins },
        realBalance: { increment: netAmountUSD },
        totalDeposited: { increment: amountUSD },
      },
    }),
    prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type: TransactionType.DEPOSIT,
        amount: amountUSD,
        fee,
        netAmount: netAmountUSD,
        currency: "USD",
        status: TxStatus.COMPLETED,
        description: `Deposit: $${amountUSD} USD → ${virtualCoins} VC`,
      },
    }),
    prisma.platformRevenue.create({
      data: {
        source: "DEPOSIT_FEE",
        amount: fee,
        userId,
      },
    }),
  ]);

  return { success: true, virtualCoins, fee };
}

export async function withdraw(
  userId: string,
  amountVC: number
): Promise<{ success: boolean; amountUSD: number; fee: number }> {
  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");
  if (wallet.balance < amountVC) throw new Error("Insufficient balance");

  const grossUSD = amountVC / VC_PER_USD;
  const fee = grossUSD * FEES.WITHDRAWAL;
  const netUSD = grossUSD - fee;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amountVC },
        realBalance: { decrement: grossUSD },
        totalWithdrawn: { increment: netUSD },
      },
    }),
    prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type: TransactionType.WITHDRAWAL,
        amount: amountVC,
        fee: fee * VC_PER_USD,
        netAmount: amountVC - fee * VC_PER_USD,
        currency: "VC",
        status: TxStatus.COMPLETED,
        description: `Withdrawal: ${amountVC} VC → $${netUSD.toFixed(2)} USD`,
      },
    }),
    prisma.platformRevenue.create({
      data: {
        source: "WITHDRAWAL_FEE",
        amount: fee,
        userId,
      },
    }),
  ]);

  return { success: true, amountUSD: netUSD, fee };
}

export async function debitWallet(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  reference?: string
): Promise<boolean> {
  const wallet = await getWallet(userId);
  if (!wallet || wallet.balance < amount) return false;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type,
        amount,
        fee: 0,
        netAmount: -amount,
        currency: "VC",
        status: TxStatus.COMPLETED,
        description,
        reference,
      },
    }),
  ]);

  return true;
}

export async function creditWallet(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  reference?: string
): Promise<void> {
  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type,
        amount,
        fee: 0,
        netAmount: amount,
        currency: "VC",
        status: TxStatus.COMPLETED,
        description,
        reference,
      },
    }),
  ]);
}

export async function lockFunds(userId: string, amount: number): Promise<boolean> {
  const wallet = await getWallet(userId);
  if (!wallet || wallet.balance < amount) return false;

  await prisma.wallet.update({
    where: { userId },
    data: {
      balance: { decrement: amount },
      lockedBalance: { increment: amount },
    },
  });

  return true;
}

export async function unlockFunds(userId: string, amount: number): Promise<void> {
  await prisma.wallet.update({
    where: { userId },
    data: {
      lockedBalance: { decrement: amount },
      balance: { increment: amount },
    },
  });
}
