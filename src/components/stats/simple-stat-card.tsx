import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface SimpleStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Secondary value shown below, e.g. a fuel-only variant of the headline figure. */
  subLabel?: string;
  subValue?: string;
}

export function SimpleStatCard({
  icon: Icon,
  label,
  value,
  subLabel,
  subValue,
}: SimpleStatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
          {subValue ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {subValue}
              {subLabel ? ` · ${subLabel}` : ""}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
