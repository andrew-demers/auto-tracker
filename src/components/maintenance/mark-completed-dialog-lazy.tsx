"use client";

import dynamic from "next/dynamic";

// See vehicle-overview-charts-lazy.tsx for why this dialog is deferred off
// the vehicle detail page's critical hydration path.
const MarkCompletedDialogInner = dynamic(
  () => import("./mark-completed-dialog").then((mod) => mod.MarkCompletedDialog),
  { ssr: false }
);

interface MarkCompletedDialogProps {
  itemId: string;
  itemTitle: string;
  currentOdometer: number;
}

export function MarkCompletedDialog(props: MarkCompletedDialogProps) {
  return <MarkCompletedDialogInner {...props} />;
}
