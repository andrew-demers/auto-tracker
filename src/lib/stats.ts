import {
  startOfYear,
  endOfYear,
  subYears,
  startOfMonth,
  endOfMonth,
  subMonths,
  differenceInCalendarDays,
} from "date-fns";

// Stats-page data shaping - aggregates fuel-up/expense history into the
// year/month comparisons and best/worst figures shown on the Stats page.
// Kept separate from the Prisma fetch (src/actions/stats.ts) so the
// bucketing math is easy to reason about/test on its own.

export interface DateRange {
  start: Date;
  end: Date;
}

export interface StatsPeriods {
  thisYear: DateRange;
  previousYear: DateRange;
  thisMonth: DateRange;
  previousMonth: DateRange;
}

/** "This year"/"this month" run from the 1st through now (partial, since
 * they're still in progress); "previous" periods are the full prior
 * calendar year/month. */
export function getStatsPeriods(now: Date = new Date()): StatsPeriods {
  return {
    thisYear: { start: startOfYear(now), end: now },
    previousYear: {
      start: startOfYear(subYears(now, 1)),
      end: endOfYear(subYears(now, 1)),
    },
    thisMonth: { start: startOfMonth(now), end: now },
    previousMonth: {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
    },
  };
}

function inRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export interface PeriodStat {
  total: number;
  thisYear: number;
  previousYear: number;
  thisMonth: number;
  previousMonth: number;
}

/** Sums `getValue` over `items` for the running total plus each of the four
 * comparison periods. */
export function buildPeriodStat<T>(
  items: T[],
  getDate: (item: T) => Date,
  getValue: (item: T) => number,
  periods: StatsPeriods
): PeriodStat {
  let total = 0;
  let thisYear = 0;
  let previousYear = 0;
  let thisMonth = 0;
  let previousMonth = 0;

  for (const item of items) {
    const date = getDate(item);
    const value = getValue(item);
    total += value;
    if (inRange(date, periods.thisYear)) thisYear += value;
    if (inRange(date, periods.previousYear)) previousYear += value;
    if (inRange(date, periods.thisMonth)) thisMonth += value;
    if (inRange(date, periods.previousMonth)) previousMonth += value;
  }

  return { total, thisYear, previousYear, thisMonth, previousMonth };
}

export interface FuelUpForTanks {
  date: Date;
  odometer: number;
  gallons: number;
  totalCost: number;
  isFullTank: boolean;
}

export interface TankInterval {
  /** The full-tank fill-up that closes this interval. */
  date: Date;
  milesDelta: number;
  mpg: number;
  costPerMile: number;
}

/**
 * One entry per full-tank-to-full-tank interval, mirroring computeMpgSeries's
 * rule (src/lib/mpg.ts) but also carrying the cost burned over that interval
 * so cost-per-mile (best/worst tank) can be derived alongside MPG.
 */
export function computeTankIntervals<T extends FuelUpForTanks>(
  fuelUpsAsc: T[]
): TankInterval[] {
  const intervals: TankInterval[] = [];
  let lastFullTankIndex: number | null = null;

  for (let i = 0; i < fuelUpsAsc.length; i++) {
    const current = fuelUpsAsc[i];

    if (current.isFullTank && lastFullTankIndex !== null) {
      const prevFullTank = fuelUpsAsc[lastFullTankIndex];
      const milesDelta = current.odometer - prevFullTank.odometer;

      let gallonsSum = 0;
      let costSum = 0;
      for (let j = lastFullTankIndex + 1; j <= i; j++) {
        gallonsSum += fuelUpsAsc[j].gallons;
        costSum += fuelUpsAsc[j].totalCost;
      }

      if (milesDelta > 0 && gallonsSum > 0) {
        intervals.push({
          date: current.date,
          milesDelta,
          mpg: milesDelta / gallonsSum,
          costPerMile: costSum / milesDelta,
        });
      }
    }

    if (current.isFullTank) {
      lastFullTankIndex = i;
    }
  }

  return intervals;
}

/** Odometer reading as of the most recent fuel-up at or before `date`, or
 * null if there's no fuel-up history that early. */
