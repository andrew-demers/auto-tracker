"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";
import { touchLastActiveVehicle } from "@/lib/last-active-vehicle";
import {
  expenseDataSchema,
  type ExpenseData,
  type ExpenseFormParsed,
} from "@/lib/validations/expense";

function toExpenseData(parsed: ExpenseData) {
  return {
    date: parsed.date,
    category: parsed.category,
    type: parsed.type ?? null,
    odometer: parsed.odometer ?? null,
    cost: parsed.cost,
    vendor: parsed.vendor ?? null,
    notes: parsed.notes ?? null,
  };
}

export async function getExpenses(vehicleId: string) {
  await requireUser();
  return prisma.expense.findMany({
    where: { vehicleId },
    orderBy: { date: "desc" },
    include: { attachments: true },
  });
}

export async function createExpense(
  vehicleId: string,
  values: ExpenseFormParsed
): Promise<{ error?: string; id?: string }> {
  const user = await requireUser();

  const parseResult = expenseDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return { error: "Vehicle not found." };
  }

  const expense = await prisma.expense.create({
    data: { vehicleId, ...toExpenseData(parseResult.data) },
  });
  await touchLastActiveVehicle(user.id, vehicleId);

  revalidatePath(`/vehicles/${vehicleId}`);
  return { id: expense.id };
}

export async function updateExpense(
  id: string,
  values: ExpenseFormParsed
): Promise<{ error?: string; id?: string }> {
  const user = await requireUser();

  const parseResult = expenseDataSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Expense not found." };
  }

  await prisma.expense.update({
    where: { id },
    data: toExpenseData(parseResult.data),
  });
  await touchLastActiveVehicle(user.id, existing.vehicleId);

  revalidatePath(`/vehicles/${existing.vehicleId}`);
  return { id };
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  await requireUser();

  const existing = await prisma.expense.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!existing) {
    return { error: "Expense not found." };
  }

  await prisma.expense.delete({ where: { id } });
  await Promise.all(
    existing.attachments.map((attachment) => deleteStoredFile(attachment.storedPath))
  );

  revalidatePath(`/vehicles/${existing.vehicleId}`);
  return {};
}
