import type { LucideIcon } from "lucide-react";
import { CircleDollarSign } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const GOOD_CLASS = "text-[#1a7a34] dark:text-[#3ecf66]";
const BAD_CLASS = "text-destructive";

interface DualStatItem {
  label: string;
  value: string;
  tone: "good" | "bad";
  icon?: LucideIcon;
}

interface DualStatCardProps {
  title?: string;
  /** Optional big headline figure above the two side-by-side stats, e.g. an
   * overall average with its best/worst breakdown below. */
  headline?: { label: string; value: string };
  left: DualStatItem;
  right: DualStatItem;
}

/** Two side-by-side "best"/"worst" (or lowest/highest) figures, each with a
 * colored icon - same green/red semantics as PeriodBreakdownCard's trend
 * arrows. */
export function DualStatCard({ title, headline, left, right }: DualStatCardProps) {
  return (
    <Card>
      <CardContent className="py-5">
        {title ? (
          <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
        ) : null}
        {headline ? (
          <div className="mb-5">
            <p className="text-sm text-muted-foreground">{headline.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {headline.value}
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          {[left, right].map((item) => {
            const Icon = item.icon ?? CircleDollarSign;
            return (
              <div key={item.label}>
                <Icon
                  className={cn(
                    "size-5",
                    item.tone === "good" ? GOOD_CLASS : BAD_CLASS
                  )}
                />
                <p className="mt-1.5 font-medium">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
