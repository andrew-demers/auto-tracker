"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMpg, formatUsd } from "@/lib/units";
import type { MonthlyCostBucket, MpgTrendPoint } from "@/lib/vehicle-stats";

// Categorical series colors drawn from the app's restrained accent set
// (lavender primary + the single semantic success green), per-theme so each
// reads clearly against its own chart surface. Fixed order - never
// reassigned per-chart.
const SERIES_COLORS = {
  fuel: { light: "#5e6ad2", dark: "#828fff" },
  other: { light: "#1e8e3a", dark: "#27a644" },
} as const;

function useSeriesColors() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Standard mounted-guard to avoid a hydration mismatch on theme-dependent colors.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
  return { fuel: SERIES_COLORS.fuel[mode], other: SERIES_COLORS.other[mode] };
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function CostOverTimeChart({ data }: { data: MonthlyCostBucket[] }) {
  const colors = useSeriesColors();
  const hasData = data.some((d) => d.fuelCost > 0 || d.otherCost > 0);

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Not enough data yet - log a fuel-up or expense to see cost trends.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap="24%">
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(value: number) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={tooltipStyle}
          formatter={(value, name) => [
            formatUsd(Number(value)),
            name === "fuelCost" ? "Fuel" : "Other expenses",
          ]}
        />
        <Legend
          formatter={(value: string) => (value === "fuelCost" ? "Fuel" : "Other expenses")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="fuelCost" stackId="cost" name="fuelCost" fill={colors.fuel} maxBarSize={24} />
        <Bar
          dataKey="otherCost"
          stackId="cost"
          name="otherCost"
          fill={colors.other}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MpgTrendChart({ data }: { data: MpgTrendPoint[] }) {
  const colors = useSeriesColors();

  if (data.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Not enough data yet - log another full-tank fill-up to see your MPG trend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={["dataMin - 2", "dataMax + 2"]}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatMpg(Number(value)), "MPG"]}
        />
        <Line
          type="monotone"
          dataKey="mpg"
          stroke={colors.fuel}
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: colors.fuel }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
