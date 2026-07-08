import { subMonths } from "date-fns";
import { computeMpgSeries, type FuelUpLike } from "@/lib/mpg";

// Chart-ready data shaping for the vehicle Overview tab - kept separate from
// the raw Prisma fetch (in src/actions/vehicles.ts) so the bucketing logic
// is easy to reason about/test on its own.

export interface MonthlyCostBucket {
  month: string; // "YYYY-MM", sortable
  label: string; // "Jan 2026"
  fuelCost: number;
  otherCost: number;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Buckets fuel-up + expense costs into monthly totals for the rolling last `monthsToShow` calendar months. */
export function buildMonthlyCostSeries(
  fuelUps: { date: Date; totalCost: number }[],
  expenses: { date: Date; cost: number }[],
  monthsToShow = 12
): MonthlyCostBucket[] {
  const cutoff = subMonths(new Date(), monthsToShow);
  const buckets = new Map<string, MonthlyCostBucket>();

  function getBucket(date: Date): MonthlyCostBucket {
    const key = monthKey(date);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { month: key, label: monthLabel(date), fuelCost: 0, otherCost: 0 };
      buckets.set(key, bucket);
    }
    return bucket;
  }

  for (const fuelUp of fuelUps) {
    if (fuelUp.date < cutoff) continue;
    getBucket(fuelUp.date).fuelCost += fuelUp.totalCost;
  }
  for (const expense of expenses) {
    if (expense.date < cutoff) continue;
    getBucket(expense.date).otherCost += expense.cost;
  }

  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export interface ExpenseCategoryTotal {
  category: string;
  total: number;
}

/** Sums expense cost by category, sorted highest spend first. Categories with no expenses are omitted. */
export function buildExpenseCategoryBreakdown(
  expenses: { category: string; cost: number }[]
): ExpenseCategoryTotal[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.cost);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export interface MpgTrendPoint {
  date: Date;
  label: string;
  mpg: number;
}

/**
 * One point per fuel-up with a computed MPG (see computeMpgSeries for the
 * rule), limited to the rolling last `monthsToShow` calendar months. MPG is
 * computed over the FULL history first (a windowed point may need an
 * earlier full-tank fill-up outside the window as its baseline) and only
 * the resulting points are then filtered down to the display window.
 */
export function buildMpgTrend<T extends FuelUpLike & { date: Date }>(
  fuelUpsAsc: T[],
  monthsToShow = 12
): MpgTrendPoint[] {
  const cutoff = subMonths(new Date(), monthsToShow);
  return computeMpgSeries(fuelUpsAsc)
    .filter((r): r is typeof r & { mpg: number } => r.mpg !== null)
    .filter((r) => r.fuelUp.date >= cutoff)
    .map((r) => ({
      date: r.fuelUp.date,
      label: r.fuelUp.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      mpg: Math.round(r.mpg * 10) / 10,
    }));
}
