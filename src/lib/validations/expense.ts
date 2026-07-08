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
  "INSURANCE",
  "REGISTRATION",
  "PARKING_TOLLS",
  "ACCESSORIES",
  "OTHER",
] as const;

export const expenseCategoryOptions = [
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "REPAIR", label: "Repair" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "PARKING_TOLLS", label: "Parking & Tolls" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
] satisfies { value: (typeof expenseCategoryValues)[number]; label: string }[];

export const expenseFormSchema = z.object({
  date: dateField(),
  category: z.enum(expenseCategoryValues),
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
  odometer: z.number().min(0).optional(),
  cost: z.number().min(0),
  vendor: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type ExpenseData = z.output<typeof expenseDataSchema>;
