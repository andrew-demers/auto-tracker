// Dev-only convenience seeder: creates a standalone demo vehicle with fuel-ups,
// expenses, and maintenance items so every tab has realistic data to test
// against locally, without touching any real vehicle already in the DB.
// No-ops if the demo vehicle already exists. Not run in production - invoke
// manually with `npm run db:seed:dev`.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const DEMO_VEHICLE_NAME = "Honda Civic (Demo)";

const MONTHS_OF_HISTORY = 24;
const START_ODOMETER = 45000;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

interface FuelUpSeed {
  date: Date;
  odometer: number;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  isFullTank: boolean;
  station: string;
}

function buildFuelUps(): FuelUpSeed[] {
  const stations = ["Shell", "Costco Gas", "Chevron", "BP", "Sam's Club Fuel"];
  const totalDays = MONTHS_OF_HISTORY * 30;
  const fuelUps: FuelUpSeed[] = [];

  let odometer = START_ODOMETER;
  let dayOffset = totalDays;
  let i = 0;
  while (dayOffset > 0) {
    // ~340 miles between fill-ups, +/- a swing so MPG isn't perfectly flat.
    const milesThisLeg = 320 + 40 * Math.sin(i / 2);
    odometer += milesThisLeg;
    dayOffset -= 12 + Math.round(4 * Math.cos(i / 3));

    const gallons = Math.round((10.5 + 1.8 * Math.sin(i / 4)) * 10) / 10;
    const pricePerGallon = Math.round((3.35 + 0.35 * Math.sin(i / 5)) * 100) / 100;
    const isFullTank = i % 7 !== 3; // occasional partial fill-up

    fuelUps.push({
      date: daysAgo(Math.max(dayOffset, 0)),
      odometer: Math.round(odometer),
      gallons,
      pricePerGallon,
      totalCost: Math.round(gallons * pricePerGallon * 100) / 100,
      isFullTank,
      station: stations[i % stations.length],
    });
    i++;
  }

  return fuelUps;
}

interface ExpenseSeed {
  daysAgoAt: number;
  category: string;
  type?: string;
  odometerFraction: number; // 0-1 through the odometer range, mapped after fuel-ups are built
  cost: number;
  vendor?: string;
  notes?: string;
}

const expenseSeeds: ExpenseSeed[] = [
  { daysAgoAt: 700, category: "MAINTENANCE", type: "Oil Change", odometerFraction: 0.05, cost: 79.99, vendor: "Jiffy Lube" },
  { daysAgoAt: 620, category: "MAINTENANCE", type: "Tire Rotation", odometerFraction: 0.15, cost: 39.0, vendor: "Discount Tire" },
  { daysAgoAt: 540, category: "REPAIR", odometerFraction: 0.22, cost: 412.35, vendor: "AutoZone Service Center", notes: "Alternator replacement" },
  { daysAgoAt: 470, category: "TIRES", odometerFraction: 0.3, cost: 640.0, vendor: "Discount Tire", notes: "Set of 4 all-seasons" },
  { daysAgoAt: 400, category: "INSURANCE", odometerFraction: 0.38, cost: 612.0, vendor: "State Farm", notes: "6-month premium" },
  { daysAgoAt: 340, category: "MAINTENANCE", type: "Cabin Air Filter Replacement", odometerFraction: 0.44, cost: 32.0, vendor: "Jiffy Lube" },
  { daysAgoAt: 300, category: "REGISTRATION", odometerFraction: 0.5, cost: 158.0, vendor: "DMV" },
  { daysAgoAt: 240, category: "DETAILING", odometerFraction: 0.56, cost: 150.0, vendor: "Sparkle Auto Spa" },
  { daysAgoAt: 190, category: "INSURANCE", odometerFraction: 0.62, cost: 612.0, vendor: "State Farm", notes: "6-month premium" },
  { daysAgoAt: 150, category: "PARKING_TOLLS", odometerFraction: 0.68, cost: 24.5, vendor: "EZ-Pass" },
  { daysAgoAt: 110, category: "MAINTENANCE", type: "Brake Pad Replacement", odometerFraction: 0.76, cost: 289.99, vendor: "Midas" },
  { daysAgoAt: 70, category: "REPAIR", odometerFraction: 0.84, cost: 175.0, vendor: "Local Mechanic", notes: "Replaced a burnt-out headlight assembly" },
  { daysAgoAt: 40, category: "ACCESSORIES", odometerFraction: 0.9, cost: 89.99, vendor: "Amazon", notes: "All-weather floor mats" },
  { daysAgoAt: 10, category: "MAINTENANCE", type: "Tire Rotation", odometerFraction: 0.97, cost: 39.0, vendor: "Discount Tire" },
];

