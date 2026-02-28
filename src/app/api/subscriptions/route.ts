import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { debitWallet } from "@/lib/wallet";
import { TransactionType } from "@prisma/client";
import { z } from "zod";

const SubscribeSchema = z.object({
  planId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    // Fetch all active plans and the user's current active subscription
    const [plans, activeSubscription] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { priceMonthly: "asc" },
      }),
      prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          expiresAt: { gte: new Date() },
        },
        include: { plan: true },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        level: plan.level,
        priceMonthly: plan.priceMonthly,
        benefits: plan.benefits,
        isCurrent: activeSubscription?.planId === plan.id,
      })),
      currentSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            planId: activeSubscription.planId,
            planName: activeSubscription.plan.name,
            level: activeSubscription.plan.level,
            status: activeSubscription.status,
            startedAt: activeSubscription.startedAt,
            expiresAt: activeSubscription.expiresAt,
            renewedAt: activeSubscription.renewedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[Subscriptions GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription plans." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { planId } = parsed.data;

    // Verify the plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: "Subscription plan not found or unavailable." },
        { status: 404 }
      );
    }

    // Check if user already has an active subscription to this plan
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        planId,
        status: "ACTIVE",
        expiresAt: { gte: new Date() },
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You are already subscribed to this plan." },
        { status: 409 }
      );
    }

    // Debit monthly fee from wallet (in VC — priceMonthly is treated as VC cost)
    const debitSuccess = await debitWallet(
      user.id,
      plan.priceMonthly,
      TransactionType.SUBSCRIPTION,
      `Subscription: ${plan.name} — monthly fee`,
      planId
    );

    if (!debitSuccess) {
      return NextResponse.json(
        { error: "Insufficient balance. Please deposit more virtual coins." },
        { status: 402 }
      );
    }

    // Cancel any existing active subscriptions for this user
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    // Create new subscription (30-day period)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.$transaction(async (tx) => {
      const newSub = await tx.subscription.create({
        data: {
          userId: user.id,
          planId,
          status: "ACTIVE",
          startedAt: now,
          expiresAt,
        },
        include: { plan: true },
      });

      // Upgrade user VIP level to match plan level
      await tx.user.update({
        where: { id: user.id },
        data: { vipLevel: plan.level },
      });

      // Record platform revenue
      await tx.platformRevenue.create({
        data: {
          source: "SUBSCRIPTION",
          amount: plan.priceMonthly,
          userId: user.id,
          reference: newSub.id,
        },
      });

      return newSub;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully subscribed to ${plan.name}.`,
        subscription: {
          id: subscription.id,
          planId: subscription.planId,
          planName: subscription.plan.name,
          level: subscription.plan.level,
          status: subscription.status,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Subscriptions POST]", error);
    return NextResponse.json(
      { error: "Failed to process subscription." },
      { status: 500 }
    );
  }
}
