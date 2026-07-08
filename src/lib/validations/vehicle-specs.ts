import { z } from "zod";
import { optionalNumberField, optionalTextField } from "./shared";

export const vehicleSpecsFormSchema = z.object({
  vin: optionalTextField(50),
  licensePlate: optionalTextField(20),
  oilType: optionalTextField(100),
  oilCapacityQuarts: optionalNumberField({
    min: 0.1,
    message: "Must be a positive number",
  }),
  oilFilterPartNumber: optionalTextField(100),
  tireSize: optionalTextField(50),
  tireSizeRear: optionalTextField(50),
  tirePressureFrontPsi: optionalNumberField({
    min: 1,
    message: "Must be a positive number",
  }),
  tirePressureRearPsi: optionalNumberField({
    min: 1,
    message: "Must be a positive number",
  }),
  transmissionFluidType: optionalTextField(100),
  transmissionFluidCapacityQuarts: optionalNumberField({
    min: 0.1,
    message: "Must be a positive number",
  }),
  brakeFluidType: optionalTextField(100),
  coolantType: optionalTextField(100),
  batteryType: optionalTextField(100),
  sparkPlugType: optionalTextField(100),
  wiperBladeSizeFront: optionalTextField(50),
  wiperBladeSizeRear: optionalTextField(50),
});

export type VehicleSpecsFormValues = z.input<typeof vehicleSpecsFormSchema>;
export type VehicleSpecsFormParsed = z.output<typeof vehicleSpecsFormSchema>;

/**
 * Server-side re-validation schema: validates the *already parsed* shape
 * that the client sends after running `vehicleSpecsFormSchema` itself.
 */
export const vehicleSpecsDataSchema = z.object({
  vin: z.string().max(50).optional(),
  licensePlate: z.string().max(20).optional(),
  oilType: z.string().max(100).optional(),
  oilCapacityQuarts: z.number().positive().optional(),
  oilFilterPartNumber: z.string().max(100).optional(),
  tireSize: z.string().max(50).optional(),
  tireSizeRear: z.string().max(50).optional(),
  tirePressureFrontPsi: z.number().positive().optional(),
  tirePressureRearPsi: z.number().positive().optional(),
  transmissionFluidType: z.string().max(100).optional(),
  transmissionFluidCapacityQuarts: z.number().positive().optional(),
  brakeFluidType: z.string().max(100).optional(),
  coolantType: z.string().max(100).optional(),
  batteryType: z.string().max(100).optional(),
  sparkPlugType: z.string().max(100).optional(),
  wiperBladeSizeFront: z.string().max(50).optional(),
  wiperBladeSizeRear: z.string().max(50).optional(),
});

export type VehicleSpecsData = z.output<typeof vehicleSpecsDataSchema>;
