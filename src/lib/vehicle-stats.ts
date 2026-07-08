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

/** Buckets fuel-up + expense costs into monthly totals, most recent `monthsToShow` months. */
export function buildMonthlyCostSeries(
  fuelUps: { date: Date; totalCost: number }[],
  expenses: { date: Date; cost: number }[],
  monthsToShow = 12
): MonthlyCostBucket[] {
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
    getBucket(fuelUp.date).fuelCost += fuelUp.totalCost;
  }
  for (const expense of expenses) {
    getBucket(expense.date).otherCost += expense.cost;
  }

  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-monthsToShow);
}

export interface MpgTrendPoint {
  date: Date;
  label: string;
  mpg: number;
}

/** One point per fuel-up with a computed MPG (see computeMpgSeries for the rule). */
export function buildMpgTrend<T extends FuelUpLike & { date: Date }>(
  fuelUpsAsc: T[]
): MpgTrendPoint[] {
  return computeMpgSeries(fuelUpsAsc)
    .filter((r): r is typeof r & { mpg: number } => r.mpg !== null)
    .map((r) => ({
      date: r.fuelUp.date,
      label: r.fuelUp.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      mpg: Math.round(r.mpg * 10) / 10,
    }));
}
