import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentOdometer } from "@/lib/odometer";
import { computeMaintenanceStatus } from "@/lib/maintenance";
import {
  isSmtpConfigured,
  sendMaintenanceEmail,
  type MaintenanceEmailItem,
} from "@/lib/mail";

export type CheckAndNotifyResult =
  | { ran: true; emailsSent: number; itemsFlagged: number }
  | { ran: false; reason: string };

/**
 * Loads all maintenance items, recomputes their due status, and emails every
 * notification-enabled user a single batched digest covering any item whose
 * status just transitioned into DUE_SOON/OVERDUE (i.e. differs from what it
 * was last notified for). Updates lastNotifiedStatus/lastNotifiedAt so the
 * same transition doesn't re-notify daily.
 */
export async function checkAndNotify(): Promise<CheckAndNotifyResult> {
  if (process.env.NOTIFICATIONS_ENABLED !== "true") {
    return { ran: false, reason: "NOTIFICATIONS_ENABLED is not \"true\"." };
  }
  if (!isSmtpConfigured()) {
    return { ran: false, reason: "SMTP is not configured." };
  }

  const [items, recipients] = await Promise.all([
    prisma.maintenanceItem.findMany({
      where: { notifyEnabled: true },
      include: {
        vehicle: {
          include: {
            // Fetches all fuel-ups (not just the first) since
            // getCurrentOdometer needs the max odometer across all of them;
            // the earliest one is separately picked out below for the
            // maintenance baseline.
            fuelUps: {
              select: { odometer: true, date: true },
              orderBy: { date: "asc" },
            },
            expenses: { select: { odometer: true } },
            maintenanceItems: { select: { lastDoneOdometer: true } },
          },
        },
      },
    }),
    prisma.user.findMany({ where: { notifyEnabled: true } }),
  ]);

  const perUser = new Map<string, MaintenanceEmailItem[]>();
  const statusUpdates: { id: string; status: "DUE_SOON" | "OVERDUE" }[] = [];

  for (const item of items) {
    const currentOdometer = getCurrentOdometer(item.vehicle);
    const firstFuelUp = item.vehicle.fuelUps[0];
    const baselineDate = firstFuelUp?.date ?? item.vehicle.createdAt;
    const baselineOdometer = firstFuelUp?.odometer ?? 0;

    const result = computeMaintenanceStatus(item, currentOdometer, {
      baselineDate,
      baselineOdometer,
    });

    if (result.status !== "DUE_SOON" && result.status !== "OVERDUE") continue;
    if (result.status === item.lastNotifiedStatus) continue;

    statusUpdates.push({ id: item.id, status: result.status });

    const emailItem: MaintenanceEmailItem = {
      title: item.title,
      vehicleId: item.vehicleId,
      vehicleName: item.vehicle.name,
      status: result.status,
      dueAtOdometer: result.dueAtOdometer,
      dueAtDate: result.dueAtDate,
    };

    for (const recipient of recipients) {
      const list = perUser.get(recipient.id) ?? [];
      list.push(emailItem);
      perUser.set(recipient.id, list);
    }
  }

  let emailsSent = 0;
  for (const recipient of recipients) {
    const list = perUser.get(recipient.id);
    if (list && list.length > 0) {
      await sendMaintenanceEmail(recipient, list);
      emailsSent++;
    }
  }

  await Promise.all(
    statusUpdates.map((update) =>
      prisma.maintenanceItem.update({
        where: { id: update.id },
        data: { lastNotifiedStatus: update.status, lastNotifiedAt: new Date() },
      })
    )
  );

  return { ran: true, emailsSent, itemsFlagged: statusUpdates.length };
}
