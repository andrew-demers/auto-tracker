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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getVehicle } from "@/actions/vehicles";
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
  /** Fixed vehicle context (vehicle detail page). Omit and pass `vehicles`
   * instead for the global quick-action variant, which lets the user pick
   * any vehicle from a select field. */
  vehicleId?: string;
  /** Highest known odometer reading excluding this record - used for the
   * soft warning. Ignored (and recomputed automatically as the vehicle
   * selection changes) when `vehicles` is provided. */
  comparisonOdometer?: number;
  fuelUp?: FuelUpDialogDefaults;
  /** When provided, renders a vehicle-select field and allows logging a
   * fuel-up for any of these vehicles - used by the global quick action. */
  vehicles?: { id: string; name: string }[];
  /** Vehicle pre-selected when the picker is shown (e.g. the user's
   * last-active vehicle). Falls back to the first vehicle in the list. */
  defaultVehicleId?: string;
  /** Custom trigger element, e.g. a header quick-action button. */
  trigger?: React.ReactElement;
}

export function FuelUpDialog({
  vehicleId,
  comparisonOdometer,
  fuelUp,
  vehicles,
  defaultVehicleId,
  trigger,
}: FuelUpDialogProps) {
  const isEditing = Boolean(fuelUp);
  const showVehiclePicker = !isEditing && vehicles != null;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // Start "touched" when editing so we don't clobber a previously
  // manually-overridden total cost just by opening the dialog.
  const [totalCostTouched, setTotalCostTouched] = useState(isEditing);
  const [file, setFile] = useState<File | null>(null);

  function initialVehicleId() {
    return vehicleId ?? defaultVehicleId ?? vehicles?.[0]?.id ?? "";
  }

  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicleId);
  const [pickerComparisonOdometer, setPickerComparisonOdometer] = useState(0);
  const effectiveVehicleId = vehicleId ?? selectedVehicleId;
  const effectiveComparisonOdometer = showVehiclePicker
    ? pickerComparisonOdometer
    : (comparisonOdometer ?? 0);

  // In vehicle-picker mode, the soft odometer warning needs the selected
  // vehicle's current odometer - fetch it whenever the selection (or dialog
  // open state) changes, since the parent doesn't have per-vehicle data
  // loaded outside of the vehicle detail page.
  useEffect(() => {
    if (!showVehiclePicker || !open || !selectedVehicleId) return;
    let cancelled = false;
    getVehicle(selectedVehicleId).then((vehicle) => {
      if (!cancelled) setPickerComparisonOdometer(vehicle?.currentOdometer ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [showVehiclePicker, open, selectedVehicleId]);

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
    odometerNum <= effectiveComparisonOdometer;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(defaultValues);
      setServerError(null);
      setTotalCostTouched(isEditing);
      setFile(null);
      setSelectedVehicleId(initialVehicleId());
    }
  }

  function onSubmit(values: FuelUpFormParsed) {
    setServerError(null);
    if (!isEditing && !effectiveVehicleId) {
      setServerError("Select a vehicle.");
      return;
    }
    startTransition(async () => {
      const result = isEditing
        ? await updateFuelUp(fuelUp!.id, values)
        : await createFuelUp(effectiveVehicleId, values);

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
      {trigger ? (
        // No children here (unlike the branch below) - `trigger` is a
        // complete element that already carries its own visible content.
        <DialogTrigger render={trigger} />
      ) : (
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
      )}
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
            {showVehiclePicker ? (
              <FormItem>
                <FormLabel>Vehicle</FormLabel>
                <Select
                  items={vehicles!.map((vehicle) => ({ value: vehicle.id, label: vehicle.name }))}
                  value={selectedVehicleId}
                  onValueChange={(value) => setSelectedVehicleId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles!.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            ) : null}
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
                        {effectiveComparisonOdometer.toLocaleString()} mi).
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
