import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateCharacterSchema = z.object({
  name: z.string().min(2).max(30).optional(),
  gender: z.string().optional(),
  skinTone: z.string().optional(),
  hairStyle: z.string().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  bodyType: z.string().optional(),
  height: z.number().min(1.4).max(2.2).optional(),
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

    const character = await prisma.character.findUnique({
      where: { userId: user.id },
    });

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    return NextResponse.json({ character });
  } catch (error) {
    console.error("[User/Character GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch character." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const parsed = UpdateCharacterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid character data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided." },
        { status: 400 }
      );
    }

    // Ensure the character exists for this user
    const existing = await prisma.character.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const character = await prisma.character.update({
      where: { userId: user.id },
      data: updates,
    });

    return NextResponse.json({ success: true, character });
  } catch (error) {
    console.error("[User/Character PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update character." },
      { status: 500 }
    );
  }
}
