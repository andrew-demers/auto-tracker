"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getCurrentOdometer } from "@/lib/odometer";
import { touchLastActiveVehicle } from "@/lib/last-active-vehicle";
import { averageMpg } from "@/lib/mpg";
import { buildMonthlyCostSeries, buildMpgTrend } from "@/lib/vehicle-stats";
import {
  vehicleDataSchema,
  type VehicleData,
  type VehicleFormParsed,
} from "@/lib/validations/vehicle";
import {
  vehicleSpecsDataSchema,
  type VehicleSpecsData,
  type VehicleSpecsFormParsed,
} from "@/lib/validations/vehicle-specs";

const odometerSourcesInclude = {
  fuelUps: { select: { odometer: true } },
  expenses: { select: { odometer: true } },
  maintenanceItems: { select: { lastDoneOdometer: true } },
} as const;

export async function getVehicles() {
  await requireUser();
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { name: "asc" },
    include: odometerSourcesInclude,
  });
  return vehicles.map((vehicle) => ({
    ...vehicle,
    currentOdometer: getCurrentOdometer(vehicle),
  }));
}

/** Lightweight {id, name} list for pickers (e.g. the global quick fuel-up action). */
export async function getVehicleOptions() {
  await requireUser();
  return prisma.vehicle.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getVehicle(id: string) {
  await requireUser();
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: odometerSourcesInclude,
  });
  if (!vehicle) return null;
  return { ...vehicle, currentOdometer: getCurrentOdometer(vehicle) };
}

/** Overview-tab stats + chart data for a single vehicle. */
export async function getVehicleOverviewStats(vehicleId: string) {
  await requireUser();

  const [fuelUps, expenses] = await Promise.all([
    prisma.fuelUp.findMany({
      where: { vehicleId },
      orderBy: [{ date: "asc" }, { odometer: "asc" }],
      select: {
        date: true,
        odometer: true,
        gallons: true,
        totalCost: true,
        isFullTank: true,
      },
    }),
    prisma.expense.findMany({
      where: { vehicleId },
      orderBy: { date: "asc" },
      select: { date: true, cost: true, odometer: true },
    }),
  ]);

  const totalSpend =
    fuelUps.reduce((sum, f) => sum + f.totalCost, 0) +
    expenses.reduce((sum, e) => sum + e.cost, 0);
  const currentOdometer = getCurrentOdometer({ fuelUps, expenses });

  return {
    avgMpg: averageMpg(fuelUps),
    totalSpend,
    costPerMile: currentOdometer > 0 ? totalSpend / currentOdometer : null,
    monthlyCostSeries: buildMonthlyCostSeries(fuelUps, expenses),
    mpgTrend: buildMpgTrend(fuelUps),
  };
}

function toVehicleData(parsed: VehicleData) {
  return {
    name: parsed.name,
    make: parsed.make ?? null,
    model: parsed.model ?? null,
    year: parsed.year ?? null,
    fuelType: parsed.fuelType,
    tankCapacity: parsed.tankCapacity ?? null,
    photoUrl: parsed.photoUrl ?? null,
    notes: parsed.notes ?? null,
  };
}

export async function createVehicle(
  values: VehicleFormParsed
): Promise<{ error?: string }> {
  await requireUser();

  const parseResult = vehicleDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const vehicle = await prisma.vehicle.create({
    data: toVehicleData(parseResult.data),
  });

  revalidatePath("/vehicles");
  redirect(`/vehicles/${vehicle.id}`);
}

export async function updateVehicle(
  id: string,
  values: VehicleFormParsed
): Promise<{ error?: string }> {
  const user = await requireUser();

  const parseResult = vehicleDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Vehicle not found." };
  }

  await prisma.vehicle.update({
    where: { id },
    data: toVehicleData(parseResult.data),
  });
  await touchLastActiveVehicle(user.id, id);

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}`);
}

function toVehicleSpecsData(parsed: VehicleSpecsData) {
  return {
    vin: parsed.vin ?? null,
    licensePlate: parsed.licensePlate ?? null,
    oilType: parsed.oilType ?? null,
    oilCapacityQuarts: parsed.oilCapacityQuarts ?? null,
    oilFilterPartNumber: parsed.oilFilterPartNumber ?? null,
    tireSize: parsed.tireSize ?? null,
    tireSizeRear: parsed.tireSizeRear ?? null,
    tirePressureFrontPsi: parsed.tirePressureFrontPsi ?? null,
    tirePressureRearPsi: parsed.tirePressureRearPsi ?? null,
    transmissionFluidType: parsed.transmissionFluidType ?? null,
    transmissionFluidCapacityQuarts:
      parsed.transmissionFluidCapacityQuarts ?? null,
    brakeFluidType: parsed.brakeFluidType ?? null,
    coolantType: parsed.coolantType ?? null,
    batteryType: parsed.batteryType ?? null,
    sparkPlugType: parsed.sparkPlugType ?? null,
    wiperBladeSizeFront: parsed.wiperBladeSizeFront ?? null,
    wiperBladeSizeRear: parsed.wiperBladeSizeRear ?? null,
  };
}

export async function updateVehicleSpecs(
  id: string,
  values: VehicleSpecsFormParsed
): Promise<{ error?: string }> {
  const user = await requireUser();

  const parseResult = vehicleSpecsDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Vehicle not found." };
  }

  await prisma.vehicle.update({
    where: { id },
    data: toVehicleSpecsData(parseResult.data),
  });
  await touchLastActiveVehicle(user.id, id);

  revalidatePath(`/vehicles/${id}`);
  return {};
}

export async function deleteVehicle(id: string): Promise<{ error?: string }> {
  await requireUser();

  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Vehicle not found." };
  }

  await prisma.vehicle.delete({ where: { id } });

  revalidatePath("/vehicles");
  redirect("/vehicles");
}
