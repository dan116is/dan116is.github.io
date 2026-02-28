import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { getWallet, deposit, withdraw } from "@/lib/wallet";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await validateSession(token);
  if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const wallet = await getWallet(user.id);
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const recent = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    balance: wallet.balance,
    realBalance: wallet.realBalance,
    lockedBalance: wallet.lockedBalance,
    totalDeposited: wallet.totalDeposited,
    totalWithdrawn: wallet.totalWithdrawn,
    totalWon: wallet.totalWon,
    totalLost: wallet.totalLost,
    recentTransactions: recent,
  });
}

const DepositSchema = z.object({
  amountUSD: z.number().positive().min(10).max(10000),
  paymentMethodId: z.string(), // Stripe payment method ID in production
});

const WithdrawSchema = z.object({
  amountVC: z.number().positive().min(1000),
  bankAccountId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    if (!user.isVerified) {
      return NextResponse.json({ error: "KYC verification required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    if (action === "deposit") {
      const parsed = DepositSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid deposit data" }, { status: 400 });
      }

      // In production: process Stripe payment here before crediting
      const result = await deposit(user.id, parsed.data.amountUSD);
      return NextResponse.json(result);
    }

    if (action === "withdraw") {
      const parsed = WithdrawSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid withdrawal data" }, { status: 400 });
      }

      const result = await withdraw(user.id, parsed.data.amountVC);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Operation failed" }, { status: 400 });
  }
}
