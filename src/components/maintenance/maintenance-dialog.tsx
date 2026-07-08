"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
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
import { createMaintenanceItem, updateMaintenanceItem } from "@/actions/maintenance";
import {
  CUSTOM_MAINTENANCE_TITLE,
  isMaintenancePreset,
  maintenanceFormSchema,
  maintenancePresets,
  type MaintenanceFormParsed,
  type MaintenanceFormValues,
} from "@/lib/validations/maintenance";

export interface MaintenanceDialogDefaults {
  id: string;
  title: string;
  intervalMiles: string;
  intervalMonths: string;
  lastDoneDate: string;
  lastDoneOdometer: string;
  notes: string;
  notifyEnabled: boolean;
}

interface MaintenanceDialogProps {
  vehicleId: string;
  item?: MaintenanceDialogDefaults;
}

// Passed as Select's `items` prop so the trigger shows the right label (e.g.
// "Custom...") immediately, without requiring the popup to have been opened
// at least once first (Base UI only resolves Select.Value's label from the
// popup's mounted items unless `items` is provided).
const titleSelectItems = [
  ...maintenancePresets.map((preset) => ({ value: preset, label: preset })),
  { value: CUSTOM_MAINTENANCE_TITLE, label: "Custom..." },
];

/** "Custom..." unless the title is a recognized preset. */
function initialTitleSelection(title: string | undefined): string {
  if (title && isMaintenancePreset(title)) return title;
  return CUSTOM_MAINTENANCE_TITLE;
}

export function MaintenanceDialog({ vehicleId, item }: MaintenanceDialogProps) {
  const isEditing = Boolean(item);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [titleSelection, setTitleSelection] = useState(() =>
    initialTitleSelection(item?.title)
  );

  const defaultValues: MaintenanceFormValues = {
    title: item?.title ?? "",
    intervalMiles: item?.intervalMiles ?? "",
    intervalMonths: item?.intervalMonths ?? "",
    lastDoneDate: item?.lastDoneDate ?? "",
    lastDoneOdometer: item?.lastDoneOdometer ?? "",
    notes: item?.notes ?? "",
    notifyEnabled: item?.notifyEnabled ?? true,
  };

  // TContext matches react-hook-form's own default type for this generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<MaintenanceFormValues, any, MaintenanceFormParsed>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(defaultValues);
      setTitleSelection(initialTitleSelection(item?.title));
      setServerError(null);
    }
  }

  function onSubmit(values: MaintenanceFormParsed) {
    setServerError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateMaintenanceItem(item!.id, values)
        : await createMaintenanceItem(vehicleId, values);

      if (result?.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Maintenance item updated." : "Maintenance item added.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="ghost" size="icon-sm" aria-label="Edit maintenance item" />
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
            Add maintenance item
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit maintenance item" : "Add maintenance item"}
          </DialogTitle>
          <DialogDescription>
            Set a mileage and/or time interval - at least one is required.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <Select
                    items={titleSelectItems}
                    value={titleSelection}
                    onValueChange={(rawValue) => {
                      const value = rawValue ?? CUSTOM_MAINTENANCE_TITLE;
                      setTitleSelection(value);
                      if (value === CUSTOM_MAINTENANCE_TITLE) {
                        field.onChange(isMaintenancePreset(field.value) ? "" : field.value);
                      } else {
                        field.onChange(value);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a procedure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {maintenancePresets.map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {preset}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value={CUSTOM_MAINTENANCE_TITLE}>Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  {titleSelection === CUSTOM_MAINTENANCE_TITLE ? (
                    <FormControl>
                      <Input
                        placeholder="e.g. Oil change"
                        className="mt-2"
                        {...field}
                      />
                    </FormControl>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="intervalMiles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval (miles)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g. 5000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="intervalMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval (months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g. 6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastDoneDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last done date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastDoneOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last done odometer (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <FormField
              control={form.control}
              name="notifyEnabled"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                    Email me when this becomes due soon / overdue
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? (
              <p className="text-sm text-destructive">{serverError}</p>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : isEditing
                    ? "Save changes"
                    : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
