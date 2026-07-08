import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Records `vehicleId` as the given user's most recently touched vehicle, so
 * a later login can default straight to it (see loginAction). Call this from
 * every server action that creates/updates a FuelUp, Expense, or
 * MaintenanceItem for a vehicle, or edits the Vehicle itself.
 */
export async function touchLastActiveVehicle(
  userId: string,
  vehicleId: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveVehicleId: vehicleId },
  });
}

/** The given user's most recently touched vehicle id, if any - used to
 * default the global quick fuel-up action's vehicle picker. */
export async function getLastActiveVehicleId(
  userId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveVehicleId: true },
  });
  return user?.lastActiveVehicleId ?? null;
}
