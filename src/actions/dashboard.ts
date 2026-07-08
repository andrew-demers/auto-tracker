"use server";

import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getCurrentOdometer } from "@/lib/odometer";
import { averageMpg } from "@/lib/mpg";
import { computeMaintenanceStatus, type MaintenanceStatus } from "@/lib/maintenance";
import { expenseCategoryOptions } from "@/lib/validations/expense";

const categoryLabels = new Map(expenseCategoryOptions.map((o) => [o.value, o.label]));

export interface DashboardReminder {
  id: string;
  title: string;
  vehicleId: string;
  vehicleName: string;
  status: Extract<MaintenanceStatus, "DUE_SOON" | "OVERDUE">;
  dueAtOdometer: number | null;
  dueAtDate: Date | null;
}

export interface DashboardActivityItem {
  id: string;
  type: "FUEL_UP" | "EXPENSE";
  vehicleId: string;
  vehicleName: string;
  date: Date;
  description: string;
  amount: number;
}

/**
 * Aggregates stats/activity/reminders across every vehicle for the home
 * dashboard - total spend over the trailing 12 months, average MPG across
 * vehicles that have enough fuel-up history to compute one, upcoming/overdue
 * maintenance reminders, and a merged recent-activity feed.
 */
export async function getDashboardData() {
  await requireUser();

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { name: "asc" },
    include: {
      fuelUps: { orderBy: [{ date: "asc" }, { odometer: "asc" }] },
      expenses: { orderBy: { date: "asc" } },
      maintenanceItems: true,
    },
  });

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  let totalSpendLast12Months = 0;
  const vehicleMpgs: number[] = [];
  const reminders: DashboardReminder[] = [];
  const activity: DashboardActivityItem[] = [];

  for (const vehicle of vehicles) {
    for (const fuelUp of vehicle.fuelUps) {
      if (fuelUp.date >= twelveMonthsAgo) totalSpendLast12Months += fuelUp.totalCost;
      activity.push({
        id: fuelUp.id,
        type: "FUEL_UP",
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        date: fuelUp.date,
        description: `${fuelUp.isFullTank ? "Full" : "Partial"} fill-up${
          fuelUp.station ? ` at ${fuelUp.station}` : ""
        }`,
        amount: fuelUp.totalCost,
      });
    }

    for (const expense of vehicle.expenses) {
      if (expense.date >= twelveMonthsAgo) totalSpendLast12Months += expense.cost;
      const categoryLabel = categoryLabels.get(expense.category) ?? expense.category;
      activity.push({
        id: expense.id,
        type: "EXPENSE",
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        date: expense.date,
        description: expense.vendor ? `${categoryLabel} - ${expense.vendor}` : categoryLabel,
        amount: expense.cost,
      });
    }

    const mpg = averageMpg(vehicle.fuelUps);
    if (mpg !== null) vehicleMpgs.push(mpg);

    const currentOdometer = getCurrentOdometer(vehicle);
    const firstFuelUp = vehicle.fuelUps[0];
    const baselineDate = firstFuelUp?.date ?? vehicle.createdAt;
    const baselineOdometer = firstFuelUp?.odometer ?? 0;

    for (const item of vehicle.maintenanceItems) {
      const result = computeMaintenanceStatus(item, currentOdometer, {
        baselineDate,
        baselineOdometer,
      });
      if (result.status === "DUE_SOON" || result.status === "OVERDUE") {
        reminders.push({
          id: item.id,
          title: item.title,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          status: result.status,
          dueAtOdometer: result.dueAtOdometer,
          dueAtDate: result.dueAtDate,
        });
      }
    }
  }

  activity.sort((a, b) => b.date.getTime() - a.date.getTime());
  reminders.sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "OVERDUE" ? -1 : 1;
  });

  return {
    vehicleCount: vehicles.length,
    totalSpendLast12Months,
    avgMpg:
      vehicleMpgs.length > 0
        ? vehicleMpgs.reduce((sum, v) => sum + v, 0) / vehicleMpgs.length
        : null,
    reminderCount: reminders.length,
    reminders: reminders.slice(0, 6),
    recentActivity: activity.slice(0, 8),
  };
}
