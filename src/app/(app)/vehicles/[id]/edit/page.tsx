import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { getVehicle } from "@/actions/vehicles";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await getVehicle(id);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.6px]">
          Edit {vehicle.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Update this vehicle&apos;s details.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Vehicle details</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            vehicleId={vehicle.id}
            defaultValues={{
              name: vehicle.name,
              make: vehicle.make ?? "",
              model: vehicle.model ?? "",
              year: vehicle.year != null ? String(vehicle.year) : "",
              fuelType: vehicle.fuelType,
              tankCapacity:
                vehicle.tankCapacity != null
                  ? String(vehicle.tankCapacity)
                  : "",
              photoUrl: vehicle.photoUrl ?? "",
              notes: vehicle.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
