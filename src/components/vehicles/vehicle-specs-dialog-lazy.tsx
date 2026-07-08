"use client";

import dynamic from "next/dynamic";

import type { VehicleSpecsFormValues } from "@/lib/validations/vehicle-specs";

// See vehicle-overview-charts-lazy.tsx for why this dialog is deferred off
// the vehicle detail page's critical hydration path.
const VehicleSpecsDialogInner = dynamic(
  () => import("./vehicle-specs-dialog").then((mod) => mod.VehicleSpecsDialog),
  { ssr: false }
);

interface VehicleSpecsDialogProps {
  vehicleId: string;
  defaultValues: VehicleSpecsFormValues;
  hasAnySpecs: boolean;
}

export function VehicleSpecsDialog(props: VehicleSpecsDialogProps) {
  return <VehicleSpecsDialogInner {...props} />;
}
