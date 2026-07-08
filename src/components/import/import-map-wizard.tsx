"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { executeImport, type ImportSkip } from "@/actions/import";
import {
  parseCsv,
  suggestMapping,
  getTargetFields,
  decodeCsvBase64,
  DATE_FORMAT_OPTIONS,
  type DateFormatOption,
  type ImportDataType,
  type ParsedCsv,
} from "@/lib/csv-import";

const IMPORT_SESSION_KEY = "auto-tracker-import";
const PREVIEW_ROW_COUNT = 10;

interface StoredImportState {
  dataType: ImportDataType;
  vehicleId: string;
  csvBase64: string;
  rowCount: number;
}

export function ImportMapWizard() {
  const [stored, setStored] = useState<StoredImportState | null>(null);
  const [ready, setReady] = useState(false);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [dateFormat, setDateFormat] = useState<DateFormatOption>("AUTO");
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<{ imported: number; skipped: ImportSkip[] } | null>(
    null
  );

  // One-time hydration from sessionStorage (the round-tripped CSV from the
  // upload step) - there's no external subscription to model this as, so
  // this intentionally sets state directly in the effect body.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const raw = sessionStorage.getItem(IMPORT_SESSION_KEY);
    if (!raw) {
      setReady(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as StoredImportState;
      const { headers } = parseCsv(decodeCsvBase64(parsed.csvBase64));
      const suggested = suggestMapping(headers, parsed.dataType);
      setStored(parsed);
      setMapping(
        Object.fromEntries(Object.entries(suggested).map(([k, v]) => [k, v ?? ""]))
      );
    } catch {
      setStored(null);
    } finally {
      setReady(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const parsedCsv: ParsedCsv | null = useMemo(() => {
    if (!stored) return null;
    return parseCsv(decodeCsvBase64(stored.csvBase64));
  }, [stored]);

  if (!ready) return null;

  if (!stored || !parsedCsv) {
    return (
      <EmptyState
        icon={FileWarning}
        title="No import in progress"
        description="Start a new CSV import to continue - your browser session may have expired."
        action={
          <Button render={<Link href="/import" />} nativeButton={false}>
            Back to import
          </Button>
        }
      />
    );
  }

  const targetFields = getTargetFields(stored.dataType);
  const mappedValues = new Set(Object.values(mapping).filter(Boolean));

  function setColumnMapping(colIndex: number, targetKey: string) {
    setMapping((prev) => ({ ...prev, [colIndex]: targetKey }));
  }

  const missingRequired = targetFields.filter((f) => f.required && !mappedValues.has(f.key));
  const totalCostOk =
    stored.dataType !== "FUEL" ||
    mappedValues.has("pricePerGallon") ||
    mappedValues.has("totalCost");
  const canSubmit = missingRequired.length === 0 && totalCostOk;

  function handleExecute() {
    if (!stored) return;
    startTransition(async () => {
      const result = await executeImport({
        vehicleId: stored.vehicleId,
        dataType: stored.dataType,
        dateFormat,
        csvBase64: stored.csvBase64,
        mapping,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      sessionStorage.removeItem(IMPORT_SESSION_KEY);
      setResults({ imported: result.imported ?? 0, skipped: result.skipped ?? [] });
      toast.success(
        `Imported ${result.imported ?? 0} row${(result.imported ?? 0) === 1 ? "" : "s"}.`
      );
    });
  }

  if (results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import complete</CardTitle>
          <CardDescription>
            {results.imported} row{results.imported === 1 ? "" : "s"} imported
            {results.skipped.length > 0
              ? `, ${results.skipped.length} row${results.skipped.length === 1 ? "" : "s"} skipped.`
              : "."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {results.skipped.length > 0 ? (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.skipped.map((skip) => (
                    <TableRow key={skip.row}>
                      <TableCell>{skip.row}</TableCell>
                      <TableCell>{skip.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href={`/vehicles/${stored.vehicleId}`} />} nativeButton={false}>
              View vehicle
            </Button>
            <Button variant="outline" render={<Link href="/import" />} nativeButton={false}>
              Import another file
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const previewRows = parsedCsv.rows.slice(0, PREVIEW_ROW_COUNT);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Map columns</CardTitle>
          <CardDescription>
            Match each CSV column to a field. {stored.rowCount.toLocaleString()} data row(s)
            detected. Fields marked * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="date-format">Date format</Label>
            <Select
              value={dateFormat}
              onValueChange={(v) => setDateFormat(v as DateFormatOption)}
            >
              <SelectTrigger id="date-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV column</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Map to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedCsv.headers.map((header, index) => {
                  const value = mapping[index] ?? "";
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {header || `Column ${index + 1}`}
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-muted-foreground">
                        {parsedCsv.rows[0]?.[index] ?? ""}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={value || "__skip__"}
                          onValueChange={(v) =>
                            setColumnMapping(index, v === "__skip__" || v === null ? "" : v)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">Don&apos;t import</SelectItem>
                            {targetFields.map((field) => (
                              <SelectItem
                                key={field.key}
                                value={field.key}
                                disabled={mappedValues.has(field.key) && value !== field.key}
                              >
                                {field.label}
                                {field.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {missingRequired.length > 0 ? (
            <p className="text-sm text-destructive">
              Map a column for: {missingRequired.map((f) => f.label).join(", ")}.
            </p>
          ) : null}
          {!totalCostOk ? (
            <p className="text-sm text-destructive">
              Map at least one of Price/gallon or Total cost.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            First {previewRows.length} row{previewRows.length === 1 ? "" : "s"}{" "}
            as they&apos;ll be imported.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  {targetFields.map((field) => (
                    <TableHead key={field.key}>{field.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {targetFields.map((field) => {
                      const colIndex = Object.entries(mapping).find(
                        ([, v]) => v === field.key
                      )?.[0];
                      const value = colIndex !== undefined ? row[Number(colIndex)] : "";
                      return (
                        <TableCell key={field.key} className="whitespace-nowrap">
                          {value || "-"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" render={<Link href="/import" />} nativeButton={false}>
          Back
        </Button>
        <Button onClick={handleExecute} disabled={!canSubmit || isPending}>
          {isPending ? "Importing..." : "Import"}
        </Button>
      </div>
    </div>
  );
}