function odometerAtOrBefore(
  fuelUpsAsc: { date: Date; odometer: number }[],
  date: Date
): number | null {
  let result: number | null = null;
  for (const fuelUp of fuelUpsAsc) {
    if (fuelUp.date > date) break;
    result = fuelUp.odometer;
  }
  return result;
}

/**
 * Distance driven within `range`, derived from fuel-up odometer readings.
 * The baseline is the last reading strictly before the range so a
 * still-in-progress "this year"/"this month" range only counts miles
 * actually driven since it started - falling back to `baselineOdometer`
 * (the vehicle's first-ever reading) when the range covers the very start
 * of its tracked history.
 */
export function distanceInRange(
  fuelUpsAsc: { date: Date; odometer: number }[],
  range: DateRange,
  baselineOdometer: number
): number {
  const endOdometer = odometerAtOrBefore(fuelUpsAsc, range.end);
  if (endOdometer === null) return 0;
  const startOdometer =
    odometerAtOrBefore(fuelUpsAsc, new Date(range.start.getTime() - 1)) ??
    baselineOdometer;
  return Math.max(0, endOdometer - startOdometer);
}

export interface FuelUpRecord {
  date: Date;
  odometer: number;
  gallons: number;
  totalCost: number;
  pricePerGallon: number;
  isFullTank: boolean;
}

export interface ExpenseRecord {
  date: Date;
  cost: number;
}

export interface VehicleStatsInput {
  /** Ascending by date (then odometer as a tiebreak). */
  fuelUpsAsc: FuelUpRecord[];
  expenses: ExpenseRecord[];
  /** First-ever odometer reading for this vehicle (0 if none), used as the
   * distance baseline. */
  baselineOdometer: number;
  currentOdometer: number;
}

export interface StatsData {
  fillUps: {
    count: PeriodStat;
    gallons: PeriodStat;
    minFillUpGallons: number | null;
    maxFillUpGallons: number | null;
    avgMpg: number | null;
  };
  costs: {
    withFuel: PeriodStat;
    withoutFuel: PeriodStat;
    gas: PeriodStat;
    entryCount: number;
    fillUpCount: number;
    lowestBill: number | null;
    highestBill: number | null;
    bestGasPrice: number | null;
    worstGasPrice: number | null;
    avgCostPerMile: number | null;
    avgCostPerMileFuelOnly: number | null;
    bestCostPerMile: number | null;
    worstCostPerMile: number | null;
    avgCostPerDay: number | null;
    avgCostPerMonth: number | null;
  };
  distance: {
    total: PeriodStat;
    avgPerDay: number | null;
    avgPerMonth: number | null;
    avgPerFillUp: number | null;
    longestFillUp: number | null;
    shortestFillUp: number | null;
    /** Only meaningful for a single selected vehicle - null when combining
     * multiple vehicles' separate odometers. */
    currentOdometer: number | null;
  };
}

function min(values: number[]): number | null {
  return values.length > 0 ? Math.min(...values) : null;
}

function max(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null;
}

function average(values: number[]): number | null {
  return values.length > 0
    ? values.reduce((sum, v) => sum + v, 0) / values.length
    : null;
}

/** Combines one or more vehicles' fuel-up/expense history into the Stats
 * page's Fill-ups/Costs/Distance figures. Sums (costs, gallons, counts) are
 * computed over the flattened combined records; odometer-dependent figures
 * (distance, MPG, cost-per-mile) are computed per vehicle first since
 * different vehicles' odometers can't be combined directly, then merged. */
