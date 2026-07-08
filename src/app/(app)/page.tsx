import Link from "next/link";
import { format } from "date-fns";
import { Car, Plus, DollarSign, TrendingUp, Wrench, Fuel, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth-guards";
import { getVehicles } from "@/actions/vehicles";
import { getDashboardData } from "@/actions/dashboard";
import { formatMiles, formatMpg, formatUsd } from "@/lib/units";

export default async function DashboardPage() {
  const user = await requireUser();
  const vehicles = await getVehicles();

  const greetingName = user.name?.trim() || user.email;

  if (vehicles.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {greetingName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s a quick look at your fleet.
          </p>
        </div>
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          description="Add your first vehicle to start tracking mileage, fuel-ups, and maintenance."
          action={
            <Button render={<Link href="/vehicles/new" />} nativeButton={false}>
              <Plus className="size-4" />
              Add your first vehicle
            </Button>
          }
        />
      </div>
    );
  }

  const dashboard = await getDashboardData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {greetingName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s a quick look at your fleet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <DollarSign className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spend (last 12 months)</p>
              <p className="text-lg font-semibold">
                {formatUsd(dashboard.totalSpendLast12Months)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average MPG</p>
              <p className="text-lg font-semibold">{formatMpg(dashboard.avgMpg)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Wrench className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reminders due</p>
              <p className="text-lg font-semibold">{dashboard.reminderCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentActivity.length === 0 ? (
              <EmptyState
                icon={Fuel}
                title="No activity yet"
                description="Log a fuel-up or expense to see it here."
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {dashboard.recentActivity.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={`/vehicles/${item.vehicleId}?tab=${
                        item.type === "FUEL_UP" ? "fuel-ups" : "expenses"
                      }`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          {item.type === "FUEL_UP" ? (
                            <Fuel className="size-4 text-muted-foreground" />
                          ) : (
                            <Receipt className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="truncate font-medium">{item.description}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.vehicleName} &middot; {format(item.date, "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-medium">
                        {formatUsd(item.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Upcoming &amp; overdue maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.reminders.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="Nothing due"
                description="All maintenance items are up to date."
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {dashboard.reminders.map((reminder) => (
                  <li key={reminder.id}>
                    <Link
                      href={`/vehicles/${reminder.vehicleId}?tab=maintenance`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <div className="truncate">
                        <p className="truncate font-medium">{reminder.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {reminder.vehicleName}
                        </p>
                      </div>
                      <Badge variant={reminder.status === "OVERDUE" ? "destructive" : "outline"}>
                        {reminder.status === "OVERDUE" ? "Overdue" : "Due soon"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your vehicles</h2>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/vehicles" />}
            nativeButton={false}
          >
            View all
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.slice(0, 6).map((vehicle) => (
            <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{vehicle.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMiles(vehicle.currentOdometer)}
                    </p>
                  </div>
                  <Car className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
