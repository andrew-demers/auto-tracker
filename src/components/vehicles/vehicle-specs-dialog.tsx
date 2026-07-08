"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { updateVehicleSpecs } from "@/actions/vehicles";
import {
  vehicleSpecsFormSchema,
  type VehicleSpecsFormParsed,
  type VehicleSpecsFormValues,
} from "@/lib/validations/vehicle-specs";

interface VehicleSpecsDialogProps {
  vehicleId: string;
  defaultValues: VehicleSpecsFormValues;
  /** Shows a compact "Add specs" CTA button instead of the small edit-pencil icon. */
  hasAnySpecs: boolean;
}

const fieldGroups: {
  title: string;
  fields: {
    name: keyof VehicleSpecsFormValues;
    label: string;
    placeholder?: string;
    type?: "text" | "number";
  }[];
}[] = [
  {
    title: "Identification",
    fields: [
      { name: "vin", label: "VIN", placeholder: "e.g. 1HGCM82633A004352" },
      { name: "licensePlate", label: "License plate", placeholder: "e.g. ABC-1234" },
    ],
  },
  {
    title: "Engine",
    fields: [
      { name: "oilType", label: "Oil type", placeholder: "e.g. 0W-20 Full Synthetic" },
      {
        name: "oilCapacityQuarts",
        label: "Oil capacity (qt)",
        placeholder: "e.g. 5",
        type: "number",
      },
      {
        name: "oilFilterPartNumber",
        label: "Oil filter part #",
        placeholder: "e.g. 90915-YZZD4",
      },
    ],
  },
  {
    title: "Drivetrain",
    fields: [
      {
        name: "transmissionFluidType",
        label: "Transmission fluid type",
        placeholder: "e.g. Toyota WS ATF",
      },
      {
        name: "transmissionFluidCapacityQuarts",
        label: "Transmission fluid capacity (qt)",
        placeholder: "e.g. 3.5",
        type: "number",
      },
    ],
  },
  {
    title: "Tires",
    fields: [
      { name: "tireSize", label: "Tire size", placeholder: "e.g. 225/45R17" },
      {
        name: "tireSizeRear",
        label: "Tire size (rear, if staggered)",
        placeholder: "e.g. 255/40R18",
      },
      {
        name: "tirePressureFrontPsi",
        label: "Tire pressure - front (psi)",
        placeholder: "e.g. 32",
        type: "number",
      },
      {
        name: "tirePressureRearPsi",
        label: "Tire pressure - rear (psi)",
        placeholder: "e.g. 32",
        type: "number",
      },
    ],
  },
  {
    title: "Other fluids",
    fields: [
      { name: "brakeFluidType", label: "Brake fluid type", placeholder: "e.g. DOT 4" },
      { name: "coolantType", label: "Coolant type", placeholder: "e.g. Toyota Red (Long Life)" },
    ],
  },
  {
    title: "Electrical",
    fields: [
      { name: "batteryType", label: "Battery type", placeholder: "e.g. Group 35 AGM" },
      { name: "sparkPlugType", label: "Spark plug type", placeholder: "e.g. NGK ILZKAR7B11" },
    ],
  },
  {
    title: "Wipers",
    fields: [
      { name: "wiperBladeSizeFront", label: "Wiper blade size - front", placeholder: "e.g. 26in / 16in" },
      { name: "wiperBladeSizeRear", label: "Wiper blade size - rear", placeholder: "e.g. 12in" },
    ],
  },
];

export function VehicleSpecsDialog({
  vehicleId,
  defaultValues,
  hasAnySpecs,
}: VehicleSpecsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // TContext matches react-hook-form's own default type for this generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<VehicleSpecsFormValues, any, VehicleSpecsFormParsed>({
    resolver: zodResolver(vehicleSpecsFormSchema),
    defaultValues,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(defaultValues);
      setServerError(null);
    }
  }

  function onSubmit(values: VehicleSpecsFormParsed) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateVehicleSpecs(vehicleId, values);

      if (result?.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Vehicle specs saved.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          hasAnySpecs ? (
            <Button variant="outline" size="sm" aria-label="Edit specs" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {hasAnySpecs ? (
          <>
            <Pencil className="size-4" />
            Edit specs
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Add specs
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vehicle specs</DialogTitle>
          <DialogDescription>
            Reference details for maintenance and repairs. All fields are optional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
            noValidate
          >
            {fieldGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-4">
                <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.title}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.fields.map((fieldDef) => (
                    <FormField
                      key={fieldDef.name}
                      control={form.control}
                      name={fieldDef.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldDef.label}</FormLabel>
                          <FormControl>
                            <Input
                              type={fieldDef.type === "number" ? "number" : "text"}
                              inputMode={fieldDef.type === "number" ? "decimal" : undefined}
                              step={fieldDef.type === "number" ? "0.1" : undefined}
                              placeholder={fieldDef.placeholder}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}

            {serverError ? (
              <p className="text-sm text-destructive">{serverError}</p>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save specs"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
