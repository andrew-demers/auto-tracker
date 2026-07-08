"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { validateImportUpload } from "@/actions/import";
import type { ImportDataType } from "@/lib/csv-import";

export const IMPORT_SESSION_KEY = "auto-tracker-import";

// Passed as Select's `items` prop so each trigger shows the right label
// immediately, without requiring the popup to have been opened at least once
// first (Base UI only resolves SelectValue's label from the popup's mounted
// items unless `items` is provided) - see maintenance-dialog.tsx for the
// same pattern.
const dataTypeSelectItems = [
  { value: "FUEL", label: "Fuel logs" },
  { value: "EXPENSE", label: "Expenses" },
];

interface VehicleOption {
  id: string;
  name: string;
}

export function ImportUploadForm({ vehicles }: { vehicles: VehicleOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dataType, setDataType] = useState<ImportDataType>("FUEL");
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const vehicleSelectItems = vehicles.map((vehicle) => ({
    value: vehicle.id,
    label: vehicle.name,
  }));

  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={UploadCloud}
        title="Add a vehicle first"
        description="CSV import needs an existing vehicle to import rows into."
        action={
          <Button render={<Link href="/vehicles/new" />} nativeButton={false}>
            Add a vehicle
          </Button>
        }
      />
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a CSV file.");
      return;
    }
    if (!vehicleId) {
      setError("Choose a vehicle.");
      return;
    }

    const formData = new FormData();
    formData.set("dataType", dataType);
    formData.set("vehicleId", vehicleId);
    formData.set("file", file);

    startTransition(async () => {
      const result = await validateImportUpload(formData);
      if (result.error || !result.csvBase64) {
        setError(result.error ?? "Something went wrong.");
        toast.error(result.error ?? "Something went wrong.");
        return;
      }

      sessionStorage.setItem(
        IMPORT_SESSION_KEY,
        JSON.stringify({
          dataType,
          vehicleId,
          csvBase64: result.csvBase64,
          rowCount: result.rowCount,
        })
      );
      router.push("/import/map");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a CSV file</CardTitle>
        <CardDescription>
          Import fuel logs or expenses from another app or spreadsheet. You&apos;ll map
          columns and preview rows before anything is saved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="import-data-type">Data type</Label>
              <Select
                items={dataTypeSelectItems}
                value={dataType}
                onValueChange={(v) => setDataType(v as ImportDataType)}
              >
                <SelectTrigger id="import-data-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FUEL">Fuel logs</SelectItem>
                  <SelectItem value="EXPENSE">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-vehicle">Vehicle</Label>
              <Select
                items={vehicleSelectItems}
                value={vehicleId}
                onValueChange={(v) => setVehicleId(v ?? "")}
              >
                <SelectTrigger id="import-vehicle" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="import-file">CSV file</Label>
            <input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">Max 5MB, about 20,000 rows.</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Reading file..." : "Continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
