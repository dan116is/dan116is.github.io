import { PrismaClient, SportType, EventStatus, PropertyType, VehicleType, ItemCategory, ItemRarity, VIPLevel, UserRole, KYCStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Generate realistic odds for a sport event
function generateOdds(sport: SportType): { home: number; draw: number; away: number } {
  const rand = () => Math.random();

  switch (sport) {
    case SportType.FOOTBALL: {
      const homeStrength = 0.4 + rand() * 0.3;
      const drawProb = 0.2 + rand() * 0.1;
      const awayStrength = 1 - homeStrength - drawProb;
      return {
        home: parseFloat((1 / homeStrength * 0.93).toFixed(2)),
        draw: parseFloat((1 / drawProb * 0.93).toFixed(2)),
        away: parseFloat((1 / awayStrength * 0.93).toFixed(2)),
      };
    }
    case SportType.BASKETBALL: {
      const homeProb = 0.45 + rand() * 0.2;
      return {
        home: parseFloat((1 / homeProb * 0.93).toFixed(2)),
        draw: 0,
        away: parseFloat((1 / (1 - homeProb) * 0.93).toFixed(2)),
      };
    }
    case SportType.TENNIS: {
      const playerProb = 0.4 + rand() * 0.3;
      return {
        home: parseFloat((1 / playerProb * 0.93).toFixed(2)),
        draw: 0,
        away: parseFloat((1 / (1 - playerProb) * 0.93).toFixed(2)),
      };
    }
    case SportType.FORMULA1: {
      const p1Prob = 0.3 + rand() * 0.3;
      return {
        home: parseFloat((1 / p1Prob * 0.93).toFixed(2)),
        draw: 0,
        away: parseFloat((1 / (1 - p1Prob) * 0.93).toFixed(2)),
      };
    }
    case SportType.GOLF: {
      const p1Prob = 0.35 + rand() * 0.25;
      return {
        home: parseFloat((1 / p1Prob * 0.93).toFixed(2)),
        draw: 0,
        away: parseFloat((1 / (1 - p1Prob) * 0.93).toFixed(2)),
      };
    }
    default: {
      return { home: 2.0, draw: 3.5, away: 2.0 };
    }
  }
}

async function main() {
  console.log("Starting database seed...");

  // ============================================================
  // SPORT EVENTS
  // ============================================================
  console.log("Seeding sport events...");

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sportEvents = await Promise.all([
    // Football 1: El Clasico
    prisma.sportEvent.upsert({
      where: { id: "sport-event-football-1" },
      update: {},
      create: {
        id: "sport-event-football-1",
        sport: SportType.FOOTBALL,
        homeTeam: "Real Madrid",
        awayTeam: "FC Barcelona",
        league: "La Liga",
        startTime: tomorrow,
        status: EventStatus.UPCOMING,
        odds: generateOdds(SportType.FOOTBALL),
        totalBetPool: 0,
      },
    }),

    // Football 2: Premier League
    prisma.sportEvent.upsert({
      where: { id: "sport-event-football-2" },
      update: {},
      create: {
        id: "sport-event-football-2",
        sport: SportType.FOOTBALL,
        homeTeam: "Manchester City",
        awayTeam: "Liverpool FC",
        league: "Premier League",
        startTime: dayAfter,
        status: EventStatus.UPCOMING,
        odds: generateOdds(SportType.FOOTBALL),
        totalBetPool: 0,
      },
    }),

    // Basketball: NBA
    prisma.sportEvent.upsert({
      where: { id: "sport-event-basketball-1" },
      update: {},
      create: {
        id: "sport-event-basketball-1",
        sport: SportType.BASKETBALL,
        homeTeam: "Los Angeles Lakers",
        awayTeam: "Golden State Warriors",
        league: "NBA",
        startTime: tomorrow,
        status: EventStatus.UPCOMING,
        odds: generateOdds(SportType.BASKETBALL),
        totalBetPool: 0,
      },
    }),

    // Tennis: Grand Slam
    prisma.sportEvent.upsert({
      where: { id: "sport-event-tennis-1" },
      update: {},
      create: {
        id: "sport-event-tennis-1",
        sport: SportType.TENNIS,
        homeTeam: "Novak Djokovic",
        awayTeam: "Carlos Alcaraz",
        league: "Wimbledon Finals",
        startTime: dayAfter,
        status: EventStatus.UPCOMING,
        odds: generateOdds(SportType.TENNIS),
        totalBetPool: 0,
      },
    }),

    // Formula 1: Monaco Grand Prix
    prisma.sportEvent.upsert({
      where: { id: "sport-event-f1-1" },
      update: {},
      create: {
        id: "sport-event-f1-1",
        sport: SportType.FORMULA1,
        homeTeam: "Max Verstappen (Red Bull)",
        awayTeam: "Lewis Hamilton (Mercedes)",
        league: "Formula 1 World Championship",
        startTime: nextWeek,
        status: EventStatus.UPCOMING,
        odds: generateOdds(SportType.FORMULA1),
        totalBetPool: 0,
      },
    }),

    // Golf: The Masters
    prisma.sportEvent.upsert({
      where: { id: "sport-event-golf-1" },
      update: {},
      create: {
        id: "sport-event-golf-1",
        sport: SportType.GOLF,
        homeTeam: "Rory McIlroy",
        awayTeam: "Scottie Scheffler",
        league: "The Masters Tournament",
        startTime: nextWeek,
        status: EventStatus.UPCOMING,
        odds: generateOdds(SportType.GOLF),
        totalBetPool: 0,
      },
    }),
  ]);

  console.log(`Created ${sportEvents.length} sport events`);

  // ============================================================
  // SUBSCRIPTION PLANS
  // ============================================================
  console.log("Seeding subscription plans...");

  const subscriptionPlans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { id: "plan-silver" },
      update: {},
      create: {
        id: "plan-silver",
        name: "Silver",
        level: VIPLevel.SILVER,
        priceMonthly: 500,
        benefits: [
          "500 Virtual Coins per month",
          "Silver VIP badge on profile",
          "Access to Silver-only casino tables",
          "5% bonus on all deposits",
          "Priority customer support",
          "Early access to new features",
          "Monthly exclusive item drop",
        ],
        isActive: true,
      },
    }),

    prisma.subscriptionPlan.upsert({
      where: { id: "plan-gold" },
      update: {},
      create: {
        id: "plan-gold",
        name: "Gold",
        level: VIPLevel.GOLD,
        priceMonthly: 1500,
        benefits: [
          "1,500 Virtual Coins per month",
          "Gold VIP badge on profile",
          "Access to Gold exclusive casino tables",
          "10% bonus on all deposits",
          "24/7 dedicated account manager",
          "Weekly exclusive item drops",
          "Reduced transaction fees (1% less)",
          "Invitation to Gold member events",
          "Custom avatar frame",
        ],
        isActive: true,
      },
    }),

    prisma.subscriptionPlan.upsert({
      where: { id: "plan-platinum" },
      update: {},
      create: {
        id: "plan-platinum",
        name: "Platinum",
        level: VIPLevel.PLATINUM,
        priceMonthly: 4000,
        benefits: [
          "4,000 Virtual Coins per month",
          "Platinum VIP badge on profile",
          "Access to Platinum high-roller rooms",
          "15% bonus on all deposits",
          "Personal VIP concierge service",
          "Daily exclusive item drops",
          "Reduced transaction fees (2% less)",
          "Exclusive real estate access",
          "Custom animated avatar effects",
          "Invitation to monthly VIP tournaments",
          "Early access to limited vehicles",
        ],
        isActive: true,
      },
    }),

    prisma.subscriptionPlan.upsert({
      where: { id: "plan-diamond" },
      update: {},
      create: {
        id: "plan-diamond",
        name: "Diamond",
        level: VIPLevel.DIAMOND,
        priceMonthly: 10000,
        benefits: [
          "10,000 Virtual Coins per month",
          "Diamond VIP badge on profile",
          "Access to Diamond ultra-exclusive suites",
          "25% bonus on all deposits",
          "Dedicated 24/7 personal VIP host",
          "Exclusive Diamond-only item collection",
          "Zero transaction fees",
          "Priority withdrawal processing (1 hour)",
          "Access to unreleased game modes",
          "Custom casino suite for hosting events",
          "Monthly high-roller tournament invitation",
          "Personalized in-game branding",
          "Exclusive Diamond NFT collectibles",
        ],
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${subscriptionPlans.length} subscription plans`);

  // ============================================================
  // ITEMS (15 items across all categories)
  // ============================================================
  console.log("Seeding items...");

  const items = await Promise.all([
    // Clothing (4 items)
    prisma.item.upsert({
      where: { id: "item-suit-black" },
      update: {},
      create: {
        id: "item-suit-black",
        name: "Black Diamond Tuxedo",
        category: ItemCategory.CLOTHING,
        rarity: ItemRarity.EPIC,
        price: 2500,
        markup: 0.10,
        description: "A sleek matte-black tuxedo with subtle diamond thread weaving. Reserved for the elite.",
        isLimited: false,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-jacket-gold" },
      update: {},
      create: {
        id: "item-jacket-gold",
        name: "Gold Brocade Blazer",
        category: ItemCategory.CLOTHING,
        rarity: ItemRarity.RARE,
        price: 1200,
        markup: 0.10,
        description: "A luxurious blazer with gold brocade patterns. Turn heads in the VIP lounge.",
        isLimited: false,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-dress-red" },
      update: {},
      create: {
        id: "item-dress-red",
        name: "Crimson Evening Gown",
        category: ItemCategory.CLOTHING,
        rarity: ItemRarity.RARE,
        price: 1800,
        markup: 0.10,
        description: "A floor-length crimson gown with a sculpted silhouette, perfect for casino nights.",
        isLimited: true,
        totalSupply: 500,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-hoodie-vip" },
      update: {},
      create: {
        id: "item-hoodie-vip",
        name: "VIP City Hoodie",
        category: ItemCategory.CLOTHING,
        rarity: ItemRarity.UNCOMMON,
        price: 350,
        markup: 0.10,
        description: "A comfortable streetwear hoodie with VirtualCity branding. Urban luxury.",
        isLimited: false,
        soldCount: 0,
      },
    }),

    // Accessories (4 items)
    prisma.item.upsert({
      where: { id: "item-watch-gold" },
      update: {},
      create: {
        id: "item-watch-gold",
        name: "Aurem Gold Timepiece",
        category: ItemCategory.ACCESSORY,
        rarity: ItemRarity.LEGENDARY,
        price: 15000,
        markup: 0.10,
        description: "An ultra-rare gold chronograph watch. Worn by the most successful players in the city.",
        isLimited: true,
        totalSupply: 100,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-chain-platinum" },
      update: {},
      create: {
        id: "item-chain-platinum",
        name: "Platinum Cuban Chain",
        category: ItemCategory.ACCESSORY,
        rarity: ItemRarity.EPIC,
        price: 4500,
        markup: 0.10,
        description: "A heavy platinum Cuban link chain. A symbol of supreme wealth in the virtual streets.",
        isLimited: false,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-glasses-diamond" },
      update: {},
      create: {
        id: "item-glasses-diamond",
        name: "Diamond-Framed Aviators",
        category: ItemCategory.ACCESSORY,
        rarity: ItemRarity.RARE,
        price: 2200,
        markup: 0.10,
        description: "Sleek aviator sunglasses with diamond-encrusted frames. See the city in style.",
        isLimited: false,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-bag-luxury" },
      update: {},
      create: {
        id: "item-bag-luxury",
        name: "Obsidian Clutch Bag",
        category: ItemCategory.ACCESSORY,
        rarity: ItemRarity.UNCOMMON,
        price: 850,
        markup: 0.10,
        description: "A minimalist matte-black clutch made from the finest virtual leather.",
        isLimited: false,
        soldCount: 0,
      },
    }),

    // Footwear (4 items)
    prisma.item.upsert({
      where: { id: "item-shoes-exclusive" },
      update: {},
      create: {
        id: "item-shoes-exclusive",
        name: "VCity Air Exclusives",
        category: ItemCategory.FOOTWEAR,
        rarity: ItemRarity.EXCLUSIVE,
        price: 25000,
        markup: 0.10,
        description: "The rarest sneaker drop in VirtualCity history. Only 50 pairs ever released.",
        isLimited: true,
        totalSupply: 50,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-boots-leather" },
      update: {},
      create: {
        id: "item-boots-leather",
        name: "CEO Oxford Boots",
        category: ItemCategory.FOOTWEAR,
        rarity: ItemRarity.RARE,
        price: 1600,
        markup: 0.10,
        description: "Handcrafted leather Oxford boots. The choice of virtual entrepreneurs.",
        isLimited: false,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-heels-crystal" },
      update: {},
      create: {
        id: "item-heels-crystal",
        name: "Crystal Stiletto Heels",
        category: ItemCategory.FOOTWEAR,
        rarity: ItemRarity.EPIC,
        price: 3800,
        markup: 0.10,
        description: "Sky-high stilettos adorned with crystal embellishments. Walk like royalty.",
        isLimited: true,
        totalSupply: 200,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-sneakers-common" },
      update: {},
      create: {
        id: "item-sneakers-common",
        name: "City Classic Trainers",
        category: ItemCategory.FOOTWEAR,
        rarity: ItemRarity.COMMON,
        price: 150,
        markup: 0.10,
        description: "A clean, everyday trainer for exploring the virtual city streets.",
        isLimited: false,
        soldCount: 0,
      },
    }),

    // Hats (3 items)
    prisma.item.upsert({
      where: { id: "item-hat-fedora" },
      update: {},
      create: {
        id: "item-hat-fedora",
        name: "Velvet Noir Fedora",
        category: ItemCategory.HAT,
        rarity: ItemRarity.RARE,
        price: 950,
        markup: 0.10,
        description: "A deep midnight velvet fedora for casino-goers with distinguished taste.",
        isLimited: false,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-hat-crown" },
      update: {},
      create: {
        id: "item-hat-crown",
        name: "Digital Crown of Champions",
        category: ItemCategory.HAT,
        rarity: ItemRarity.LEGENDARY,
        price: 12000,
        markup: 0.10,
        description: "Only awarded to tournament champions. A glowing crown of pure prestige.",
        isLimited: true,
        totalSupply: 25,
        soldCount: 0,
      },
    }),
    prisma.item.upsert({
      where: { id: "item-cap-city" },
      update: {},
      create: {
        id: "item-cap-city",
        name: "VCity Snapback Cap",
        category: ItemCategory.HAT,
        rarity: ItemRarity.COMMON,
        price: 120,
        markup: 0.10,
        description: "A clean VirtualCity branded snapback. The everyday essential.",
        isLimited: false,
        soldCount: 0,
      },
    }),
  ]);

  console.log(`Created ${items.length} items`);

  // ============================================================
  // REAL ESTATE (6 records)
  // ============================================================
  console.log("Seeding real estate...");

  const realEstates = await Promise.all([
    // Apartment 1
    prisma.realEstate.upsert({
      where: { id: "re-apt-downtown" },
      update: {},
      create: {
        id: "re-apt-downtown",
        name: "Downtown Studio Apartment",
        type: PropertyType.APARTMENT,
        location: "City Center, Block 4A",
        area: "city_center",
        size: 55,
        basePrice: 45000,
        currentPrice: 51750,
        markup: 0.15,
        isAvailable: true,
        features: [
          "Floor-to-ceiling windows",
          "Smart home system",
          "Rooftop access",
          "City skyline views",
          "Underground parking",
        ],
        capacity: 2,
      },
    }),

    // Apartment 2
    prisma.realEstate.upsert({
      where: { id: "re-apt-beachfront" },
      update: {},
      create: {
        id: "re-apt-beachfront",
        name: "Beachfront Luxury Apartment",
        type: PropertyType.APARTMENT,
        location: "Beachfront Boulevard, Unit 12",
        area: "beachfront",
        size: 85,
        basePrice: 120000,
        currentPrice: 138000,
        markup: 0.15,
        isAvailable: true,
        features: [
          "Direct beach access",
          "Private terrace with ocean view",
          "Infinity pool access",
          "Concierge service",
          "Designer furnishings",
          "2 bedrooms, 2 bathrooms",
        ],
        capacity: 4,
      },
    }),

    // Penthouse
    prisma.realEstate.upsert({
      where: { id: "re-penthouse-skyline" },
      update: {},
      create: {
        id: "re-penthouse-skyline",
        name: "Skyline Penthouse",
        type: PropertyType.PENTHOUSE,
        location: "VIP District, Tower 1 — Top Floor",
        area: "vip_district",
        size: 320,
        basePrice: 850000,
        currentPrice: 977500,
        markup: 0.15,
        isAvailable: true,
        features: [
          "360-degree panoramic views",
          "Private rooftop terrace",
          "Private elevator",
          "Smart home with AI assistant",
          "Cinema room",
          "Wine cellar",
          "4 bedrooms, 5 bathrooms",
          "Helicopter landing pad access",
        ],
        capacity: 20,
      },
    }),

    // Villa
    prisma.realEstate.upsert({
      where: { id: "re-villa-coastal" },
      update: {},
      create: {
        id: "re-villa-coastal",
        name: "Coastal Mediterranean Villa",
        type: PropertyType.VILLA,
        location: "Coastal Cliffs, Villa Row 3",
        area: "beachfront",
        size: 650,
        basePrice: 1500000,
        currentPrice: 1725000,
        markup: 0.15,
        isAvailable: true,
        features: [
          "Private beach and jetty",
          "Olympic-size swimming pool",
          "6 bedrooms, 7 bathrooms",
          "Guest house",
          "Fully equipped gym",
          "Home theater",
          "Private chef kitchen",
          "Landscaped gardens",
          "Security system",
        ],
        capacity: 50,
      },
    }),

    // Mansion
    prisma.realEstate.upsert({
      where: { id: "re-mansion-golden" },
      update: {},
      create: {
        id: "re-mansion-golden",
        name: "Golden Hills Mansion",
        type: PropertyType.MANSION,
        location: "Golden Hills Estate, Lot 1",
        area: "vip_district",
        size: 1200,
        basePrice: 5000000,
        currentPrice: 5750000,
        markup: 0.15,
        isAvailable: true,
        features: [
          "12 bedrooms, 14 bathrooms",
          "Grand ballroom",
          "Indoor pool and spa",
          "Private casino room",
          "Home cinema",
          "Staff quarters",
          "Multiple garages",
          "Helipad",
          "Underground panic room",
          "Gated 5-acre grounds",
        ],
        capacity: 200,
      },
    }),

    // Casino Suite
    prisma.realEstate.upsert({
      where: { id: "re-casino-suite-vip" },
      update: {},
      create: {
        id: "re-casino-suite-vip",
        name: "Diamond Casino Suite",
        type: PropertyType.CASINO_SUITE,
        location: "The Grand Casino, Suite Level — Penthouse",
        area: "vip_district",
        size: 280,
        basePrice: 2200000,
        currentPrice: 2530000,
        markup: 0.15,
        isAvailable: true,
        features: [
          "Private casino with live dealer access",
          "24/7 butler service",
          "Rooftop pool with city views",
          "3 bedrooms, 4 bathrooms",
          "Private dining room",
          "Cigar lounge",
          "VIP event hosting capability",
          "Limousine service included",
          "Direct access to main casino floor",
        ],
        capacity: 40,
      },
    }),
  ]);

  console.log(`Created ${realEstates.length} real estate listings`);

  // ============================================================
  // VEHICLE MODELS (6 records)
  // ============================================================
  console.log("Seeding vehicle models...");

  const vehicleModels = await Promise.all([
    // Supercar 1
    prisma.vehicleModel.upsert({
      where: { id: "vm-supercar-laferrari" },
      update: {},
      create: {
        id: "vm-supercar-laferrari",
        name: "LaFerrari Apex",
        brand: "Ferrari",
        type: VehicleType.SUPERCAR,
        speed: 98,
        style: 95,
        basePrice: 350000,
        currentPrice: 392000,
        markup: 0.12,
        isAvailable: true,
        color: "Rosso Corsa",
      },
    }),

    // Supercar 2
    prisma.vehicleModel.upsert({
      where: { id: "vm-supercar-bugatti" },
      update: {},
      create: {
        id: "vm-supercar-bugatti",
        name: "Chiron Noir Edition",
        brand: "Bugatti",
        type: VehicleType.SUPERCAR,
        speed: 100,
        style: 98,
        basePrice: 750000,
        currentPrice: 840000,
        markup: 0.12,
        isAvailable: true,
        color: "Matte Noir",
      },
    }),

    // Luxury Sedan
    prisma.vehicleModel.upsert({
      where: { id: "vm-sedan-rolls" },
      update: {},
      create: {
        id: "vm-sedan-rolls",
        name: "Phantom Celestial",
        brand: "Rolls-Royce",
        type: VehicleType.LUXURY_SEDAN,
        speed: 75,
        style: 100,
        basePrice: 420000,
        currentPrice: 470400,
        markup: 0.12,
        isAvailable: true,
        color: "Midnight Silver",
      },
    }),

    // Motorcycle
    prisma.vehicleModel.upsert({
      where: { id: "vm-moto-ducati" },
      update: {},
      create: {
        id: "vm-moto-ducati",
        name: "Panigale V4 S Gold Edition",
        brand: "Ducati",
        type: VehicleType.MOTORCYCLE,
        speed: 90,
        style: 85,
        basePrice: 45000,
        currentPrice: 50400,
        markup: 0.12,
        isAvailable: true,
        color: "Ducati Red / Gold",
      },
    }),

    // Yacht
    prisma.vehicleModel.upsert({
      where: { id: "vm-yacht-superyacht" },
      update: {},
      create: {
        id: "vm-yacht-superyacht",
        name: "Sovereign 85 Superyacht",
        brand: "Azmara Marine",
        type: VehicleType.YACHT,
        speed: 55,
        style: 97,
        basePrice: 12000000,
        currentPrice: 13440000,
        markup: 0.12,
        isAvailable: true,
        color: "Pearl White",
      },
    }),

    // SUV
    prisma.vehicleModel.upsert({
      where: { id: "vm-suv-cullinan" },
      update: {},
      create: {
        id: "vm-suv-cullinan",
        name: "Cullinan Black Badge",
        brand: "Rolls-Royce",
        type: VehicleType.SUV,
        speed: 72,
        style: 96,
        basePrice: 380000,
        currentPrice: 425600,
        markup: 0.12,
        isAvailable: true,
        color: "Black Badge Matte",
      },
    }),
  ]);

  console.log(`Created ${vehicleModels.length} vehicle models`);

  // ============================================================
  // ACHIEVEMENTS (10 records)
  // ============================================================
  console.log("Seeding achievements...");

  const achievements = await Promise.all([
    prisma.achievement.upsert({
      where: { id: "ach-first-bet" },
      update: {},
      create: {
        id: "ach-first-bet",
        name: "First Bet",
        description: "Place your very first bet in VirtualCity.",
        category: "betting",
        points: 10,
        condition: {
          type: "bet_count",
          threshold: 1,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-big-winner" },
      update: {},
      create: {
        id: "ach-big-winner",
        name: "Big Winner",
        description: "Win a single bet worth 10,000 VC or more.",
        category: "betting",
        points: 100,
        condition: {
          type: "single_win_amount",
          threshold: 10000,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-casino-royale" },
      update: {},
      create: {
        id: "ach-casino-royale",
        name: "Casino Royale",
        description: "Win 50 casino games in a lifetime.",
        category: "casino",
        points: 250,
        condition: {
          type: "casino_wins_count",
          threshold: 50,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-property-owner" },
      update: {},
      create: {
        id: "ach-property-owner",
        name: "Property Owner",
        description: "Purchase your first property in VirtualCity.",
        category: "lifestyle",
        points: 200,
        condition: {
          type: "property_count",
          threshold: 1,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-vip-member" },
      update: {},
      create: {
        id: "ach-vip-member",
        name: "VIP Member",
        description: "Subscribe to any VIP membership plan.",
        category: "vip",
        points: 150,
        condition: {
          type: "has_subscription",
          threshold: 1,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-high-roller" },
      update: {},
      create: {
        id: "ach-high-roller",
        name: "High Roller",
        description: "Wager a total of 1,000,000 VC across all games.",
        category: "betting",
        points: 500,
        condition: {
          type: "total_wagered",
          threshold: 1000000,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-fashion-icon" },
      update: {},
      create: {
        id: "ach-fashion-icon",
        name: "Fashion Icon",
        description: "Own 10 or more items from the Fashion District.",
        category: "lifestyle",
        points: 75,
        condition: {
          type: "item_count",
          threshold: 10,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-speed-demon" },
      update: {},
      create: {
        id: "ach-speed-demon",
        name: "Speed Demon",
        description: "Own a vehicle with a speed stat of 90 or above.",
        category: "lifestyle",
        points: 125,
        condition: {
          type: "vehicle_speed_stat",
          threshold: 90,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-sports-guru" },
      update: {},
      create: {
        id: "ach-sports-guru",
        name: "Sports Guru",
        description: "Win 25 sports bets successfully.",
        category: "betting",
        points: 300,
        condition: {
          type: "sports_bet_wins",
          threshold: 25,
        },
      },
    }),

    prisma.achievement.upsert({
      where: { id: "ach-city-mogul" },
      update: {},
      create: {
        id: "ach-city-mogul",
        name: "City Mogul",
        description: "Own 3 or more properties across VirtualCity.",
        category: "lifestyle",
        points: 750,
        condition: {
          type: "property_count",
          threshold: 3,
        },
      },
    }),
  ]);

  console.log(`Created ${achievements.length} achievements`);

  // ============================================================
  // ADMIN USER
  // ============================================================
  console.log("Seeding admin user...");

  const passwordHash = await bcrypt.hash("Admin@VirtualCity2024!", 12);
  const dob = new Date("1990-01-01");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@virtualcity.io" },
    update: {},
    create: {
      email: "admin@virtualcity.io",
      username: "vcadmin",
      passwordHash,
      dateOfBirth: dob,
      isVerified: true,
      kycStatus: KYCStatus.APPROVED,
      role: UserRole.ADMIN,
      vipLevel: VIPLevel.DIAMOND,
      isBanned: false,
    },
  });

  // Create admin wallet
  await prisma.wallet.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      balance: 1000000,
      realBalance: 10000,
      lockedBalance: 0,
      totalDeposited: 10000,
      totalWithdrawn: 0,
      totalWon: 0,
      totalLost: 0,
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  console.log("\nDatabase seed completed successfully!");
  console.log("Summary:");
  console.log(`  - ${sportEvents.length} sport events`);
  console.log(`  - ${subscriptionPlans.length} subscription plans`);
  console.log(`  - ${items.length} items`);
  console.log(`  - ${realEstates.length} real estate listings`);
  console.log(`  - ${vehicleModels.length} vehicle models`);
  console.log(`  - ${achievements.length} achievements`);
  console.log(`  - 1 admin user (admin@virtualcity.io)`);
}

export default main;

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
