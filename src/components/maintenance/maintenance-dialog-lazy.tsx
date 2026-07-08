"use client";

import dynamic from "next/dynamic";

import type { MaintenanceDialogDefaults } from "./maintenance-dialog";

// See vehicle-overview-charts-lazy.tsx for why this dialog is deferred off
// the vehicle detail page's critical hydration path.
const MaintenanceDialogInner = dynamic(
  () => import("./maintenance-dialog").then((mod) => mod.MaintenanceDialog),
  { ssr: false }
);

interface MaintenanceDialogProps {
  vehicleId: string;
  item?: MaintenanceDialogDefaults;
}

export function MaintenanceDialog(props: MaintenanceDialogProps) {
  return <MaintenanceDialogInner {...props} />;
}
