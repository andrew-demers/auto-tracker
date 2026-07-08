"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { expenseCategoryOptions } from "@/lib/validations/expense";
import { buildExpenseCategoryBreakdown } from "@/lib/vehicle-stats";
import { formatUsd } from "@/lib/units";

const categoryLabels: Record<string, string> = Object.fromEntries(
  expenseCategoryOptions.map((option) => [option.value, option.label])
);

// Fixed categorical hue per category, assigned once and never reassigned by
// sort order or which categories currently have spend - a filter/new expense
// changing the ranking must not repaint the survivors' colors. MOD and OTHER
// are intentionally left out and folded into a shared neutral "Other" bucket
// below (an 8-color categorical palette is the ceiling before a color stops
// doing useful identity work; the two least-distinctive categories give way).
const CATEGORY_COLOR_ORDER = [
  "MAINTENANCE",
  "REPAIR",
  "INSURANCE",
  "REGISTRATION",
  "PARKING_TOLLS",
  "ACCESSORIES",
  "DETAILING",
  "TIRES",
] as const;

const OTHER_BUCKET_KEY = "OTHER_BUCKET";

const CATEGORY_COLORS: Record<string, { light: string; dark: string }> = {
  MAINTENANCE: { light: "#2a78d6", dark: "#3987e5" },
  REPAIR: { light: "#1baf7a", dark: "#199e70" },
  INSURANCE: { light: "#eda100", dark: "#c98500" },
  REGISTRATION: { light: "#008300", dark: "#008300" },
  PARKING_TOLLS: { light: "#4a3aa7", dark: "#9085e9" },
  ACCESSORIES: { light: "#e34948", dark: "#e66767" },
  DETAILING: { light: "#e87ba4", dark: "#d55181" },
  TIRES: { light: "#eb6834", dark: "#d95926" },
  [OTHER_BUCKET_KEY]: { light: "#898781", dark: "#898781" },
};

function useMode() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return mounted && resolvedTheme === "dark" ? "dark" : "light";
}

interface ChartRow {
  key: string;
  label: string;
  total: number;
}

function buildChartRows(expenses: { category: string; cost: number }[]): ChartRow[] {
  const totals = new Map(
    buildExpenseCategoryBreakdown(expenses).map((entry) => [entry.category, entry.total])
  );

  const rows: ChartRow[] = CATEGORY_COLOR_ORDER.filter((category) =>
    (totals.get(category) ?? 0) > 0
  ).map((category) => ({
    key: category,
    label: categoryLabels[category] ?? category,
    total: totals.get(category)!,
  }));

  const namedCategories = new Set<string>(CATEGORY_COLOR_ORDER);
  const otherTotal = [...totals.entries()]
    .filter(([category]) => !namedCategories.has(category))
    .reduce((sum, [, total]) => sum + total, 0);
  if (otherTotal > 0) {
    rows.push({ key: OTHER_BUCKET_KEY, label: "Other", total: otherTotal });
  }

  return rows.sort((a, b) => b.total - a.total);
}

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

const RADIAN = Math.PI / 180;

// Selective labeling (skip slices under 5% - a percentage label on every
// sliver collides and goes unread; the legend + tooltip still carry them).
// Placed outside the ring using a plain text-token fill rather than a color
// pulled from the slice, per the "text never wears the data color" rule.
function renderSliceLabel(props: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
}) {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  if (percent < 0.05) return null;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="var(--muted-foreground)"
      fontSize={12}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

export function ExpenseCategoryChart({
  expenses,
}: {
  expenses: { category: string; cost: number }[];
}) {
  const mode = useMode();
  const rows = buildChartRows(expenses);

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart margin={{ top: 8, bottom: 8 }}>
        <Pie
          data={rows}
          dataKey="total"
          nameKey="label"
          innerRadius={70}
          outerRadius={100}
          paddingAngle={2}
          strokeWidth={2}
          stroke="var(--card)"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={renderSliceLabel as any}
          labelLine={{ stroke: "var(--muted-foreground)" }}
        >
          {rows.map((row) => (
            <Cell
              key={row.key}
              fill={CATEGORY_COLORS[row.key]?.[mode] ?? CATEGORY_COLORS[OTHER_BUCKET_KEY][mode]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [
            `${formatUsd(Number(value))} (${Math.round((Number(value) / total) * 100)}%)`,
            name,
          ]}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
