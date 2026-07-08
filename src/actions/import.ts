"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  MAX_CSV_SIZE_BYTES,
  MAX_CSV_ROWS,
  parseCsv,
  encodeCsvBase64,
  decodeCsvBase64,
  buildFuelUpRow,
  buildExpenseRow,
  FUEL_TARGET_FIELDS,
  EXPENSE_TARGET_FIELDS,
  type ImportedFuelUpRow,
  type ImportedExpenseRow,
} from "@/lib/csv-import";
import { executeImportSchema, type ExecuteImportInput } from "@/lib/validations/import";

export interface ImportUploadResult {
  error?: string;
  csvBase64?: string;
  rowCount?: number;
}

/**
 * Step 1 (Upload): parses the CSV server-side via papaparse, enforces the
 * size/row caps, and hands back the raw CSV re-encoded as base64 so the
 * client can round-trip it through the map-columns step with no server-side
 * temp storage involved.
 */
export async function validateImportUpload(formData: FormData): Promise<ImportUploadResult> {
  await requireUser();

  const dataType = formData.get("dataType");
  const vehicleId = formData.get("vehicleId");
  const file = formData.get("file");

  if (dataType !== "FUEL" && dataType !== "EXPENSE") {
    return { error: "Choose a data type." };
  }
  if (typeof vehicleId !== "string" || vehicleId.length === 0) {
    return { error: "Choose a vehicle." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file." };
  }
  if (!file.name.toLowerCase().endsWith(".csv") && file.type && file.type !== "text/csv") {
    return { error: "File must be a .csv file." };
  }
  if (file.size > MAX_CSV_SIZE_BYTES) {
    return {
      error: `File is too large (max ${Math.round(MAX_CSV_SIZE_BYTES / (1024 * 1024))}MB).`,
    };
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  const text = await file.text();
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) {
    return { error: "The CSV file appears to be empty." };
  }
  if (rows.length === 0) {
    return { error: "The CSV file has headers but no data rows." };
  }
  if (rows.length > MAX_CSV_ROWS) {
    return {
      error: `Too many rows (${rows.length.toLocaleString()}) - max ${MAX_CSV_ROWS.toLocaleString()}.`,
    };
  }

  return { csvBase64: encodeCsvBase64(text), rowCount: rows.length };
}

export interface ImportSkip {
  row: number;
  reason: string;
}

export interface ImportResult {
  error?: string;
  imported?: number;
  skipped?: ImportSkip[];
}

/**
 * Step 3 (Execute): re-parses the round-tripped CSV, applies the column
 * mapping + date format to every row, validates each row independently
 * (a bad row is skipped with a reason rather than failing the whole
 * import), and bulk-inserts the valid rows in a single transaction.
 */
export async function executeImport(input: ExecuteImportInput): Promise<ImportResult> {
  await requireUser();

  const parseResult = executeImportSchema.safeParse(input);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }
  const { vehicleId, dataType, dateFormat, csvBase64, mapping } = parseResult.data;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  let csvText: string;
  try {
    csvText = decodeCsvBase64(csvBase64);
  } catch {
    return { error: "The uploaded CSV data is corrupted - please re-upload." };
  }

  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0 || rows.length === 0) {
    return { error: "The uploaded CSV data is empty - please re-upload." };
  }
  if (rows.length > MAX_CSV_ROWS) {
    return {
      error: `Too many rows (${rows.length.toLocaleString()}) - max ${MAX_CSV_ROWS.toLocaleString()}.`,
    };
  }

  const targetFields = dataType === "FUEL" ? FUEL_TARGET_FIELDS : EXPENSE_TARGET_FIELDS;
  const mappedTargets = new Set(Object.values(mapping).filter((v) => v));
  const missingRequired = targetFields.filter((f) => f.required && !mappedTargets.has(f.key));
  if (missingRequired.length > 0) {
    return {
      error: `Missing required column mapping for: ${missingRequired.map((f) => f.label).join(", ")}.`,
    };
  }
  if (
    dataType === "FUEL" &&
    !mappedTargets.has("pricePerGallon") &&
    !mappedTargets.has("totalCost")
  ) {
    return { error: "Map at least one of Price/gallon or Total cost." };
  }

  const skipped: ImportSkip[] = [];
  const validFuelRows: ImportedFuelUpRow[] = [];
  const validExpenseRows: ImportedExpenseRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for the header row, +1 to 1-index
    const values: Record<string, string | undefined> = {};
    for (const [colIndexStr, targetKey] of Object.entries(mapping)) {
      if (!targetKey) continue;
      values[targetKey] = row[Number(colIndexStr)];
    }

    const result =
      dataType === "FUEL" ? buildFuelUpRow(values, dateFormat) : buildExpenseRow(values, dateFormat);

    if ("error" in result) {
      skipped.push({ row: rowNumber, reason: result.error });
      return;
    }

    if (dataType === "FUEL") {
      validFuelRows.push(result.data as ImportedFuelUpRow);
    } else {
      validExpenseRows.push(result.data as ImportedExpenseRow);
    }
  });

  const importedCount = validFuelRows.length + validExpenseRows.length;

  if (importedCount > 0) {
    await prisma.$transaction(async (tx) => {
      if (validFuelRows.length > 0) {
        await tx.fuelUp.createMany({
          data: validFuelRows.map((row) => ({ vehicleId, ...row })),
        });
      }
      if (validExpenseRows.length > 0) {
        await tx.expense.createMany({
          data: validExpenseRows.map((row) => ({ vehicleId, ...row })),
        });
      }
    });
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/");
  }

  return { imported: importedCount, skipped };
}
