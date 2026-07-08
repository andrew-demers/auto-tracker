import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Fuel, Wrench, Gauge, TrendingUp, DollarSign, Route } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DeleteVehicleButton } from "@/components/vehicles/delete-vehicle-button";
import { FuelUpsSection } from "@/components/fuel-ups/fuel-ups-section";
import { ExpensesSection } from "@/components/expenses/expenses-section";
import { MaintenanceSection } from "@/components/maintenance/maintenance-section";
import { CostOverTimeChart, MpgTrendChart } from "@/components/vehicles/vehicle-overview-charts";
import { VehicleSpecsSection } from "@/components/vehicles/vehicle-specs-section";
import { getVehicle, getVehicleOverviewStats } from "@/actions/vehicles";
import { formatMiles, formatMpg, formatUsd } from "@/lib/units";

const fuelTypeLabels: Record<string, string> = {
  GASOLINE: "Gasoline",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Electric",
  OTHER: "Other",
};

const validTabs = ["overview", "fuel-ups", "expenses", "maintenance", "specs"] as const;

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const vehicle = await getVehicle(id);

  if (!vehicle) {
    notFound();
  }

  const overviewStats = await getVehicleOverviewStats(id);

  const defaultTab = validTabs.includes(tab as (typeof validTabs)[number])
    ? (tab as (typeof validTabs)[number])
    : "overview";

  const otherOdometerValues = [
    ...vehicle.expenses
      .map((expense) => expense.odometer)
      .filter((value): value is number => value != null),
    ...vehicle.maintenanceItems
      .map((item) => item.lastDoneOdometer)
      .filter((value): value is number => value != null),
  ];

  const subtitle = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href="/vehicles"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to vehicles
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-semibold tracking-[-0.6px]">
                {vehicle.name}
              </h1>
              <Badge variant="secondary">
                {fuelTypeLabels[vehicle.fuelType] ?? vehicle.fuelType}
              </Badge>
            </div>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/vehicles/${vehicle.id}/edit`} />}
              nativeButton={false}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <DeleteVehicleButton
              vehicleId={vehicle.id}
              vehicleName={vehicle.name}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fuel-ups">Fuel-ups</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="specs">Specs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Gauge className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Current odometer
                  </p>
                  <p className="text-lg font-semibold">
                    {formatMiles(vehicle.currentOdometer)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Fuel className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tank capacity
                  </p>
                  <p className="text-lg font-semibold">
                    {vehicle.tankCapacity
                      ? `${vehicle.tankCapacity} gal`
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Wrench className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Maintenance items
                  </p>
                  <p className="text-lg font-semibold">
                    {vehicle.maintenanceItems.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <TrendingUp className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Average MPG</p>
                  <p className="text-lg font-semibold">
                    {formatMpg(overviewStats.avgMpg)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <DollarSign className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total spend</p>
                  <p className="text-lg font-semibold">
                    {formatUsd(overviewStats.totalSpend)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Route className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost / mile</p>
                  <p className="text-lg font-semibold">
                    {overviewStats.costPerMile != null
                      ? `${formatUsd(overviewStats.costPerMile)}/mi`
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cost over time</CardTitle>
              </CardHeader>
              <CardContent className="pl-0">
                <CostOverTimeChart data={overviewStats.monthlyCostSeries} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">MPG trend</CardTitle>
              </CardHeader>
              <CardContent className="pl-0">
                <MpgTrendChart data={overviewStats.mpgTrend} />
              </CardContent>
            </Card>
          </div>

          {vehicle.notes ? (
            <Card className="mt-4">
              <CardContent className="py-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {vehicle.notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="fuel-ups" className="mt-4">
          <FuelUpsSection vehicleId={vehicle.id} otherOdometerValues={otherOdometerValues} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesSection vehicleId={vehicle.id} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <MaintenanceSection vehicleId={vehicle.id} />
        </TabsContent>

        <TabsContent value="specs" className="mt-4">
          <VehicleSpecsSection
            vehicleId={vehicle.id}
            specs={{
              vin: vehicle.vin,
              licensePlate: vehicle.licensePlate,
              oilType: vehicle.oilType,
              oilCapacityQuarts: vehicle.oilCapacityQuarts,
              oilFilterPartNumber: vehicle.oilFilterPartNumber,
              tireSize: vehicle.tireSize,
              tireSizeRear: vehicle.tireSizeRear,
              tirePressureFrontPsi: vehicle.tirePressureFrontPsi,
              tirePressureRearPsi: vehicle.tirePressureRearPsi,
              transmissionFluidType: vehicle.transmissionFluidType,
              transmissionFluidCapacityQuarts: vehicle.transmissionFluidCapacityQuarts,
              brakeFluidType: vehicle.brakeFluidType,
              coolantType: vehicle.coolantType,
              batteryType: vehicle.batteryType,
              sparkPlugType: vehicle.sparkPlugType,
              wiperBladeSizeFront: vehicle.wiperBladeSizeFront,
              wiperBladeSizeRear: vehicle.wiperBladeSizeRear,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
