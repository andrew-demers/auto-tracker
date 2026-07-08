import { Card, CardContent } from "@/components/ui/card";
import { expenseCategoryOptions } from "@/lib/validations/expense";
import { buildExpenseCategoryBreakdown } from "@/lib/vehicle-stats";
import { formatUsd } from "@/lib/units";

const categoryLabels: Record<string, string> = Object.fromEntries(
  expenseCategoryOptions.map((option) => [option.value, option.label])
);

export function ExpenseCategoryBreakdown({
  expenses,
}: {
  expenses: { category: string; cost: number }[];
}) {
  const breakdown = buildExpenseCategoryBreakdown(expenses);
  if (breakdown.length === 0) return null;

  const total = breakdown.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-x-6 gap-y-3 py-4">
        {breakdown.map((entry) => (
          <div key={entry.category} className="min-w-[7rem]">
            <p className="text-xs text-muted-foreground">
              {categoryLabels[entry.category] ?? entry.category}
            </p>
            <p className="text-sm font-semibold">
              {formatUsd(entry.total)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {Math.round((entry.total / total) * 100)}%
              </span>
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
