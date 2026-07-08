import Link from "next/link";
import { Plus, Car } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getVehicles } from "@/actions/vehicles";

export default async function VehiclesPage() {
  const vehicles = await getVehicles();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            Your shared fleet - every user can see and manage all vehicles.
          </p>
        </div>
        {vehicles.length > 0 ? (
          <Button render={<Link href="/vehicles/new" />} nativeButton={false}>
            <Plus className="size-4" />
            Add vehicle
          </Button>
        ) : null}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          description="Add your first vehicle to start tracking fuel-ups, expenses, and maintenance."
          action={
            <Button render={<Link href="/vehicles/new" />} nativeButton={false}>
              <Plus className="size-4" />
              Add your first vehicle
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
}
