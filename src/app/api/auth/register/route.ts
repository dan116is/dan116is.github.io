import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, isAgeVerified, createSession, submitKYC } from "@/lib/auth";
import { createWallet } from "@/lib/wallet";
import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  dateOfBirth: z.string(),
  character: z.object({
    name: z.string().min(2).max(30),
    gender: z.string(),
    skinTone: z.string(),
    hairStyle: z.string(),
    hairColor: z.string(),
    eyeColor: z.string(),
    bodyType: z.string(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, username, password, dateOfBirth, character } = parsed.data;
    const dob = new Date(dateOfBirth);

    if (!isAgeVerified(dob)) {
      return NextResponse.json(
        { error: "You must be 18 or older to register" },
        { status: 403 }
      );
    }

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return NextResponse.json(
        { error: existing.email === email ? "Email already registered" : "Username already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          dateOfBirth: dob,
          kycStatus: "SUBMITTED", // Will be approved after document review
        },
      });

      // Create wallet
      await tx.wallet.create({
        data: {
          userId: newUser.id,
          balance: 1000, // Welcome bonus: 1000 VC
          realBalance: 0,
        },
      });

      // Create welcome transaction
      await tx.transaction.create({
        data: {
          userId: newUser.id,
          walletId: (await tx.wallet.findUnique({ where: { userId: newUser.id } }))!.id,
          type: "BONUS",
          amount: 1000,
          fee: 0,
          netAmount: 1000,
          currency: "VC",
          status: "COMPLETED",
          description: "Welcome bonus — 1000 VC",
        },
      });

      // Create character
      await tx.character.create({
        data: {
          userId: newUser.id,
          ...character,
        },
      });

      return newUser;
    });

    // Create session
    const token = await createSession(
      user.id,
      req.headers.get("x-forwarded-for") ?? req.ip ?? undefined,
      req.headers.get("user-agent") ?? undefined
    );

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully. Please verify your identity.",
      userId: user.id,
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Register]", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
