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
}

/**
 * @param fuelUpsAsc fuel-ups for a single vehicle, sorted ascending by date
 * (then by odometer as a tiebreak for same-day entries).
 */
export function computeMpgSeries<T extends FuelUpLike>(
  fuelUpsAsc: T[]
): FuelUpWithMpg<T>[] {
  const results: FuelUpWithMpg<T>[] = [];
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

  return results;
}

/** Convenience: average MPG across all fuel-ups that have a computed MPG. */
export function averageMpg<T extends FuelUpLike>(fuelUpsAsc: T[]): number | null {
  const series = computeMpgSeries(fuelUpsAsc).filter(
    (r): r is FuelUpWithMpg<T> & { mpg: number } => r.mpg !== null
  );
  if (series.length === 0) return null;
  const sum = series.reduce((acc, r) => acc + r.mpg, 0);
  return sum / series.length;
}
