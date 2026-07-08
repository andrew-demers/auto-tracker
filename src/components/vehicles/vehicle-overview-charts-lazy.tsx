"use client";

import dynamic from "next/dynamic";

import type { MonthlyCostBucket, MpgTrendPoint } from "@/lib/vehicle-stats";

// Recharts pulls in a large module graph (its own cartesian/component/state/util
// sub-bundles). Statically importing it from the vehicle detail page meant every
// visit had to fetch that whole graph just to hydrate the page shell - including
// the tab bar - before anything on the page became interactive. On slower or
// more connection-constrained clients that extra weight on the critical
// hydration path is enough to blow past chunk-load timeouts, so keeping this
// off the initial bundle via next/dynamic keeps the shell (tabs, header, etc.)
// interactive immediately regardless of how long the chart bundle takes.
const ChartSkeleton = () => (
  <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
    Loading chart...
  </div>
);

const CostOverTimeChartInner = dynamic(
  () => import("./vehicle-overview-charts").then((mod) => mod.CostOverTimeChart),
  { ssr: false, loading: ChartSkeleton }
);

const MpgTrendChartInner = dynamic(
  () => import("./vehicle-overview-charts").then((mod) => mod.MpgTrendChart),
  { ssr: false, loading: ChartSkeleton }
);

export function CostOverTimeChart(props: { data: MonthlyCostBucket[] }) {
  return <CostOverTimeChartInner {...props} />;
}

export function MpgTrendChart(props: { data: MpgTrendPoint[] }) {
  return <MpgTrendChartInner {...props} />;
}
