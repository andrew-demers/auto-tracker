"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createVehicle, updateVehicle } from "@/actions/vehicles";
import {
  fuelTypeOptions,
  vehicleFormSchema,
  type VehicleFormParsed,
  type VehicleFormValues,
} from "@/lib/validations/vehicle";

interface VehicleFormProps {
  vehicleId?: string;
  defaultValues?: Partial<VehicleFormValues>;
}

export function VehicleForm({ vehicleId, defaultValues }: VehicleFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(vehicleId);

  // TContext matches react-hook-form's own default type for this generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<VehicleFormValues, any, VehicleFormParsed>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: "",
      make: "",
      model: "",
      year: "",
      fuelType: "GASOLINE",
      tankCapacity: "",
      photoUrl: "",
      notes: "",
      ...defaultValues,
    },
  });

  function onSubmit(values: VehicleFormParsed) {
    setServerError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateVehicle(vehicleId!, values)
        : await createVehicle(values);

      if (result?.error) {
        setServerError(result.error);
        toast.error(result.error);
      }
      // On success the server action redirects, so no further handling needed.
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6"
        noValidate
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Family SUV" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Toyota" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. RAV4" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 2021"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fuelType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a fuel type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fuelTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tankCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tank capacity (gallons)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="e.g. 14.5"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="photoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Photo URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Anything worth remembering about this vehicle"
                    rows={4}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {serverError ? (
          <p className="text-sm text-destructive">{serverError}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Create vehicle"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
