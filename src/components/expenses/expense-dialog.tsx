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

export interface ExpenseDialogDefaults {
  id: string;
  date: string;
  category: ExpenseCategoryValue;
  odometer: string;
  cost: string;
  vendor: string;
  notes: string;
}

interface ExpenseDialogProps {
  vehicleId: string;
  expense?: ExpenseDialogDefaults;
}

export function ExpenseDialog({ vehicleId, expense }: ExpenseDialogProps) {
  const isEditing = Boolean(expense);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const defaultValues: ExpenseFormValues = {
    date: expense?.date ?? format(new Date(), "yyyy-MM-dd"),
    category: expense?.category ?? "MAINTENANCE",
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(defaultValues);
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
