import {
  BarChart3,
  Droplet,
  Fuel,
  Gauge,
  Route,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { StatsVehicleSelect } from "@/components/stats/stats-vehicle-select";
import { PeriodBreakdownCard } from "@/components/stats/period-breakdown-card";
import { DualStatCard } from "@/components/stats/dual-stat-card";
import { SimpleStatCard } from "@/components/stats/simple-stat-card";
import { getVehicleOptions } from "@/actions/vehicles";
import { getStatsData } from "@/actions/stats";
import { getLastActiveVehicleId } from "@/lib/last-active-vehicle";
import { requireUser } from "@/lib/auth-guards";
import {
  formatUsd,
  formatUsdPrecise,
  formatUsdPerMile,
  formatUsdPerGallon,
  formatMiles,
  formatGallons,
  formatMpg,
} from "@/lib/units";

const validTabs = ["fill-ups", "costs", "distance"] as const;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string; tab?: string }>;
}) {
  const user = await requireUser();
  const { vehicle, tab } = await searchParams;

  const vehicles = await getVehicleOptions();

  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No stats yet"
        description="Add a vehicle and log some fuel-ups to see stats here."
      />
    );
  }

  const lastActiveVehicleId = await getLastActiveVehicleId(user.id);
  const selectedVehicleId =
    vehicle && (vehicle === "all" || vehicles.some((v) => v.id === vehicle))
      ? vehicle
      : (lastActiveVehicleId ?? "all");

  const stats = await getStatsData(selectedVehicleId);

  const defaultTab = validTabs.includes(tab as (typeof validTabs)[number])
    ? (tab as (typeof validTabs)[number])
    : "fill-ups";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.6px]">Stats</h1>
        <StatsVehicleSelect
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
        />
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="fill-ups">Fill-ups</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="distance">Distance</TabsTrigger>
        </TabsList>

        <TabsContent value="fill-ups" className="mt-4 flex flex-col gap-4">
          <PeriodBreakdownCard
            title="Fill-ups"
            stat={stats.fillUps.count}
            format={(v) => String(Math.round(v))}
          />
          <PeriodBreakdownCard
            title="Gas"
            stat={stats.fillUps.gallons}
            format={formatGallons}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DualStatCard
              left={{
                label: "Min fill-up",
                value: formatGallons(stats.fillUps.minFillUpGallons),
                tone: "bad",
                icon: Droplet,
              }}
              right={{
                label: "Max fill-up",
                value: formatGallons(stats.fillUps.maxFillUpGallons),
                tone: "good",
                icon: Droplet,
              }}
            />
            <SimpleStatCard
              icon={TrendingUp}
              label="Average fuel consumption"
              value={formatMpg(stats.fillUps.avgMpg)}
            />
          </div>
        </TabsContent>

        <TabsContent value="costs" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SimpleStatCard
              icon={Route}
              label="Avg cost per distance"
              value={formatUsdPerMile(stats.costs.avgCostPerMile)}
              subValue={formatUsdPerMile(stats.costs.avgCostPerMileFuelOnly)}
              subLabel="Fuel only"
            />
            <SimpleStatCard
              icon={Wallet}
              label="Number of entries"
              value={String(stats.costs.entryCount)}
              subValue={String(stats.costs.fillUpCount)}
              subLabel="Fill-ups"
            />
          </div>

          <PeriodBreakdownCard
            title="Costs with fuel"
            stat={stats.costs.withFuel}
            format={formatUsd}
            trend="lowerIsBetter"
          />
          <PeriodBreakdownCard
            title="Costs without fuel"
            stat={stats.costs.withoutFuel}
            format={formatUsd}
            trend="lowerIsBetter"
          />
          <PeriodBreakdownCard
            title="Gas"
            stat={stats.costs.gas}
            format={formatUsd}
            trend="lowerIsBetter"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <DualStatCard
              title="Bills"
              left={{
                label: "Lowest bill",
                value: formatUsd(stats.costs.lowestBill),
                tone: "good",
              }}
              right={{
                label: "Highest bill",
                value: formatUsd(stats.costs.highestBill),
                tone: "bad",
              }}
            />
            <DualStatCard
              title="Gas price"
              left={{
                label: "Best price",
                value: formatUsdPerGallon(stats.costs.bestGasPrice),
                tone: "good",
                icon: Fuel,
              }}
              right={{
                label: "Worst price",
                value: formatUsdPerGallon(stats.costs.worstGasPrice),
                tone: "bad",
                icon: Fuel,
              }}
            />
          </div>

          <DualStatCard
            headline={{
              label: "Average cost per mile",
              value: formatUsdPerMile(stats.costs.avgCostPerMile),
            }}
            left={{
              label: "Best cost per mile",
              value: formatUsdPerMile(stats.costs.bestCostPerMile),
              tone: "good",
            }}
            right={{
              label: "Worst cost per mile",
              value: formatUsdPerMile(stats.costs.worstCostPerMile),
              tone: "bad",
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SimpleStatCard
              icon={Wallet}
              label="Average cost per day"
              value={formatUsdPrecise(stats.costs.avgCostPerDay)}
            />
            <SimpleStatCard
              icon={Wallet}
              label="Average cost per month"
              value={formatUsdPrecise(stats.costs.avgCostPerMonth)}
            />
          </div>
        </TabsContent>

        <TabsContent value="distance" className="mt-4 flex flex-col gap-4">
          <PeriodBreakdownCard
            title="Distance driven"
            stat={stats.distance.total}
            format={formatMiles}
          />

          <DualStatCard
            headline={{
              label: "Average distance per fill-up",
              value: formatMiles(stats.distance.avgPerFillUp),
            }}
            left={{
              label: "Shortest fill-up",
              value: formatMiles(stats.distance.shortestFillUp),
              tone: "bad",
            }}
            right={{
              label: "Longest fill-up",
              value: formatMiles(stats.distance.longestFillUp),
              tone: "good",
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SimpleStatCard
              icon={Route}
              label="Average distance per day"
              value={formatMiles(stats.distance.avgPerDay)}
            />
            <SimpleStatCard
              icon={Route}
              label="Average distance per month"
              value={formatMiles(stats.distance.avgPerMonth)}
            />
          </div>

          {stats.distance.currentOdometer !== null ? (
            <SimpleStatCard
              icon={Gauge}
              label="Current odometer"
              value={formatMiles(stats.distance.currentOdometer)}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
