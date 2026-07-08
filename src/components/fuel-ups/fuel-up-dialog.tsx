"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { AttachmentFileInput } from "@/components/attachments/attachment-file-input";
import { createFuelUp, updateFuelUp } from "@/actions/fuel-ups";
import { uploadAttachment } from "@/actions/attachments";
import {
  fuelUpFormSchema,
  type FuelUpFormParsed,
  type FuelUpFormValues,
} from "@/lib/validations/fuel-up";

export interface FuelUpDialogDefaults {
  id: string;
  date: string;
  odometer: string;
  gallons: string;
  pricePerGallon: string;
  totalCost: string;
  isFullTank: boolean;
  station: string;
  notes: string;
}

interface FuelUpDialogProps {
  vehicleId: string;
  /** Highest known odometer reading excluding this record - used for the soft warning. */
  comparisonOdometer: number;
  fuelUp?: FuelUpDialogDefaults;
}

export function FuelUpDialog({
  vehicleId,
  comparisonOdometer,
  fuelUp,
}: FuelUpDialogProps) {
  const isEditing = Boolean(fuelUp);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // Start "touched" when editing so we don't clobber a previously
  // manually-overridden total cost just by opening the dialog.
  const [totalCostTouched, setTotalCostTouched] = useState(isEditing);
  const [file, setFile] = useState<File | null>(null);

  const defaultValues: FuelUpFormValues = {
    date: fuelUp?.date ?? format(new Date(), "yyyy-MM-dd"),
    odometer: fuelUp?.odometer ?? "",
    gallons: fuelUp?.gallons ?? "",
    pricePerGallon: fuelUp?.pricePerGallon ?? "",
    totalCost: fuelUp?.totalCost ?? "",
    isFullTank: fuelUp?.isFullTank ?? true,
    station: fuelUp?.station ?? "",
    notes: fuelUp?.notes ?? "",
  };

  // TContext matches react-hook-form's own default type for this generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FuelUpFormValues, any, FuelUpFormParsed>({
    resolver: zodResolver(fuelUpFormSchema),
    defaultValues,
  });

  const gallons = form.watch("gallons");
  const pricePerGallon = form.watch("pricePerGallon");
  const odometer = form.watch("odometer");

  useEffect(() => {
    if (totalCostTouched) return;
    const g = Number(gallons);
    const p = Number(pricePerGallon);
    if (gallons && pricePerGallon && !Number.isNaN(g) && !Number.isNaN(p)) {
      form.setValue("totalCost", (g * p).toFixed(2));
    }
  }, [gallons, pricePerGallon, totalCostTouched, form]);

  const odometerNum = Number(odometer);
  const showOdometerWarning =
    odometer !== "" &&
    !Number.isNaN(odometerNum) &&
    odometerNum <= comparisonOdometer;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(defaultValues);
      setServerError(null);
      setTotalCostTouched(isEditing);
      setFile(null);
    }
  }

  function onSubmit(values: FuelUpFormParsed) {
    setServerError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateFuelUp(fuelUp!.id, values)
        : await createFuelUp(vehicleId, values);

      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }

      if (file && result.id) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResult = await uploadAttachment("FUEL_UP", result.id, formData);
        if (uploadResult.error) {
          toast.error(
            `Fuel-up saved, but the attachment failed to upload: ${uploadResult.error}`
          );
        }
      }

      toast.success(isEditing ? "Fuel-up updated." : "Fuel-up added.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="ghost" size="icon-sm" aria-label="Edit fuel-up" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {isEditing ? (
          <Pencil className="size-4" />
        ) : (
          <>
            <Plus className="size-4" />
            Add fuel-up
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit fuel-up" : "Add fuel-up"}</DialogTitle>
          <DialogDescription>
            Log an odometer reading and how much fuel went in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="odometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odometer (mi)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        {...field}
                      />
                    </FormControl>
                    {showOdometerWarning ? (
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        At or below the vehicle&apos;s current known odometer (
                        {comparisonOdometer.toLocaleString()} mi).
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gallons"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gallons</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerGallon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price/gallon</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        {...field}
                        onChange={(event) => {
                          setTotalCostTouched(true);
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Auto-calculated from gallons x price - edit to override.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="station"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isFullTank"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                    Full tank
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AttachmentFileInput file={file} onChange={setFile} />

            {serverError ? (
              <p className="text-sm text-destructive">{serverError}</p>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : isEditing
                    ? "Save changes"
                    : "Add fuel-up"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
