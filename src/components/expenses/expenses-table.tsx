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
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { AttachmentGrid } from "@/components/attachments/attachment-grid";
import {
  expenseCategoryOptions,
  type ExpenseCategoryValue,
} from "@/lib/validations/expense";
import { formatMiles, formatUsd } from "@/lib/units";

export interface ExpenseRow {
  id: string;
  date: Date;
  category: ExpenseCategoryValue;
  odometer: number | null;
  cost: number;
  vendor: string | null;
  notes: string | null;
  attachments: { id: string; filename: string; mimeType: string }[];
}

const categoryLabels: Record<string, string> = Object.fromEntries(
  expenseCategoryOptions.map((option) => [option.value, option.label])
);

export function ExpensesTable({
  vehicleId,
  expenses,
}: {
  vehicleId: string;
  expenses: ExpenseRow[];
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (categoryFilter === "ALL") return expenses;
    return expenses.filter((expense) => expense.category === categoryFilter);
  }, [expenses, categoryFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Select
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
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Attachments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(expense.date, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {categoryLabels[expense.category] ?? expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {expense.odometer != null ? formatMiles(expense.odometer) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatUsd(expense.cost)}
                  </TableCell>
                  <TableCell>{expense.vendor || "-"}</TableCell>
                  <TableCell>
                    <AttachmentGrid
                      ownerType="EXPENSE"
                      ownerId={expense.id}
                      attachments={expense.attachments}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ExpenseDialog
                        vehicleId={vehicleId}
                        expense={{
                          id: expense.id,
                          date: format(expense.date, "yyyy-MM-dd"),
                          category: expense.category,
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
    </div>
  );
}