export function buildStatsData(
  vehicles: VehicleStatsInput[],
  now: Date = new Date()
): StatsData {
  const periods = getStatsPeriods(now);

  const allFuelUps = vehicles.flatMap((v) => v.fuelUpsAsc);
  const allExpenses = vehicles.flatMap((v) => v.expenses);
  const allTankIntervals = vehicles.flatMap((v) =>
    computeTankIntervals(v.fuelUpsAsc)
  );

  const gas = buildPeriodStat(
    allFuelUps,
    (f) => f.date,
    (f) => f.totalCost,
    periods
  );
  const withoutFuel = buildPeriodStat(
    allExpenses,
    (e) => e.date,
    (e) => e.cost,
    periods
  );
  const withFuel: PeriodStat = {
    total: gas.total + withoutFuel.total,
    thisYear: gas.thisYear + withoutFuel.thisYear,
    previousYear: gas.previousYear + withoutFuel.previousYear,
    thisMonth: gas.thisMonth + withoutFuel.thisMonth,
    previousMonth: gas.previousMonth + withoutFuel.previousMonth,
  };

  const count = buildPeriodStat(allFuelUps, (f) => f.date, () => 1, periods);
  const gallons = buildPeriodStat(
    allFuelUps,
    (f) => f.date,
    (f) => f.gallons,
    periods
  );

  const totalDistance = vehicles.reduce(
    (sum, v) => sum + Math.max(0, v.currentOdometer - v.baselineOdometer),
    0
  );
  const distanceTotal: PeriodStat = {
    total: totalDistance,
    thisYear: 0,
    previousYear: 0,
    thisMonth: 0,
    previousMonth: 0,
  };
  for (const vehicle of vehicles) {
    distanceTotal.thisYear += distanceInRange(
      vehicle.fuelUpsAsc,
      periods.thisYear,
      vehicle.baselineOdometer
    );
    distanceTotal.previousYear += distanceInRange(
      vehicle.fuelUpsAsc,
      periods.previousYear,
      vehicle.baselineOdometer
    );
    distanceTotal.thisMonth += distanceInRange(
      vehicle.fuelUpsAsc,
      periods.thisMonth,
      vehicle.baselineOdometer
    );
    distanceTotal.previousMonth += distanceInRange(
      vehicle.fuelUpsAsc,
      periods.previousMonth,
      vehicle.baselineOdometer
    );
  }

  const earliestDate = [
    ...allFuelUps.map((f) => f.date),
    ...allExpenses.map((e) => e.date),
  ].reduce((earliest: Date | null, d) => (earliest === null || d < earliest ? d : earliest), null);
  const daysTracked =
    earliestDate !== null
      ? Math.max(1, differenceInCalendarDays(now, earliestDate) + 1)
      : null;
  const monthsTracked = daysTracked !== null ? daysTracked / 30.44 : null;

  const gallonsValues = allFuelUps.map((f) => f.gallons);
  const priceValues = allFuelUps.map((f) => f.pricePerGallon);
  const billValues = allExpenses.map((e) => e.cost);
  const mpgValues = allTankIntervals.map((t) => t.mpg);
  const costPerMileValues = allTankIntervals.map((t) => t.costPerMile);
  const milesDeltaValues = allTankIntervals.map((t) => t.milesDelta);

  return {
    fillUps: {
      count,
      gallons,
      minFillUpGallons: min(gallonsValues),
      maxFillUpGallons: max(gallonsValues),
      avgMpg: average(mpgValues),
    },
    costs: {
      withFuel,
      withoutFuel,
      gas,
      entryCount: allExpenses.length,
      fillUpCount: allFuelUps.length,
      lowestBill: min(billValues),
      highestBill: max(billValues),
      bestGasPrice: min(priceValues),
      worstGasPrice: max(priceValues),
      avgCostPerMile: totalDistance > 0 ? withFuel.total / totalDistance : null,
      avgCostPerMileFuelOnly:
        totalDistance > 0 ? gas.total / totalDistance : null,
      bestCostPerMile: min(costPerMileValues),
      worstCostPerMile: max(costPerMileValues),
      avgCostPerDay: daysTracked !== null ? withFuel.total / daysTracked : null,
      avgCostPerMonth:
        monthsTracked !== null ? withFuel.total / monthsTracked : null,
    },
    distance: {
      total: distanceTotal,
      avgPerDay: daysTracked !== null ? totalDistance / daysTracked : null,
      avgPerMonth: monthsTracked !== null ? totalDistance / monthsTracked : null,
      avgPerFillUp:
        allTankIntervals.length > 0
          ? totalDistance / allTankIntervals.length
          : null,
      longestFillUp: max(milesDeltaValues),
      shortestFillUp: min(milesDeltaValues),
      currentOdometer: vehicles.length === 1 ? vehicles[0].currentOdometer : null,
    },
  };
}
