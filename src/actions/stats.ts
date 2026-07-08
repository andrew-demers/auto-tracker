"use server";

import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentOdometer } from "@/lib/odometer";
import { buildStatsData, type StatsData } from "@/lib/stats";

const vehicleStatsInclude = {
  fuelUps: {
    orderBy: [{ date: "asc" }, { odometer: "asc" }],
    select: {
      date: true,
      odometer: true,
      gallons: true,
      totalCost: true,
      pricePerGallon: true,
      isFullTank: true,
    },
  },
  expenses: {
    orderBy: { date: "asc" },
    select: { date: true, cost: true, odometer: true },
  },
  maintenanceItems: { select: { lastDoneOdometer: true } },
} satisfies Prisma.VehicleInclude;

/**
 * Stats-page data for one vehicle, or every vehicle combined when
 * `vehicleId` is "all". Powers the Fill-ups/Costs/Distance tabs.
 */
export async function getStatsData(vehicleId: string): Promise<StatsData> {
  await requireUser();

  const vehicles = await prisma.vehicle.findMany({
    where: vehicleId === "all" ? undefined : { id: vehicleId },
    include: vehicleStatsInclude,
  });

  const inputs = vehicles.map((vehicle) => ({
    fuelUpsAsc: vehicle.fuelUps,
    expenses: vehicle.expenses,
    baselineOdometer: vehicle.fuelUps[0]?.odometer ?? 0,
    currentOdometer: getCurrentOdometer(vehicle),
  }));

  return buildStatsData(inputs);
}
