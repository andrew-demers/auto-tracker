import { format } from "date-fns";
import { Fuel, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/empty-state";
import { FuelUpDialog } from "@/components/fuel-ups/fuel-up-dialog";
import { DeleteFuelUpButton } from "@/components/fuel-ups/delete-fuel-up-button";
import { AttachmentGrid } from "@/components/attachments/attachment-grid";
import { getFuelUps } from "@/actions/fuel-ups";
import { computeMpgSeries } from "@/lib/mpg";
import {
  formatGallons,
  formatMiles,
  formatMpg,
  formatUsd,
  formatUsdPerGallon,
} from "@/lib/units";

export async function FuelUpsSection({
  vehicleId,
  /** Odometer readings from other records (expenses, maintenance) - used
   * alongside sibling fuel-ups to compute the soft odometer warning. */
  otherOdometerValues,
}: {
  vehicleId: string;
  otherOdometerValues: number[];
}) {
  const fuelUpsAsc = await getFuelUps(vehicleId);
  const mpgSeries = computeMpgSeries(fuelUpsAsc);
  const mpgById = new Map(mpgSeries.map((r) => [r.fuelUp.id, r.mpg]));
  const suspectById = new Map(mpgSeries.map((r) => [r.fuelUp.id, r.suspect]));
  const rowsDesc = [...fuelUpsAsc].reverse();

  function comparisonOdometerExcluding(excludeId: string | null) {
    const values = [
      ...fuelUpsAsc.filter((f) => f.id !== excludeId).map((f) => f.odometer),
      ...otherOdometerValues,
    ];
    return values.length > 0 ? Math.max(...values) : 0;
  }

  /** Average price/gallon over this vehicle's last 5 fill-ups (excluding the
   * one being edited) - used for a soft warning on entries that look like a
   * gallons/price typo (e.g. an extra or dropped digit). */
  function recentAvgPricePerGallonExcluding(excludeId: string | null) {
    const recent = fuelUpsAsc
      .filter((f) => f.id !== excludeId)
      .slice(-5)
      .map((f) => f.pricePerGallon);
    if (recent.length === 0) return undefined;
    return recent.reduce((sum, v) => sum + v, 0) / recent.length;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {fuelUpsAsc.length} fuel-up{fuelUpsAsc.length === 1 ? "" : "s"}
        </h3>
        <FuelUpDialog
          vehicleId={vehicleId}
          comparisonOdometer={comparisonOdometerExcluding(null)}
          recentAvgPricePerGallon={recentAvgPricePerGallonExcluding(null)}
        />
      </div>

      {rowsDesc.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="No fuel-ups yet"
          description="Log your first fill-up to start tracking MPG and fuel costs."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Gallons</TableHead>
                <TableHead>$/gal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>MPG</TableHead>
                <TableHead>Tank</TableHead>
                <TableHead>Attachments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsDesc.map((fuelUp) => (
                <TableRow key={fuelUp.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(fuelUp.date, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatMiles(fuelUp.odometer)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatGallons(fuelUp.gallons)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatUsdPerGallon(fuelUp.pricePerGallon)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatUsd(fuelUp.totalCost)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {formatMpg(mpgById.get(fuelUp.id) ?? null)}
                      {suspectById.get(fuelUp.id) ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <TriangleAlert
                                className="size-3.5 text-amber-500"
                                aria-label="Unusual MPG"
                              />
                            }
                          />
                          <TooltipContent>
                            This MPG looks unusual next to this vehicle&apos;s
                            other fill-ups - check for a missed fill-up or a
                            gallons/price/total typo nearby.
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {fuelUp.isFullTank ? (
                      <Badge variant="secondary">Full</Badge>
                    ) : (
                      <Badge variant="outline">Partial</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <AttachmentGrid
                      ownerType="FUEL_UP"
                      ownerId={fuelUp.id}
                      attachments={fuelUp.attachments}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <FuelUpDialog
                        vehicleId={vehicleId}
                        comparisonOdometer={comparisonOdometerExcluding(fuelUp.id)}
                        recentAvgPricePerGallon={recentAvgPricePerGallonExcluding(fuelUp.id)}
                        fuelUp={{
                          id: fuelUp.id,
                          date: format(fuelUp.date, "yyyy-MM-dd"),
                          odometer: String(fuelUp.odometer),
                          gallons: String(fuelUp.gallons),
                          pricePerGallon: String(fuelUp.pricePerGallon),
                          totalCost: String(fuelUp.totalCost),
                          isFullTank: fuelUp.isFullTank,
                          station: fuelUp.station ?? "",
                          notes: fuelUp.notes ?? "",
                        }}
                      />
                      <DeleteFuelUpButton fuelUpId={fuelUp.id} />
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
