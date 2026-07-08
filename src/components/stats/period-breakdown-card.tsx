import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PeriodStat } from "@/lib/stats";

const GOOD_CLASS = "text-[#1a7a34] dark:text-[#3ecf66]";
const BAD_CLASS = "text-destructive";

/** Same green/red semantics as the maintenance status badges - green when
 * the change works in the viewer's favor, red otherwise. */
function Trend({
  current,
  previous,
  lowerIsBetter,
}: {
  current: number;
  previous: number;
  lowerIsBetter: boolean;
}) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.005) {
    return <Minus className="size-3.5 text-muted-foreground" />;
  }
  const isGood = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return <Icon className={cn("size-3.5", isGood ? GOOD_CLASS : BAD_CLASS)} />;
}

interface PeriodBreakdownCardProps {
  title: string;
  stat: PeriodStat;
  format: (value: number) => string;
  /** Show a colored up/down trend arrow next to the this-year/this-month
   * figures (costs: lower is better; omit for neutral counts/gallons). */
  trend?: "lowerIsBetter" | "higherIsBetter";
}

export function PeriodBreakdownCard({
  title,
  stat,
  format,
  trend,
}: PeriodBreakdownCardProps) {
  const lowerIsBetter = trend === "lowerIsBetter";

  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {format(stat.total)}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              {trend ? (
                <Trend
                  current={stat.thisYear}
                  previous={stat.previousYear}
                  lowerIsBetter={lowerIsBetter}
                />
              ) : null}
              <span className="font-medium">{format(stat.thisYear)}</span>
            </div>
            <p className="text-xs text-muted-foreground">This year</p>
            <p className="mt-2 text-sm text-muted-foreground/80">
              {format(stat.previousYear)}
            </p>
            <p className="text-xs text-muted-foreground">Previous year</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              {trend ? (
                <Trend
                  current={stat.thisMonth}
                  previous={stat.previousMonth}
                  lowerIsBetter={lowerIsBetter}
                />
              ) : null}
              <span className="font-medium">{format(stat.thisMonth)}</span>
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
            <p className="mt-2 text-sm text-muted-foreground/80">
              {format(stat.previousMonth)}
            </p>
            <p className="text-xs text-muted-foreground">Previous month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
