import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { placeSportsBet, getUpcomingEvents, getLiveEvents } from "@/lib/sports-betting";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "upcoming";
  const sport = searchParams.get("sport") ?? undefined;

  if (type === "live") {
    const events = await getLiveEvents();
    return NextResponse.json({ events });
  }

  const events = await getUpcomingEvents(sport, 50);
  return NextResponse.json({ events });
}

const BetSchema = z.object({
  eventId: z.string(),
  selection: z.enum(["home", "draw", "away"]),
  amount: z.number().positive().min(10),
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
    const parsed = BetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid bet data" }, { status: 400 });
    }

    const { eventId, selection, amount } = parsed.data;
    const result = await placeSportsBet(user.id, eventId, selection, amount);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Bet failed" }, { status: 400 });
  }
}
