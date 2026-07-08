"use client";

import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AttachmentGrid, type AttachmentRow } from "@/components/attachments/attachment-grid";
import { expenseCategoryOptions, type ExpenseCategoryValue } from "@/lib/validations/expense";
import { formatMiles, formatUsd } from "@/lib/units";

const categoryLabels: Record<string, string> = Object.fromEntries(
  expenseCategoryOptions.map((option) => [option.value, option.label])
);

export interface ExpenseDetailData {
  id: string;
  date: Date;
  category: ExpenseCategoryValue;
  type: string | null;
  odometer: number | null;
  cost: number;
  vendor: string | null;
  notes: string | null;
  attachments: AttachmentRow[];
}

export function ExpenseDetailDialog({
  expense,
  open,
  onOpenChange,
}: {
  expense: ExpenseDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {expense ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {categoryLabels[expense.category] ?? expense.category}
                {expense.type ? (
                  <span className="font-normal text-muted-foreground"> · {expense.type}</span>
                ) : null}
              </DialogTitle>
              <DialogDescription>{format(expense.date, "MMMM d, yyyy")}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="font-medium">{formatUsd(expense.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Odometer</p>
                <p className="font-medium">
                  {expense.odometer != null ? formatMiles(expense.odometer) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="font-medium">{expense.vendor || "-"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {expense.notes || "-"}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Attachments</p>
              <AttachmentGrid
                ownerType="EXPENSE"
                ownerId={expense.id}
                attachments={expense.attachments}
              />
            </div>

            <DialogFooter showCloseButton />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
