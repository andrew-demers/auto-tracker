import { ClipboardList } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { VehicleSpecsDialog } from "@/components/vehicles/vehicle-specs-dialog";
import type { VehicleSpecsFormValues } from "@/lib/validations/vehicle-specs";

export interface VehicleSpecsData {
  vin: string | null;
  licensePlate: string | null;
  oilType: string | null;
  oilCapacityQuarts: number | null;
  oilFilterPartNumber: string | null;
  tireSize: string | null;
  tireSizeRear: string | null;
  tirePressureFrontPsi: number | null;
  tirePressureRearPsi: number | null;
  transmissionFluidType: string | null;
  transmissionFluidCapacityQuarts: number | null;
  brakeFluidType: string | null;
  coolantType: string | null;
  batteryType: string | null;
  sparkPlugType: string | null;
  wiperBladeSizeFront: string | null;
  wiperBladeSizeRear: string | null;
}

const displayGroups: {
  title: string;
  fields: { key: keyof VehicleSpecsData; label: string; suffix?: string }[];
}[] = [
  {
    title: "Identification",
    fields: [
      { key: "vin", label: "VIN" },
      { key: "licensePlate", label: "License plate" },
    ],
  },
  {
    title: "Engine",
    fields: [
      { key: "oilType", label: "Oil type" },
      { key: "oilCapacityQuarts", label: "Oil capacity", suffix: " qt" },
      { key: "oilFilterPartNumber", label: "Oil filter part #" },
    ],
  },
  {
    title: "Drivetrain",
    fields: [
      { key: "transmissionFluidType", label: "Transmission fluid" },
      {
        key: "transmissionFluidCapacityQuarts",
        label: "Transmission fluid capacity",
        suffix: " qt",
      },
    ],
  },
  {
    title: "Tires",
    fields: [
      { key: "tireSize", label: "Tire size" },
      { key: "tireSizeRear", label: "Tire size (rear)" },
      { key: "tirePressureFrontPsi", label: "Tire pressure - front", suffix: " psi" },
      { key: "tirePressureRearPsi", label: "Tire pressure - rear", suffix: " psi" },
    ],
  },
  {
    title: "Other fluids",
    fields: [
      { key: "brakeFluidType", label: "Brake fluid" },
      { key: "coolantType", label: "Coolant" },
    ],
  },
  {
    title: "Electrical",
    fields: [
      { key: "batteryType", label: "Battery" },
      { key: "sparkPlugType", label: "Spark plugs" },
    ],
  },
  {
    title: "Wipers",
    fields: [
      { key: "wiperBladeSizeFront", label: "Wiper blades - front" },
      { key: "wiperBladeSizeRear", label: "Wiper blades - rear" },
    ],
  },
];

function hasValue(value: string | number | null): value is string | number {
  return value !== null && value !== "";
}

export function VehicleSpecsSection({
  vehicleId,
  specs,
}: {
  vehicleId: string;
  specs: VehicleSpecsData;
}) {
  const hasAnySpecs = Object.values(specs).some(hasValue);

  const defaultValues: VehicleSpecsFormValues = {
    vin: specs.vin ?? "",
    licensePlate: specs.licensePlate ?? "",
    oilType: specs.oilType ?? "",
    oilCapacityQuarts:
      specs.oilCapacityQuarts != null ? String(specs.oilCapacityQuarts) : "",
    oilFilterPartNumber: specs.oilFilterPartNumber ?? "",
    tireSize: specs.tireSize ?? "",
    tireSizeRear: specs.tireSizeRear ?? "",
    tirePressureFrontPsi:
      specs.tirePressureFrontPsi != null ? String(specs.tirePressureFrontPsi) : "",
    tirePressureRearPsi:
      specs.tirePressureRearPsi != null ? String(specs.tirePressureRearPsi) : "",
    transmissionFluidType: specs.transmissionFluidType ?? "",
    transmissionFluidCapacityQuarts:
      specs.transmissionFluidCapacityQuarts != null
        ? String(specs.transmissionFluidCapacityQuarts)
        : "",
    brakeFluidType: specs.brakeFluidType ?? "",
    coolantType: specs.coolantType ?? "",
    batteryType: specs.batteryType ?? "",
    sparkPlugType: specs.sparkPlugType ?? "",
    wiperBladeSizeFront: specs.wiperBladeSizeFront ?? "",
    wiperBladeSizeRear: specs.wiperBladeSizeRear ?? "",
  };

  if (!hasAnySpecs) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No specs added yet"
        description="Add VIN, oil type, tire sizes, and other reference details for quick access during maintenance."
        action={
          <VehicleSpecsDialog
            vehicleId={vehicleId}
            defaultValues={defaultValues}
            hasAnySpecs={false}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <VehicleSpecsDialog
          vehicleId={vehicleId}
          defaultValues={defaultValues}
          hasAnySpecs
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {displayGroups.map((group) => {
          const visibleFields = group.fields.filter((f) => hasValue(specs[f.key]));
          if (visibleFields.length === 0) return null;
          return (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {visibleFields.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium">
                      {specs[f.key]}
                      {f.suffix ?? ""}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
