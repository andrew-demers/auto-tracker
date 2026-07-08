"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";
import {
  fuelUpDataSchema,
  type FuelUpData,
  type FuelUpFormParsed,
} from "@/lib/validations/fuel-up";

function toFuelUpData(parsed: FuelUpData) {
  return {
    date: parsed.date,
    odometer: parsed.odometer,
    gallons: parsed.gallons,
    pricePerGallon: parsed.pricePerGallon,
    totalCost: parsed.totalCost,
    isFullTank: parsed.isFullTank,
    station: parsed.station ?? null,
    notes: parsed.notes ?? null,
  };
}

export async function getFuelUps(vehicleId: string) {
  await requireUser();
  return prisma.fuelUp.findMany({
    where: { vehicleId },
    orderBy: [{ date: "asc" }, { odometer: "asc" }],
    include: { attachments: true },
  });
}

export async function createFuelUp(
  vehicleId: string,
  values: FuelUpFormParsed
): Promise<{ error?: string; id?: string }> {
  await requireUser();

  const parseResult = fuelUpDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  const fuelUp = await prisma.fuelUp.create({
    data: { vehicleId, ...toFuelUpData(parseResult.data) },
  });

  revalidatePath(`/vehicles/${vehicleId}`);
  return { id: fuelUp.id };
}

export async function updateFuelUp(
  id: string,
  values: FuelUpFormParsed
): Promise<{ error?: string; id?: string }> {
  await requireUser();

  const parseResult = fuelUpDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.fuelUp.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Fuel-up not found." };
  }

  await prisma.fuelUp.update({
    where: { id },
    data: toFuelUpData(parseResult.data),
  });

  revalidatePath(`/vehicles/${existing.vehicleId}`);
  return { id };
}

export async function deleteFuelUp(id: string): Promise<{ error?: string }> {
  await requireUser();

  const existing = await prisma.fuelUp.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!existing) {
    return { error: "Fuel-up not found." };
  }

  // DB cascade removes the Attachment rows; best-effort clean up the files.
  await prisma.fuelUp.delete({ where: { id } });
  await Promise.all(
    existing.attachments.map((attachment) => deleteStoredFile(attachment.storedPath))
  );

  revalidatePath(`/vehicles/${existing.vehicleId}`);
  return {};
}
