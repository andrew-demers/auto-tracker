"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveUploadedFile } from "@/lib/storage";
import type { AttachmentOwnerType } from "@/generated/prisma/client";

export async function uploadAttachment(
  ownerType: AttachmentOwnerType,
  ownerId: string,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided." };
  }

  let vehicleId: string | null = null;
  if (ownerType === "FUEL_UP") {
    const fuelUp = await prisma.fuelUp.findUnique({
      where: { id: ownerId },
      select: { vehicleId: true },
    });
    if (!fuelUp) return { error: "Fuel-up not found." };
    vehicleId = fuelUp.vehicleId;
  } else {
    const expense = await prisma.expense.findUnique({
      where: { id: ownerId },
      select: { vehicleId: true },
    });
    if (!expense) return { error: "Expense not found." };
    vehicleId = expense.vehicleId;
  }

  let saved;
  try {
    saved = await saveUploadedFile(file, ownerType, ownerId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  const attachment = await prisma.attachment.create({
    data: {
      ownerType,
      fuelUpId: ownerType === "FUEL_UP" ? ownerId : null,
      expenseId: ownerType === "EXPENSE" ? ownerId : null,
      filename: file.name || "upload",
      storedPath: saved.storedPath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: saved.sizeBytes,
    },
  });

  revalidatePath(`/vehicles/${vehicleId}`);
  return { id: attachment.id };
}

export async function deleteAttachment(id: string): Promise<{ error?: string }> {
  await requireUser();

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return { error: "Attachment not found." };
  }

  let vehicleId: string | null = null;
  if (attachment.fuelUpId) {
    const fuelUp = await prisma.fuelUp.findUnique({
      where: { id: attachment.fuelUpId },
      select: { vehicleId: true },
    });
    vehicleId = fuelUp?.vehicleId ?? null;
  } else if (attachment.expenseId) {
    const expense = await prisma.expense.findUnique({
      where: { id: attachment.expenseId },
      select: { vehicleId: true },
    });
    vehicleId = expense?.vehicleId ?? null;
  }

  await prisma.attachment.delete({ where: { id } });
  await deleteStoredFile(attachment.storedPath);

  if (vehicleId) revalidatePath(`/vehicles/${vehicleId}`);
  return {};
}
