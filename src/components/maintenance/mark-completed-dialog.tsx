"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
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
import { markCompleted } from "@/actions/maintenance";
import {
  markCompletedFormSchema,
  type MarkCompletedFormParsed,
  type MarkCompletedFormValues,
} from "@/lib/validations/maintenance";

export function MarkCompletedDialog({
  itemId,
  itemTitle,
  currentOdometer,
}: {
  itemId: string;
  itemTitle: string;
  currentOdometer: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: MarkCompletedFormValues = {
    date: format(new Date(), "yyyy-MM-dd"),
    odometer: currentOdometer > 0 ? String(currentOdometer) : "",
    cost: "",
  };

  // TContext matches react-hook-form's own default type for this generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<MarkCompletedFormValues, any, MarkCompletedFormParsed>({
    resolver: zodResolver(markCompletedFormSchema),
    defaultValues,
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(defaultValues);
      setServerError(null);
    }
  }

  function onSubmit(values: MarkCompletedFormParsed) {
    setServerError(null);
    startTransition(async () => {
      const result = await markCompleted(itemId, values);
      if (result?.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Marked as completed.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CheckCircle2 className="size-4" />
        Mark completed
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark &quot;{itemTitle}&quot; completed</DialogTitle>
          <DialogDescription>
            Updates the last-done date/odometer and resets the due status. Add a
            cost to also log it as a maintenance expense.
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
                    <FormLabel>Date completed</FormLabel>
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
                    <FormLabel>Odometer</FormLabel>
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
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Leave blank to skip logging an expense"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError ? (
              <p className="text-sm text-destructive">{serverError}</p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Mark completed"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