async function main() {
  const existingDemo = await prisma.vehicle.findFirst({ where: { name: DEMO_VEHICLE_NAME } });
  if (existingDemo) {
    console.log(`[seed-dev] "${DEMO_VEHICLE_NAME}" already exists - skipping.`);
    return;
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      name: DEMO_VEHICLE_NAME,
      make: "Honda",
      model: "Civic",
      year: 2019,
      fuelType: "GASOLINE",
      tankCapacity: 12.4,
      notes: "Demo vehicle seeded for local testing - safe to delete.",
      vin: "1HGCV1F34LA000000",
      licensePlate: "DEMO123",
      oilType: "0W-20 Full Synthetic",
      oilCapacityQuarts: 4.4,
      oilFilterPartNumber: "15400-PLM-A02",
      tireSize: "215/55R16",
      tirePressureFrontPsi: 32,
      tirePressureRearPsi: 32,
      transmissionFluidType: "Honda ATF-DW1",
      coolantType: "Honda Type 2 (Blue)",
      batteryType: "Group 51R",
      sparkPlugType: "Denso ILZKAR7B11",
      wiperBladeSizeFront: "26in",
      wiperBladeSizeRear: "16in",
    },
  });

  const fuelUps = buildFuelUps();
  for (const fuelUp of fuelUps) {
    await prisma.fuelUp.create({ data: { vehicleId: vehicle.id, ...fuelUp } });
  }

  const minOdometer = fuelUps[0].odometer;
  const maxOdometer = fuelUps[fuelUps.length - 1].odometer;
  const odometerAt = (fraction: number) =>
    Math.round(minOdometer + fraction * (maxOdometer - minOdometer));

  for (const seed of expenseSeeds) {
    await prisma.expense.create({
      data: {
        vehicleId: vehicle.id,
        date: daysAgo(seed.daysAgoAt),
        category: seed.category as never,
        type: seed.type ?? null,
        odometer: odometerAt(seed.odometerFraction),
        cost: seed.cost,
        vendor: seed.vendor ?? null,
        notes: seed.notes ?? null,
      },
    });
  }

  // Mix of OK / due-soon / overdue statuses so the maintenance tab exercises
  // every badge state.
  await prisma.maintenanceItem.createMany({
    data: [
      {
        vehicleId: vehicle.id,
        title: "Oil Change",
        intervalMiles: 5000,
        intervalMonths: 6,
        lastDoneDate: daysAgo(150),
        lastDoneOdometer: odometerAt(0.86),
        notifyEnabled: true,
      },
      {
        vehicleId: vehicle.id,
        title: "Tire Rotation",
        intervalMiles: 6000,
        lastDoneDate: daysAgo(220),
        lastDoneOdometer: odometerAt(0.7),
        notifyEnabled: true,
      },
      {
        vehicleId: vehicle.id,
        title: "Cabin Air Filter Replacement",
        intervalMonths: 12,
        lastDoneDate: daysAgo(400),
        lastDoneOdometer: odometerAt(0.44),
        notifyEnabled: true,
      },
      {
        vehicleId: vehicle.id,
        title: "Brake Fluid Flush",
        intervalMonths: 24,
        notifyEnabled: false,
        notes: "Never done - due from vehicle creation baseline.",
      },
      {
        vehicleId: vehicle.id,
        title: "Battery Replacement",
        intervalMonths: 48,
        lastDoneDate: daysAgo(60),
        lastDoneOdometer: odometerAt(0.9),
        notifyEnabled: true,
      },
      {
        vehicleId: vehicle.id,
        title: "State Inspection",
        intervalMonths: 12,
        lastDoneDate: daysAgo(335),
        lastDoneOdometer: odometerAt(0.46),
        notifyEnabled: true,
      },
    ],
  });

  console.log(
    `[seed-dev] Created "${vehicle.name}" with ${fuelUps.length} fuel-ups, ${expenseSeeds.length} expenses, and 6 maintenance items.`
  );
}

main()
  .catch((err) => {
    console.error("[seed-dev] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
