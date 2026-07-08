import Papa from "papaparse";
import { parse as parseDateFns, isValid as isValidDate } from "date-fns";
import { expenseCategoryValues, type ExpenseCategoryValue } from "@/lib/validations/expense";

// CSV import: shared parsing/mapping/validation helpers used by both the
// server actions (upload validation, execute) and the client-side
// map-columns wizard. Deliberately NOT server-only - papaparse's string
// parser and everything else here works identically in the browser and in
// Node, which lets the map-columns step re-parse the round-tripped CSV
// client-side without a network round-trip.

export const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_CSV_ROWS = 20000;

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(csvText: string): ParsedCsv {
  const result = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: true,
  });
  const data = result.data;
  if (data.length === 0) {
    return { headers: [], rows: [] };
  }
  const [headers, ...rows] = data;
  return { headers, rows };
}

/**
 * Base64 encode/decode helpers that work identically in the browser (no
 * `Buffer`) and in Node (no `atob`/`TextDecoder` for this purpose) - used to
 * round-trip the parsed CSV through a hidden field / sessionStorage between
 * the upload and map-columns steps without any server-side temp storage.
 */
export function encodeCsvBase64(text: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function decodeCsvBase64(base64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export type ImportDataType = "FUEL" | "EXPENSE";

export interface TargetField {
  key: string;
  label: string;
  required: boolean;
}

export const FUEL_TARGET_FIELDS: TargetField[] = [
  { key: "date", label: "Date", required: true },
  { key: "odometer", label: "Odometer", required: true },
  { key: "gallons", label: "Gallons", required: true },
  { key: "pricePerGallon", label: "Price/gallon", required: false },
  { key: "totalCost", label: "Total cost", required: false },
  { key: "isFullTank", label: "Full tank", required: false },
  { key: "station", label: "Station", required: false },
  { key: "notes", label: "Notes", required: false },
];

export const EXPENSE_TARGET_FIELDS: TargetField[] = [
  { key: "date", label: "Date", required: true },
  { key: "category", label: "Category", required: true },
  { key: "cost", label: "Cost", required: true },
  { key: "odometer", label: "Odometer", required: false },
  { key: "vendor", label: "Vendor", required: false },
  { key: "notes", label: "Notes", required: false },
];

export function getTargetFields(dataType: ImportDataType): TargetField[] {
  return dataType === "FUEL" ? FUEL_TARGET_FIELDS : EXPENSE_TARGET_FIELDS;
}

/** Normalized (lowercase, alphanumeric-only) header aliases per target field key. */
const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "filldate", "transactiondate", "servicedate", "datetime"],
  odometer: ["odometer", "mileage", "miles", "odo", "odometerreading"],
  gallons: ["gallons", "gal", "fuelamount", "gallonsamount", "qty", "quantity", "volume"],
  pricePerGallon: [
    "pricepergallon",
    "priceperunit",
    "pricegallon",
    "unitprice",
    "fuelprice",
    "pricegal",
    "ppg",
  ],
  totalCost: ["totalcost", "total", "cost", "amount", "price", "totalprice", "totalamount"],
  isFullTank: ["fulltank", "fillup", "full", "isfull", "tankfull"],
  station: ["station", "location", "gasstation", "vendor"],
  notes: ["notes", "note", "comment", "comments", "description", "memo"],
  category: ["category", "type", "expensetype", "expensecategory"],
  vendor: ["vendor", "merchant", "payee", "shop", "station"],
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Auto-suggests a mapping from CSV column index -> target field key based on
 * the header-alias table above. Each target field is only ever suggested
 * once (first matching column wins), mirroring the "used once" rule enforced
 * in the map-columns UI.
 */
export function suggestMapping(
  headers: string[],
  dataType: ImportDataType
): Record<number, string | null> {
  const targetFields = getTargetFields(dataType);
  const usedTargets = new Set<string>();
  const mapping: Record<number, string | null> = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    let matchedKey: string | null = null;
    for (const field of targetFields) {
      if (usedTargets.has(field.key)) continue;
      const aliases = HEADER_ALIASES[field.key] ?? [];
      if (normalizeHeader(field.key) === normalized || aliases.includes(normalized)) {
        matchedKey = field.key;
        break;
      }
    }
    mapping[index] = matchedKey;
    if (matchedKey) usedTargets.add(matchedKey);
  });

  return mapping;
}

