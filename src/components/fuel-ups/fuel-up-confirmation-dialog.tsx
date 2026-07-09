"use client";

import { CircleCheck, Equal, TrendingDown, TrendingUp } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FuelUpMpgSummary } from "@/actions/fuel-ups";
import { formatMpg } from "@/lib/units";

interface FuelUpConfirmationDialogProps {
  summary: FuelUpMpgSummary | null;
  onOpenChange: (open: boolean) => void;
}

/** Rounds to the same precision `formatMpg` displays, so "same" only shows
 * when the numbers would actually look identical on screen. */
function trend(current: number, baseline: number): "up" | "down" | "same" {
  const a = Math.round(current * 10);
  const b = Math.round(baseline * 10);
  if (a === b) return "same";
  return a > b ? "up" : "down";
}

function TrendRow({ label, current, baseline }: { label: string; current: number; baseline: number }) {
  const direction = trend(current, baseline);
  const diff = Math.abs(current - baseline);

  const icon =
    direction === "up" ? (
      <TrendingUp className="size-4 text-green-600 dark:text-green-500" />
    ) : direction === "down" ? (
      <TrendingDown className="size-4 text-red-600 dark:text-red-500" />
    ) : (
      <Equal className="size-4 text-muted-foreground" />
    );

  const message =
    direction === "same"
      ? `Same as ${label}`
      : `${direction === "up" ? "Up" : "Down"} ${formatMpg(diff)} from ${label} (${formatMpg(baseline)})`;

  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span>{message}</span>
    </div>
  );
}

export function FuelUpConfirmationDialog({
  summary,
  onOpenChange,
}: FuelUpConfirmationDialogProps) {
  return (
    <Dialog open={summary !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleCheck className="size-5 text-green-600 dark:text-green-500" />
            Fuel-up logged
          </DialogTitle>
          <DialogDescription>
            {summary?.mpg != null
              ? "Here's how this fill-up stacks up."
              : "MPG needs a full tank and a prior full-tank fill-up to calculate - it'll show up once you have both."}
          </DialogDescription>
        </DialogHeader>

        {summary?.mpg != null ? (
          <div className="flex flex-col gap-3">
            <p className="text-2xl font-heading font-medium">
              {formatMpg(summary.mpg)}
            </p>
            <div className="flex flex-col gap-1.5">
              {summary.previousMpg != null ? (
                <TrendRow
                  label="last fill-up"
                  current={summary.mpg}
                  baseline={summary.previousMpg}
                />
              ) : null}
              {summary.averageMpg != null ? (
                <TrendRow
                  label="your average"
                  current={summary.mpg}
                  baseline={summary.averageMpg}
                />
              ) : null}
              {summary.previousMpg == null && summary.averageMpg == null ? (
                <p className="text-sm text-muted-foreground">
                  Not enough history yet to compare - keep logging fill-ups.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Nice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
