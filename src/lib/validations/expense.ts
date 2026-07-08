import { z } from "zod";
import {
  dateField,
  optionalNumberField,
  optionalTextField,
  requiredNumberField,
} from "./shared";

export const expenseCategoryValues = [
  "MAINTENANCE",
  "REPAIR",
  "MOD",
  "INSURANCE",
  "REGISTRATION",
  "PARKING_TOLLS",
  "ACCESSORIES",
  "DETAILING",
  "TIRES",
  "OTHER",
] as const;

// Display order/labels for the user-facing category list - alphabetical by label.
export const expenseCategoryOptions = [
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "DETAILING", label: "Detailing" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MOD", label: "Mod" },
  { value: "OTHER", label: "Other" },
  { value: "PARKING_TOLLS", label: "Parking & Tolls" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "REPAIR", label: "Repair" },
  { value: "TIRES", label: "Tires" },
] satisfies { value: (typeof expenseCategoryValues)[number]; label: string }[];

export const expenseFormSchema = z.object({
  date: dateField(),
  category: z.enum(expenseCategoryValues),
  type: optionalTextField(200),
  odometer: optionalNumberField({
    min: 0,
    message: "Enter a valid odometer reading",
  }),
  cost: requiredNumberField({ min: 0, message: "Enter a valid cost" }),
  vendor: optionalTextField(200),
  notes: optionalTextField(2000),
});

export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
export type ExpenseFormParsed = z.output<typeof expenseFormSchema>;
export type ExpenseCategoryValue = (typeof expenseCategoryValues)[number];

export const expenseDataSchema = z.object({
  date: z.date(),
  category: z.enum(expenseCategoryValues),
  type: z.string().max(200).optional(),
  odometer: z.number().min(0).optional(),
  cost: z.number().min(0),
  vendor: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type ExpenseData = z.output<typeof expenseDataSchema>;
