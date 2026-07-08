"use client";

import dynamic from "next/dynamic";

// Recharts pulls in a large module graph - see vehicle-overview-charts-lazy.tsx
// for why this stays off the initial bundle via next/dynamic.
const ChartSkeleton = () => (
  <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
    Loading chart...
  </div>
);

const ExpenseCategoryChartInner = dynamic(
  () => import("./expense-category-chart").then((mod) => mod.ExpenseCategoryChart),
  { ssr: false, loading: ChartSkeleton }
);

export function ExpenseCategoryChart(props: { expenses: { category: string; cost: number }[] }) {
  return <ExpenseCategoryChartInner {...props} />;
}
