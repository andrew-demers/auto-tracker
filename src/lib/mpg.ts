// Fuel-up MPG calculation.
//
// MPG for a given fuel-up = (odometer delta since the previous *full-tank*
// fill-up) / (sum of gallons since that previous full-tank fill-up,
// inclusive of any partial fill-ups in between). Only defined when a
// previous full-tank entry exists AND the current entry is itself a
// full tank (a partial doesn't tell us the tank is completely full, so we
// can't close the loop on gallons burned).

export interface FuelUpLike {
  odometer: number;
  gallons: number;
  isFullTank: boolean;
}

export interface FuelUpWithMpg<T extends FuelUpLike> {
  fuelUp: T;
  mpg: number | null;
  /** True when `mpg` is a lopsided outlier next to this vehicle's other
   * computed values. In practice this almost always means the interval it
   * closes is corrupted - either a fill-up in between was never logged (so
   * the miles span more tanks than the summed gallons account for), or a
   * gallons/price/total typo on one of the fill-ups in the interval - rather
   * than a genuine swing in fuel economy. See computeMpgSeries's doc comment. */
  suspect: boolean;
}

// A real, sudden swing in fuel economy (weather, highway vs. towing, etc.)
// rarely more than doubles or halves a vehicle's usual MPG. Values further
// outside that band next to the vehicle's own median are far more likely to
// be a missed fill-up or a data-entry typo than reality, so they're flagged
// rather than trusted at face value.
const SUSPECT_LOW_RATIO = 0.5;
const SUSPECT_HIGH_RATIO = 1.75;
// Below this many computed values, one real fluctuation could easily look
// like an "outlier" against the median - not enough history yet to judge.
const MIN_SAMPLES_FOR_SUSPECT_CHECK = 4;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * @param fuelUpsAsc fuel-ups for a single vehicle, sorted ascending by date
 * (then by odometer as a tiebreak for same-day entries).
 */
export function computeMpgSeries<T extends FuelUpLike>(
  fuelUpsAsc: T[]
): FuelUpWithMpg<T>[] {
  const results: { fuelUp: T; mpg: number | null }[] = [];
  let lastFullTankIndex: number | null = null;

  for (let i = 0; i < fuelUpsAsc.length; i++) {
    const current = fuelUpsAsc[i];
    let mpg: number | null = null;

    if (current.isFullTank && lastFullTankIndex !== null) {
      const prevFullTank = fuelUpsAsc[lastFullTankIndex];
      const milesDelta = current.odometer - prevFullTank.odometer;

      let gallonsSum = 0;
      for (let j = lastFullTankIndex + 1; j <= i; j++) {
        gallonsSum += fuelUpsAsc[j].gallons;
      }

      if (milesDelta > 0 && gallonsSum > 0) {
        mpg = milesDelta / gallonsSum;
      }
    }

    results.push({ fuelUp: current, mpg });

    if (current.isFullTank) {
      lastFullTankIndex = i;
    }
  }

  const validMpgs = results
    .map((r) => r.mpg)
    .filter((m): m is number => m !== null);
  const baseline =
    validMpgs.length >= MIN_SAMPLES_FOR_SUSPECT_CHECK ? median(validMpgs) : null;

  return results.map((r) => ({
    ...r,
    suspect:
      baseline !== null &&
      r.mpg !== null &&
      (r.mpg < baseline * SUSPECT_LOW_RATIO || r.mpg > baseline * SUSPECT_HIGH_RATIO),
  }));
}

/** Convenience: average MPG across all fuel-ups that have a computed MPG,
 * excluding suspect outliers so one missed fill-up or typo doesn't skew it. */
export function averageMpg<T extends FuelUpLike>(fuelUpsAsc: T[]): number | null {
  const series = computeMpgSeries(fuelUpsAsc).filter(
    (r): r is FuelUpWithMpg<T> & { mpg: number } => r.mpg !== null && !r.suspect
  );
  if (series.length === 0) return null;
  const sum = series.reduce((acc, r) => acc + r.mpg, 0);
  return sum / series.length;
}
