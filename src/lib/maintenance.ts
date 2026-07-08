import { addMonths, differenceInCalendarDays } from "date-fns";

// Maintenance due-status calculation.
//
// next-due-mileage = lastDoneOdometer + intervalMiles (if intervalMiles set)
// next-due-date    = lastDoneDate + intervalMonths (if intervalMonths set)
// Status = OVERDUE if either threshold has passed, DUE_SOON if within 500 mi
// or 14 days of a threshold, else OK.
//
// If the item has no lastDoneDate/lastDoneOdometer, it's treated as due from
// the vehicle's creation date / first fuel-up odometer - callers pass those
// in as the baseline fallback.

export type MaintenanceStatus = "OK" | "DUE_SOON" | "OVERDUE";

export const DUE_SOON_MILES_THRESHOLD = 500;
export const DUE_SOON_DAYS_THRESHOLD = 14;

export interface MaintenanceStatusInput {
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDoneDate: Date | null;
  lastDoneOdometer: number | null;
}

export interface MaintenanceStatusOptions {
  now?: Date;
  /** Fallback baseline date when the item has no lastDoneDate (e.g. vehicle creation / first fuel-up date). */
  baselineDate?: Date | null;
  /** Fallback baseline odometer when the item has no lastDoneOdometer (e.g. 0 / first fuel-up odometer). */
  baselineOdometer?: number | null;
}

export interface MaintenanceStatusResult {
  status: MaintenanceStatus;
  dueAtOdometer: number | null;
  dueAtDate: Date | null;
  milesRemaining: number | null;
  daysRemaining: number | null;
  /** How far along the item is toward being due, as a 0-1 fraction (clamped) -
   * the larger of the mileage-based and time-based fraction, whichever is
   * closer to due. 1 means due/overdue. Use for a progress bar next to the
   * status badge; the badge/status above still carries the actual semantics. */
  progress: number;
}

export function computeMaintenanceStatus(
  item: MaintenanceStatusInput,
  currentOdometer: number,
  options: MaintenanceStatusOptions = {}
): MaintenanceStatusResult {
  const now = options.now ?? new Date();
  const baselineOdometer =
    item.lastDoneOdometer ?? options.baselineOdometer ?? 0;
  const baselineDate = item.lastDoneDate ?? options.baselineDate ?? null;

  const dueAtOdometer =
    item.intervalMiles != null ? baselineOdometer + item.intervalMiles : null;
  const dueAtDate =
    item.intervalMonths != null && baselineDate != null
      ? addMonths(baselineDate, item.intervalMonths)
      : null;

  const milesRemaining =
    dueAtOdometer != null ? dueAtOdometer - currentOdometer : null;
  const daysRemaining =
    dueAtDate != null ? differenceInCalendarDays(dueAtDate, now) : null;

  const overdueByMiles = milesRemaining != null && milesRemaining <= 0;
  const overdueByDate = daysRemaining != null && daysRemaining <= 0;
  const dueSoonByMiles =
    milesRemaining != null &&
    milesRemaining > 0 &&
    milesRemaining <= DUE_SOON_MILES_THRESHOLD;
  const dueSoonByDate =
    daysRemaining != null &&
    daysRemaining > 0 &&
    daysRemaining <= DUE_SOON_DAYS_THRESHOLD;

  let status: MaintenanceStatus = "OK";
  if (overdueByMiles || overdueByDate) {
    status = "OVERDUE";
  } else if (dueSoonByMiles || dueSoonByDate) {
    status = "DUE_SOON";
  }

  // Progress toward due, as a fraction: mileage-based (elapsed / interval)
  // and time-based (elapsed / interval), taking whichever is larger (i.e.
  // closer to due). Clamped to 0-1 so overdue items still read as a "full"
  // bar rather than overflowing.
  const milesFraction =
    item.intervalMiles != null
      ? (currentOdometer - baselineOdometer) / item.intervalMiles
      : null;
  const daysFraction =
    dueAtDate != null && baselineDate != null && item.intervalMonths != null
      ? (now.getTime() - baselineDate.getTime()) /
        (dueAtDate.getTime() - baselineDate.getTime())
      : null;
  const rawProgress = Math.max(
    milesFraction ?? Number.NEGATIVE_INFINITY,
    daysFraction ?? Number.NEGATIVE_INFINITY
  );
  const progress = Number.isFinite(rawProgress)
    ? Math.min(1, Math.max(0, rawProgress))
    : 0;

  return { status, dueAtOdometer, dueAtDate, milesRemaining, daysRemaining, progress };
}
