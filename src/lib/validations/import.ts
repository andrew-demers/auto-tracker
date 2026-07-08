import { z } from "zod";

export const importDataTypeSchema = z.enum(["FUEL", "EXPENSE"]);
export const importDateFormatSchema = z.enum([
  "AUTO",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
]);

/**
 * Input to the execute-import server action. `mapping` keys are CSV column
 * indexes (as strings, since zod records require string keys) mapped to a
 * target field key, or "" for "don't import this column".
 */
export const executeImportSchema = z.object({
  vehicleId: z.string().min(1),
  dataType: importDataTypeSchema,
  dateFormat: importDateFormatSchema,
  csvBase64: z.string().min(1),
  mapping: z.record(z.string(), z.string()),
});

export type ExecuteImportInput = z.input<typeof executeImportSchema>;
export type ExecuteImportData = z.output<typeof executeImportSchema>;
