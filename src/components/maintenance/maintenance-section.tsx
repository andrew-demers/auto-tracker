import { format } from "date-fns";
import { Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { MaintenanceDialog } from "@/components/maintenance/maintenance-dialog";
import { DeleteMaintenanceItemButton } from "@/components/maintenance/delete-maintenance-item-button";
import { MarkCompletedDialog } from "@/components/maintenance/mark-completed-dialog";
import { getMaintenanceItems } from "@/actions/maintenance";
import { formatMiles } from "@/lib/units";
import type { MaintenanceStatus } from "@/lib/maintenance";

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  if (status === "OVERDUE") {
    return <Badge variant="destructive">Overdue</Badge>;
  }
  if (status === "DUE_SOON") {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
      >
        Due soon
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
    >
      OK
    </Badge>
  );
}

function formatInterval(item: { intervalMiles: number | null; intervalMonths: number | null }) {
  const parts: string[] = [];
  if (item.intervalMiles != null) parts.push(`${item.intervalMiles.toLocaleString()} mi`);
  if (item.intervalMonths != null) parts.push(`${item.intervalMonths} mo`);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

function formatLastDone(item: { lastDoneOdometer: number | null; lastDoneDate: Date | null }) {
  const parts: string[] = [];
  if (item.lastDoneOdometer != null) parts.push(formatMiles(item.lastDoneOdometer));
  if (item.lastDoneDate != null) parts.push(format(item.lastDoneDate, "MMM d, yyyy"));
  return parts.length > 0 ? parts.join(" / ") : "Never";
}

function formatDue(item: { dueAtOdometer: number | null; dueAtDate: Date | null }) {
  const parts: string[] = [];
  if (item.dueAtOdometer != null) {
    parts.push(`${Math.round(item.dueAtOdometer).toLocaleString()} mi`);
  }
  if (item.dueAtDate != null) parts.push(format(item.dueAtDate, "MMM d, yyyy"));
  return parts.length > 0 ? parts.join(" / ") : "-";
}

export async function MaintenanceSection({ vehicleId }: { vehicleId: string }) {
  const data = await getMaintenanceItems(vehicleId);
  if (!data) return null;
  const { items, currentOdometer } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {items.length} maintenance item{items.length === 1 ? "" : "s"}
        </h3>
        <MaintenanceDialog vehicleId={vehicleId} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance reminders yet"
          description="Add an oil change, tire rotation, or other interval-based reminder."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Last done</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatInterval(item)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatLastDone(item)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDue(item)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <MarkCompletedDialog
                        itemId={item.id}
                        itemTitle={item.title}
                        currentOdometer={currentOdometer}
                      />
                      <MaintenanceDialog
                        vehicleId={vehicleId}
                        item={{
                          id: item.id,
                          title: item.title,
                          intervalMiles:
                            item.intervalMiles != null ? String(item.intervalMiles) : "",
                          intervalMonths:
                            item.intervalMonths != null ? String(item.intervalMonths) : "",
                          lastDoneDate: item.lastDoneDate
                            ? format(item.lastDoneDate, "yyyy-MM-dd")
                            : "",
                          lastDoneOdometer:
                            item.lastDoneOdometer != null
                              ? String(item.lastDoneOdometer)
                              : "",
                          notes: item.notes ?? "",
                          notifyEnabled: item.notifyEnabled,
                        }}
                      />
                      <DeleteMaintenanceItemButton itemId={item.id} />
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
