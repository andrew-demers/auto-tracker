import { format } from "date-fns";
import { Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
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
        className="border-[#f0d9a1] bg-[#fdf1da] text-[#92600a] dark:border-[rgba(245,166,35,0.32)] dark:bg-[rgba(245,166,35,0.14)] dark:text-[#f0a83c]"
      >
        Due soon
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-[#bfe8c9] bg-[#e6f6ea] text-[#1a7a34] dark:border-[rgba(39,166,68,0.35)] dark:bg-[rgba(39,166,68,0.16)] dark:text-[#3ecf66]"
    >
      OK
    </Badge>
  );
}

/** Same green/amber/red semantics as StatusBadge, applied to the progress fill. */
function statusProgressColor(status: MaintenanceStatus): string {
  if (status === "OVERDUE") return "bg-destructive";
  if (status === "DUE_SOON") return "bg-[#92600a] dark:bg-[#f0a83c]";
  return "bg-[#1a7a34] dark:bg-[#3ecf66]";
}

function MaintenanceProgressBar({
  status,
  progress,
}: {
  status: MaintenanceStatus;
  progress: number;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <Progress
      value={percent}
      className="w-28"
      aria-label={`${percent}% of the way to due`}
    >
      <ProgressTrack>
        <ProgressIndicator className={statusProgressColor(status)} />
      </ProgressTrack>
    </Progress>
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
        <div className="overflow-x-auto rounded-lg border">
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
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge status={item.status} />
                      <MaintenanceProgressBar status={item.status} progress={item.progress} />
                    </div>
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
