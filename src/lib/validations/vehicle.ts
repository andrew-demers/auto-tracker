import { z } from "zod";
import { optionalNumberField, optionalTextField } from "./shared";

export const fuelTypeOptions = [
  { value: "GASOLINE", label: "Gasoline" },
  { value: "DIESEL", label: "Diesel" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ELECTRIC", label: "Electric" },
  { value: "OTHER", label: "Other" },
] as const;

export const vehicleFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  make: optionalTextField(100),
  model: optionalTextField(100),
  year: optionalNumberField({
    min: 1900,
    max: 2100,
    integer: true,
    message: "Enter a valid year",
  }),
  fuelType: z.enum(["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC", "OTHER"]),
  tankCapacity: optionalNumberField({
    min: 0.1,
    message: "Must be a positive number",
  }),
  photoUrl: optionalTextField(500),
  notes: optionalTextField(2000),
});

export type VehicleFormValues = z.input<typeof vehicleFormSchema>;
export type VehicleFormParsed = z.output<typeof vehicleFormSchema>;

/**
 * Server-side re-validation schema: validates the *already parsed* shape
 * (numbers, not raw strings) that the client sends after running
 * `vehicleFormSchema` itself. Structurally matches `VehicleFormParsed`.
 */
export const vehicleDataSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  fuelType: z.enum(["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC", "OTHER"]),
  tankCapacity: z.number().positive().optional(),
  photoUrl: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export type VehicleData = z.output<typeof vehicleDataSchema>;