export const DATE_FORMAT_OPTIONS = [
  { value: "AUTO", label: "Auto-detect" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
] as const;

export type DateFormatOption = (typeof DATE_FORMAT_OPTIONS)[number]["value"];

const EXPLICIT_DATE_PATTERNS: Record<Exclude<DateFormatOption, "AUTO">, string> = {
  "MM/DD/YYYY": "MM/dd/yyyy",
  "DD/MM/YYYY": "dd/MM/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

export function parseImportDate(raw: string, format: DateFormatOption): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (format !== "AUTO") {
    const pattern = EXPLICIT_DATE_PATTERNS[format];
    // Tolerate "-" or "/" as the separator regardless of which the pattern uses.
    const normalizedValue = pattern.includes("/")
      ? trimmed.replace(/-/g, "/")
      : trimmed.replace(/\//g, "-");
    const parsed = parseDateFns(normalizedValue, pattern, new Date());
    return isValidDate(parsed) ? parsed : null;
  }

  // Auto-detect: native Date parsing handles ISO 8601 and most unambiguous
  // formats; fall back to trying each explicit format.
  const native = new Date(trimmed);
  if (!Number.isNaN(native.getTime())) return native;

  for (const pattern of Object.values(EXPLICIT_DATE_PATTERNS)) {
    const parsed = parseDateFns(trimmed, pattern, new Date());
    if (isValidDate(parsed)) return parsed;
  }
  return null;
}

const TRUTHY_STRINGS = new Set(["true", "yes", "y", "1", "full", "x"]);
const FALSY_STRINGS = new Set(["false", "no", "n", "0", "partial"]);

function parseImportBoolean(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "") return defaultValue;
  if (TRUTHY_STRINGS.has(normalized)) return true;
  if (FALSY_STRINGS.has(normalized)) return false;
  return defaultValue;
}

function parseImportNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const cleaned = raw.trim().replace(/[$,]/g, "");
  if (cleaned === "") return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

export interface ImportedFuelUpRow {
  date: Date;
  odometer: number;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  isFullTank: boolean;
  station: string | null;
  notes: string | null;
}

export type ImportRowResult<T> = { data: T } | { error: string };

/** `values` is target-field-key -> raw CSV cell for a single row. */
export function buildFuelUpRow(
  values: Record<string, string | undefined>,
  dateFormat: DateFormatOption
): ImportRowResult<ImportedFuelUpRow> {
  const dateRaw = values.date;
  if (!dateRaw || !dateRaw.trim()) return { error: "date is missing" };
  const date = parseImportDate(dateRaw, dateFormat);
  if (!date) return { error: `date "${dateRaw}" could not be parsed` };

  const odometer = parseImportNumber(values.odometer);
  if (odometer === null || odometer < 0) {
    return { error: `odometer "${values.odometer ?? ""}" is not a valid number` };
  }

  const gallons = parseImportNumber(values.gallons);
  if (gallons === null || gallons <= 0) {
    return { error: `gallons "${values.gallons ?? ""}" is not a valid number` };
  }

  let pricePerGallon = parseImportNumber(values.pricePerGallon);
  let totalCost = parseImportNumber(values.totalCost);

  if (pricePerGallon === null && totalCost === null) {
    return { error: "at least one of pricePerGallon or totalCost is required" };
  }
  if (totalCost === null) {
    totalCost = Number((pricePerGallon! * gallons).toFixed(2));
  }
  if (pricePerGallon === null) {
    pricePerGallon = gallons > 0 ? Number((totalCost / gallons).toFixed(4)) : 0;
  }

  return {
    data: {
      date,
      odometer,
      gallons,
      pricePerGallon,
      totalCost,
      isFullTank: parseImportBoolean(values.isFullTank, true),
      station: values.station?.trim() || null,
      notes: values.notes?.trim() || null,
    },
  };
}

export interface ImportedExpenseRow {
  date: Date;
  category: ExpenseCategoryValue;
  odometer: number | null;
  cost: number;
  vendor: string | null;
  notes: string | null;
}

export function buildExpenseRow(
  values: Record<string, string | undefined>,
  dateFormat: DateFormatOption
): ImportRowResult<ImportedExpenseRow> {
  const dateRaw = values.date;
  if (!dateRaw || !dateRaw.trim()) return { error: "date is missing" };
  const date = parseImportDate(dateRaw, dateFormat);
  if (!date) return { error: `date "${dateRaw}" could not be parsed` };

  const categoryRaw = values.category?.trim();
  if (!categoryRaw) return { error: "category is missing" };
  const normalizedCategory = categoryRaw.toUpperCase().replace(/[\s-]+/g, "_");
  const category = (expenseCategoryValues as readonly string[]).includes(normalizedCategory)
    ? (normalizedCategory as ExpenseCategoryValue)
    : "OTHER";

  const cost = parseImportNumber(values.cost);
  if (cost === null || cost < 0) {
    return { error: `cost "${values.cost ?? ""}" is not a valid number` };
  }

  let odometer: number | null = null;
  if (values.odometer && values.odometer.trim()) {
    odometer = parseImportNumber(values.odometer);
    if (odometer === null || odometer < 0) {
      return { error: `odometer "${values.odometer}" is not a valid number` };
    }
  }

  return {
    data: {
      date,
      category,
      odometer,
      cost,
      vendor: values.vendor?.trim() || null,
      notes: values.notes?.trim() || null,
    },
  };
}
