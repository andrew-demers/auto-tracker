import { z } from "zod";
import {
  dateField,
  optionalTextField,
  requiredNumberField,
} from "./shared";

export const fuelUpFormSchema = z.object({
  date: dateField(),
  odometer: requiredNumberField({
    min: 0,
    message: "Enter a valid odometer reading",
  }),
  gallons: requiredNumberField({
    min: 0.001,
    message: "Enter a valid amount of gallons",
  }),
  pricePerGallon: requiredNumberField({
    min: 0,
    message: "Enter a valid price per gallon",
  }),
  totalCost: requiredNumberField({
    min: 0,
    message: "Enter a valid total cost",
  }),
  isFullTank: z.boolean(),
  station: optionalTextField(200),
  notes: optionalTextField(2000),
});

export type FuelUpFormValues = z.input<typeof fuelUpFormSchema>;
export type FuelUpFormParsed = z.output<typeof fuelUpFormSchema>;

/**
 * Server-side re-validation schema: validates the *already parsed* shape
 * that the client sends after running `fuelUpFormSchema` itself.
 */
export const fuelUpDataSchema = z.object({
  date: z.date(),
  odometer: z.number().min(0),
  gallons: z.number().positive(),
  pricePerGallon: z.number().min(0),
  totalCost: z.number().min(0),
  isFullTank: z.boolean(),
  station: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type FuelUpData = z.output<typeof fuelUpDataSchema>;
