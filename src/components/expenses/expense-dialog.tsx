"use client";

import { useState, useTransition } from "react";
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
import { AttachmentFileInput } from "@/components/attachments/attachment-file-input";
import { createExpense, updateExpense } from "@/actions/expenses";
import { uploadAttachment } from "@/actions/attachments";
import {
  expenseCategoryOptions,
  expenseFormSchema,
  type ExpenseCategoryValue,
  type ExpenseFormParsed,
  type ExpenseFormValues,
} from "@/lib/validations/expense";
import {
  CUSTOM_MAINTENANCE_TITLE,
  isMaintenancePreset,
  maintenancePresets,
} from "@/lib/validations/maintenance";

export interface ExpenseDialogDefaults {
  id: string;
  date: string;
  category: ExpenseCategoryValue;
  type: string;
  odometer: string;
  cost: string;
  vendor: string;
  notes: string;
}

interface ExpenseDialogProps {
  vehicleId: string;
  expense?: ExpenseDialogDefaults;
}

// Reuses the maintenance procedure preset list so a MAINTENANCE expense's
// "type" (e.g. "Oil Change") lines up with the same names used on the
// maintenance tab.
const typeSelectItems = [
  ...maintenancePresets.map((preset) => ({ value: preset, label: preset })),
  { value: CUSTOM_MAINTENANCE_TITLE, label: "Custom..." },
];

/** "Custom..." unless the type is a recognized preset. */
function initialTypeSelection(type: string | undefined): string {
  if (type && isMaintenancePreset(type)) return type;
  return CUSTOM_MAINTENANCE_TITLE;
}

export function ExpenseDialog({ vehicleId, expense }: ExpenseDialogProps) {
  const isEditing = Boolean(expense);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [typeSelection, setTypeSelection] = useState(() =>
    initialTypeSelection(expense?.type)
  );

  const defaultValues: ExpenseFormValues = {
    date: expense?.date ?? format(new Date(), "yyyy-MM-dd"),
    category: expense?.category ?? "MAINTENANCE",
    type: expense?.type ?? "",
    odometer: expense?.odometer ?? "",
    cost: expense?.cost ?? "",
    vendor: expense?.vendor ?? "",
    notes: expense?.notes ?? "",
  };

  // TContext matches react-hook-form's own default type for this generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ExpenseFormValues, any, ExpenseFormParsed>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });
  const category = form.watch("category");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(defaultValues);
      setTypeSelection(initialTypeSelection(expense?.type));
      setServerError(null);
      setFile(null);
    }
  }

  function onSubmit(values: ExpenseFormParsed) {
    setServerError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateExpense(expense!.id, values)
        : await createExpense(vehicleId, values);

      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }

      if (file && result.id) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResult = await uploadAttachment("EXPENSE", result.id, formData);
        if (uploadResult.error) {
          toast.error(
            `Expense saved, but the attachment failed to upload: ${uploadResult.error}`
          );
        }
      }

      toast.success(isEditing ? "Expense updated." : "Expense added.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="ghost" size="icon-sm" aria-label="Edit expense" />
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
            Add expense
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Log insurance, repairs, registration, and other vehicle costs.
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      items={expenseCategoryOptions}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "MAINTENANCE") {
                          setTypeSelection(CUSTOM_MAINTENANCE_TITLE);
                          form.setValue("type", "");
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategoryOptions.map((option) => (
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
              {category === "MAINTENANCE" ? (
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        items={typeSelectItems}
                        value={typeSelection}
                        onValueChange={(rawValue) => {
                          const value = rawValue ?? CUSTOM_MAINTENANCE_TITLE;
                          setTypeSelection(value);
                          if (value === CUSTOM_MAINTENANCE_TITLE) {
                            field.onChange(isMaintenancePreset(field.value ?? "") ? "" : field.value);
                          } else {
                            field.onChange(value);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a type" />
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
                      {typeSelection === CUSTOM_MAINTENANCE_TITLE ? (
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
              ) : null}
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" {...field} />
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
                    <FormLabel>Odometer (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Vendor (optional)</FormLabel>
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
                    : "Add expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
