import { z } from "zod";
import {
  optionalDateField,
  optionalNumberField,
  optionalTextField,
  requiredNumberField,
  dateField,
} from "./shared";

const intervalRefinement = <
  T extends { intervalMiles?: number; intervalMonths?: number },
>(
  data: T,
  ctx: z.RefinementCtx
) => {
  if (data.intervalMiles === undefined && data.intervalMonths === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter an interval in miles or months (at least one is required)",
      path: ["intervalMiles"],
    });
  }
};

export const maintenanceFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    intervalMiles: optionalNumberField({
      min: 1,
      integer: true,
      message: "Enter a whole number of miles",
    }),
    intervalMonths: optionalNumberField({
      min: 1,
      integer: true,
      message: "Enter a whole number of months",
    }),
    lastDoneDate: optionalDateField(),
    lastDoneOdometer: optionalNumberField({
      min: 0,
      message: "Enter a valid odometer reading",
    }),
    notes: optionalTextField(2000),
    notifyEnabled: z.boolean(),
  })
  .superRefine(intervalRefinement);

export type MaintenanceFormValues = z.input<typeof maintenanceFormSchema>;
export type MaintenanceFormParsed = z.output<typeof maintenanceFormSchema>;

export const maintenanceDataSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    intervalMiles: z.number().int().positive().optional(),
    intervalMonths: z.number().int().positive().optional(),
    lastDoneDate: z.date().optional(),
    lastDoneOdometer: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
    notifyEnabled: z.boolean(),
  })
  .superRefine(intervalRefinement);

export type MaintenanceData = z.output<typeof maintenanceDataSchema>;

export const markCompletedFormSchema = z.object({
  date: dateField(),
  odometer: requiredNumberField({
    min: 0,
    message: "Enter a valid odometer reading",
  }),
  cost: optionalNumberField({ min: 0, message: "Enter a valid cost" }),
});

export type MarkCompletedFormValues = z.input<typeof markCompletedFormSchema>;
export type MarkCompletedFormParsed = z.output<typeof markCompletedFormSchema>;

export const markCompletedDataSchema = z.object({
  date: z.date(),
  odometer: z.number().min(0),
  cost: z.number().min(0).optional(),
});

export type MarkCompletedData = z.output<typeof markCompletedDataSchema>;
