"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseDialog } from "@/components/expenses/expense-dialog-lazy";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { ExpenseDetailDialog } from "@/components/expenses/expense-detail-dialog";
import type { AttachmentRow } from "@/components/attachments/attachment-grid";
import {
  expenseCategoryOptions,
  type ExpenseCategoryValue,
} from "@/lib/validations/expense";
import { formatMiles, formatUsd } from "@/lib/units";

export interface ExpenseRow {
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

const categoryLabels: Record<string, string> = Object.fromEntries(
  expenseCategoryOptions.map((option) => [option.value, option.label])
);

// Passed as Select's `items` prop so the trigger shows the right label
// immediately, without requiring the popup to have been opened at least
// once first (Base UI only resolves Select.Value's label from the popup's
// mounted items unless `items` is provided).
const categoryFilterItems = [
  { value: "ALL", label: "All categories" },
  ...expenseCategoryOptions,
];

export function ExpensesTable({
  vehicleId,
  expenses,
}: {
  vehicleId: string;
  expenses: ExpenseRow[];
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [detailExpense, setDetailExpense] = useState<ExpenseRow | null>(null);

  const filtered = useMemo(() => {
    if (categoryFilter === "ALL") return expenses;
    return expenses.filter((expense) => expense.category === categoryFilter);
  }, [expenses, categoryFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Select
          items={categoryFilterItems}
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value ?? "ALL")}
        >
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {expenseCategoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No expenses match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => (
                <TableRow
                  key={expense.id}
                  className="cursor-pointer"
                  onClick={() => setDetailExpense(expense)}
                >
                  <TableCell className="whitespace-nowrap">
                    {format(expense.date, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="w-fit">
                      {categoryLabels[expense.category] ?? expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {expense.type || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {expense.odometer != null ? formatMiles(expense.odometer) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatUsd(expense.cost)}
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ExpenseDialog
                        vehicleId={vehicleId}
                        expense={{
                          id: expense.id,
                          date: format(expense.date, "yyyy-MM-dd"),
                          category: expense.category,
                          type: expense.type ?? "",
                          odometer:
                            expense.odometer != null ? String(expense.odometer) : "",
                          cost: String(expense.cost),
                          vendor: expense.vendor ?? "",
                          notes: expense.notes ?? "",
                        }}
                      />
                      <DeleteExpenseButton expenseId={expense.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ExpenseDetailDialog
        expense={detailExpense}
        open={detailExpense !== null}
        onOpenChange={(next) => {
          if (!next) setDetailExpense(null);
        }}
      />
    </div>
  );
}
