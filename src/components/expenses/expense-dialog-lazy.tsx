"use client";

import dynamic from "next/dynamic";

import type { ExpenseDialogDefaults } from "./expense-dialog";

// Same rationale as vehicle-overview-charts-lazy.tsx: this dialog's
// react-hook-form + zod resolver chunk is otherwise required for the initial
// hydration of every tab panel on the vehicle detail page (Base UI's Tabs
// still needs every panel's client references resolved during hydration,
// even for tabs that aren't active yet). Deferring it via next/dynamic keeps
// that critical path light. The trigger button pops in a moment after the
// rest of the page is interactive instead of blocking on it.
const ExpenseDialogInner = dynamic(
  () => import("./expense-dialog").then((mod) => mod.ExpenseDialog),
  { ssr: false }
);

interface ExpenseDialogProps {
  vehicleId: string;
  expense?: ExpenseDialogDefaults;
}

export function ExpenseDialog(props: ExpenseDialogProps) {
  return <ExpenseDialogInner {...props} />;
}
