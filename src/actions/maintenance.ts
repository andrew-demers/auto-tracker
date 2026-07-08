"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getCurrentOdometer } from "@/lib/odometer";
import { touchLastActiveVehicle } from "@/lib/last-active-vehicle";
import {
  computeMaintenanceStatus,
  type MaintenanceStatusResult,
} from "@/lib/maintenance";
import {
  maintenanceDataSchema,
  markCompletedDataSchema,
  type MaintenanceData,
  type MaintenanceFormParsed,
  type MarkCompletedFormParsed,
} from "@/lib/validations/maintenance";

function toMaintenanceData(parsed: MaintenanceData) {
  return {
    title: parsed.title,
    intervalMiles: parsed.intervalMiles ?? null,
    intervalMonths: parsed.intervalMonths ?? null,
    lastDoneDate: parsed.lastDoneDate ?? null,
    lastDoneOdometer: parsed.lastDoneOdometer ?? null,
    notes: parsed.notes ?? null,
    notifyEnabled: parsed.notifyEnabled,
  };
}

const statusRank: Record<MaintenanceStatusResult["status"], number> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  OK: 2,
};

function remainingRank(result: MaintenanceStatusResult): number {
  const values = [result.milesRemaining, result.daysRemaining].filter(
    (v): v is number => v !== null
  );
  return values.length > 0 ? Math.min(...values) : Number.POSITIVE_INFINITY;
}

export async function getMaintenanceItems(vehicleId: string) {
  await requireUser();

  const [items, vehicle] = await Promise.all([
    prisma.maintenanceItem.findMany({ where: { vehicleId } }),
    prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        // Fetches all fuel-ups (not just the first) since getCurrentOdometer
        // needs the max odometer across all of them; the earliest one is
        // separately picked out below for the maintenance baseline.
        fuelUps: {
          select: { odometer: true, date: true },
          orderBy: { date: "asc" },
        },
        expenses: { select: { odometer: true } },
        maintenanceItems: { select: { lastDoneOdometer: true } },
      },
    }),
  ]);

  if (!vehicle) return null;

  const currentOdometer = getCurrentOdometer(vehicle);
  const firstFuelUp = vehicle.fuelUps[0];
  const baselineDate = firstFuelUp?.date ?? vehicle.createdAt;
  const baselineOdometer = firstFuelUp?.odometer ?? 0;

  const withStatus = items.map((item) => {
    const result = computeMaintenanceStatus(item, currentOdometer, {
      baselineDate,
      baselineOdometer,
    });
    return { ...item, ...result };
  });

  withStatus.sort((a, b) => {
    const rankDiff = statusRank[a.status] - statusRank[b.status];
    if (rankDiff !== 0) return rankDiff;
    return remainingRank(a) - remainingRank(b);
  });

  return { items: withStatus, currentOdometer };
}

export async function createMaintenanceItem(
  vehicleId: string,
  values: MaintenanceFormParsed
): Promise<{ error?: string }> {
  const user = await requireUser();

  const parseResult = maintenanceDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  await prisma.maintenanceItem.create({
    data: { vehicleId, ...toMaintenanceData(parseResult.data) },
  });
  await touchLastActiveVehicle(user.id, vehicleId);

  revalidatePath(`/vehicles/${vehicleId}`);
  return {};
}

export async function updateMaintenanceItem(
  id: string,
  values: MaintenanceFormParsed
): Promise<{ error?: string }> {
  const user = await requireUser();

  const parseResult = maintenanceDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.maintenanceItem.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Maintenance item not found." };
  }

  await prisma.maintenanceItem.update({
    where: { id },
    data: toMaintenanceData(parseResult.data),
  });
  await touchLastActiveVehicle(user.id, existing.vehicleId);

  revalidatePath(`/vehicles/${existing.vehicleId}`);
  return {};
}

export async function deleteMaintenanceItem(id: string): Promise<{ error?: string }> {
  await requireUser();

  const existing = await prisma.maintenanceItem.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Maintenance item not found." };
  }

  await prisma.maintenanceItem.delete({ where: { id } });

  revalidatePath(`/vehicles/${existing.vehicleId}`);
  return {};
}

/**
 * Marks a maintenance item as completed: updates lastDoneDate/lastDoneOdometer
 * to the provided values, resets lastNotifiedStatus so it can notify again
 * next cycle, and - if a cost is provided - logs a linked MAINTENANCE
 * expense for the same date/odometer.
 */
export async function markCompleted(
  id: string,
  values: MarkCompletedFormParsed
): Promise<{ error?: string }> {
  const user = await requireUser();

  const parseResult = markCompletedDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }
  const { date, odometer, cost } = parseResult.data;

  const existing = await prisma.maintenanceItem.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Maintenance item not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceItem.update({
      where: { id },
      data: {
        lastDoneDate: date,
        lastDoneOdometer: odometer,
        lastNotifiedStatus: null,
      },
    });

    if (cost !== undefined) {
      await tx.expense.create({
        data: {
          vehicleId: existing.vehicleId,
          date,
          category: "MAINTENANCE",
          odometer,
          cost,
          notes: `Completed: ${existing.title}`,
        },
      });
    }
  });
  await touchLastActiveVehicle(user.id, existing.vehicleId);

  revalidatePath(`/vehicles/${existing.vehicleId}`);
  return {};
}
