import { z } from "zod";

/**
 * A form field that arrives as a string from a native input (possibly
 * empty), and should be parsed into an optional number. Using
 * `.transform()` on a concrete `z.string()` base (rather than
 * `z.preprocess`) keeps the *input* type as `string | undefined` so
 * react-hook-form/Input components stay correctly typed, while the
 * *output* type becomes `number | undefined` for the server action.
 */
export function optionalNumberField(options: {
  min?: number;
  max?: number;
  integer?: boolean;
  message?: string;
} = {}) {
  return z
    .string()
    .optional()
    .transform((val, ctx) => {
      if (val === undefined || val.trim() === "") return undefined;

      const num = Number(val);
      if (Number.isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? "Must be a number",
        });
        return z.NEVER;
      }
      if (options.integer && !Number.isInteger(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? "Must be a whole number",
        });
        return z.NEVER;
      }
      if (options.min !== undefined && num < options.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? `Must be at least ${options.min}`,
        });
        return z.NEVER;
      }
      if (options.max !== undefined && num > options.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? `Must be at most ${options.max}`,
        });
        return z.NEVER;
      }
      return num;
    });
}

/** Trims a string form field and converts "" to undefined. */
export function optionalTextField(max: number) {
  return z
    .string()
    .optional()
    .transform((val) => {
      const trimmed = val?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : undefined;
    })
    .refine((val) => val === undefined || val.length <= max, {
      message: `Must be ${max} characters or fewer`,
    });
}

/**
 * A required numeric form field - same idea as `optionalNumberField`, but
 * rejects an empty value instead of transforming it to `undefined`.
 */
export function requiredNumberField(options: {
  min?: number;
  max?: number;
  integer?: boolean;
  message?: string;
} = {}) {
  return z
    .string()
    .trim()
    .min(1, "This field is required")
    .transform((val, ctx) => {
      const num = Number(val);
      if (Number.isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? "Must be a number",
        });
        return z.NEVER;
      }
      if (options.integer && !Number.isInteger(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? "Must be a whole number",
        });
        return z.NEVER;
      }
      if (options.min !== undefined && num < options.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? `Must be at least ${options.min}`,
        });
        return z.NEVER;
      }
      if (options.max !== undefined && num > options.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: options.message ?? `Must be at most ${options.max}`,
        });
        return z.NEVER;
      }
      return num;
    });
}

/**
 * A required date form field arriving as a `YYYY-MM-DD` string from a native
 * `<input type="date">`, transformed into a `Date` at local midnight.
 */
export function dateField(message = "Enter a valid date") {
  return z
    .string()
    .trim()
    .min(1, "Date is required")
    .transform((val, ctx) => {
      const date = new Date(`${val}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
      return date;
    });
}

/** Same as `dateField`, but an empty value transforms to `undefined`. */
export function optionalDateField(message = "Enter a valid date") {
  return z
    .string()
    .optional()
    .transform((val, ctx) => {
      const trimmed = val?.trim();
      if (!trimmed) return undefined;
      const date = new Date(`${trimmed}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
      return date;
    });
}
