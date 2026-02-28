import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listItem, buyListing, buyItemDirect, buyRealEstate, buyVehicle } from "@/lib/marketplace";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 24;
  const offset = (page - 1) * limit;

  const listings = await prisma.marketListing.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { item: { category: category as any } } : {}),
    },
    include: {
      item: true,
      seller: { select: { username: true, vipLevel: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const total = await prisma.marketListing.count({ where: { status: "ACTIVE" } });

  return NextResponse.json({ listings, total, page, pages: Math.ceil(total / limit) });
}

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list"),
    inventoryItemId: z.string(),
    price: z.number().positive(),
  }),
  z.object({
    action: z.literal("buy_listing"),
    listingId: z.string(),
  }),
  z.object({
    action: z.literal("buy_item"),
    itemId: z.string(),
  }),
  z.object({
    action: z.literal("buy_property"),
    realEstateId: z.string(),
  }),
  z.object({
    action: z.literal("buy_vehicle"),
    vehicleModelId: z.string(),
    color: z.string(),
  }),
]);

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
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const data = parsed.data;

    switch (data.action) {
      case "list":
        const listingId = await listItem(user.id, data.inventoryItemId, data.price);
        return NextResponse.json({ success: true, listingId });

      case "buy_listing":
        const buyResult = await buyListing(user.id, data.listingId);
        return NextResponse.json(buyResult);

      case "buy_item":
        const itemResult = await buyItemDirect(user.id, data.itemId);
        return NextResponse.json(itemResult);

      case "buy_property":
        const propResult = await buyRealEstate(user.id, data.realEstateId);
        return NextResponse.json(propResult);

      case "buy_vehicle":
        const vehResult = await buyVehicle(user.id, data.vehicleModelId, data.color);
        return NextResponse.json(vehResult);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Operation failed" }, { status: 400 });
  }
}
