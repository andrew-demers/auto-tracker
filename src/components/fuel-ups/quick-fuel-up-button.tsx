"use client";

import { Fuel } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FuelUpDialog } from "@/components/fuel-ups/fuel-up-dialog";

interface QuickFuelUpButtonProps {
  vehicles: { id: string; name: string }[];
  defaultVehicleId?: string | null;
}

/** Persistent "Log fuel-up" action shown in the app header on every page -
 * unlike the vehicle-scoped FuelUpDialog usages, this one shows a vehicle
 * picker first since it isn't tied to a vehicle detail page. */
export function QuickFuelUpButton({ vehicles, defaultVehicleId }: QuickFuelUpButtonProps) {
  if (vehicles.length === 0) return null;

  return (
    <FuelUpDialog
      vehicles={vehicles}
      defaultVehicleId={defaultVehicleId ?? undefined}
      trigger={
        <Button variant="secondary" size="sm" aria-label="Log fuel-up">
          <Fuel className="size-4" />
          <span className="hidden sm:inline">Log fuel-up</span>
        </Button>
      }
    />
  );
}
