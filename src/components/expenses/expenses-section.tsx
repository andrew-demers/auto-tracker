import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ExpenseDialog } from "@/components/expenses/expense-dialog-lazy";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { getExpenses } from "@/actions/expenses";

export async function ExpensesSection({ vehicleId }: { vehicleId: string }) {
  const expenses = await getExpenses(vehicleId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {expenses.length} expense{expenses.length === 1 ? "" : "s"}
        </h3>
        <ExpenseDialog vehicleId={vehicleId} />
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Log insurance, repairs, registration, and other costs here."
        />
      ) : (
        <ExpensesTable vehicleId={vehicleId} expenses={expenses} />
      )}
    </div>
  );
}
