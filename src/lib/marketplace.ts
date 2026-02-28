import { prisma } from "./db";
import { creditWallet, debitWallet } from "./wallet";
import { TransactionType, ListingStatus } from "@prisma/client";
import { FEES } from "./wallet";

export async function listItem(
  sellerId: string,
  inventoryItemId: string,
  price: number
): Promise<string> {
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { id: inventoryItemId, userId: sellerId },
    include: { item: true },
  });

  if (!inventoryItem) throw new Error("Item not found in inventory");

  const listing = await prisma.marketListing.create({
    data: {
      sellerId,
      itemId: inventoryItem.itemId,
      price,
      platformFee: FEES.MARKETPLACE,
      status: ListingStatus.ACTIVE,
    },
  });

  return listing.id;
}

export async function buyListing(
  buyerId: string,
  listingId: string
): Promise<{ success: boolean; fee: number; netToSeller: number }> {
  const listing = await prisma.marketListing.findUnique({
    where: { id: listingId },
    include: { item: true },
  });

  if (!listing || listing.status !== "ACTIVE") {
    throw new Error("Listing not available");
  }

  if (listing.sellerId === buyerId) {
    throw new Error("Cannot buy your own listing");
  }

  const fee = listing.price * listing.platformFee;
  const netToSeller = listing.price - fee;

  const debited = await debitWallet(
    buyerId,
    listing.price,
    TransactionType.PURCHASE,
    `Marketplace purchase: ${listing.item.name}`,
    listingId
  );

  if (!debited) throw new Error("Insufficient balance");

  await creditWallet(
    listing.sellerId,
    netToSeller,
    TransactionType.SALE,
    `Marketplace sale: ${listing.item.name}`,
    listingId
  );

  await prisma.$transaction([
    prisma.marketListing.update({
      where: { id: listingId },
      data: { status: ListingStatus.SOLD, soldAt: new Date() },
    }),
    prisma.marketPurchase.create({
      data: { buyerId, listingId, price: listing.price, platformFee: fee },
    }),
    prisma.inventoryItem.updateMany({
      where: { userId: listing.sellerId, itemId: listing.itemId },
      data: { userId: buyerId },
    }),
    prisma.platformRevenue.create({
      data: {
        source: "MARKETPLACE_FEE",
        amount: fee / 100,
        userId: buyerId,
        reference: listingId,
      },
    }),
  ]);

  return { success: true, fee, netToSeller };
}

export async function buyItemDirect(
  userId: string,
  itemId: string
): Promise<{ success: boolean; item: any }> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");
  if (!item.isAvailable) throw new Error("Item not available");

  if (item.totalSupply !== null && item.soldCount >= item.totalSupply) {
    throw new Error("Item sold out");
  }

  const price = item.price * (1 + item.markup);

  const debited = await debitWallet(
    userId,
    price,
    TransactionType.PURCHASE,
    `Item purchase: ${item.name}`,
    itemId
  );

  if (!debited) throw new Error("Insufficient balance");

  const [inventoryItem] = await prisma.$transaction([
    prisma.inventoryItem.create({
      data: { userId, itemId, equipped: false },
    }),
    prisma.item.update({
      where: { id: itemId },
      data: { soldCount: { increment: 1 } },
    }),
    prisma.platformRevenue.create({
      data: {
        source: "ITEM_MARKUP",
        amount: (price - item.price) / 100,
        userId,
        reference: itemId,
      },
    }),
  ]);

  return { success: true, item: inventoryItem };
}

export async function buyRealEstate(
  userId: string,
  realEstateId: string
): Promise<{ success: boolean; property: any }> {
  const re = await prisma.realEstate.findUnique({ where: { id: realEstateId } });
  if (!re || !re.isAvailable) throw new Error("Property not available");

  const finalPrice = re.currentPrice * (1 + re.markup);

  const debited = await debitWallet(
    userId,
    finalPrice,
    TransactionType.PURCHASE,
    `Real estate purchase: ${re.name}`,
    realEstateId
  );

  if (!debited) throw new Error("Insufficient balance");

  const [property] = await prisma.$transaction([
    prisma.property.create({
      data: { userId, realEstateId, purchasePrice: finalPrice, canHostEvents: re.capacity > 1 },
    }),
    prisma.realEstate.update({
      where: { id: realEstateId },
      data: { isAvailable: false },
    }),
    prisma.platformRevenue.create({
      data: {
        source: "REAL_ESTATE_MARKUP",
        amount: (finalPrice - re.currentPrice) / 100,
        userId,
        reference: realEstateId,
      },
    }),
  ]);

  return { success: true, property };
}

export async function buyVehicle(
  userId: string,
  vehicleModelId: string,
  color: string
): Promise<{ success: boolean; vehicle: any }> {
  const model = await prisma.vehicleModel.findUnique({ where: { id: vehicleModelId } });
  if (!model || !model.isAvailable) throw new Error("Vehicle not available");

  const finalPrice = model.currentPrice * (1 + model.markup);

  const debited = await debitWallet(
    userId,
    finalPrice,
    TransactionType.PURCHASE,
    `Vehicle purchase: ${model.brand} ${model.name}`,
    vehicleModelId
  );

  if (!debited) throw new Error("Insufficient balance");

  const [vehicle] = await prisma.$transaction([
    prisma.vehicle.create({
      data: { userId, vehicleModelId, color, purchasePrice: finalPrice },
    }),
    prisma.platformRevenue.create({
      data: {
        source: "VEHICLE_MARKUP",
        amount: (finalPrice - model.currentPrice) / 100,
        userId,
        reference: vehicleModelId,
      },
    }),
  ]);

  return { success: true, vehicle };
}
