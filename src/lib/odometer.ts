// Current-odometer derivation. Never stored directly on Vehicle - always
// computed from the max odometer reading seen across its related records.

export interface OdometerSources {
  fuelUps?: { odometer: number }[];
  expenses?: { odometer: number | null }[];
  maintenanceItems?: { lastDoneOdometer: number | null }[];
}

export function getCurrentOdometer(sources: OdometerSources): number {
  const values: number[] = [];

  for (const fuelUp of sources.fuelUps ?? []) {
    values.push(fuelUp.odometer);
  }
  for (const expense of sources.expenses ?? []) {
    if (expense.odometer != null) values.push(expense.odometer);
  }
  for (const item of sources.maintenanceItems ?? []) {
    if (item.lastDoneOdometer != null) values.push(item.lastDoneOdometer);
  }

  if (values.length === 0) return 0;
  return Math.max(...values);
}
