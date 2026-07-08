"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/lib/validations/user";

export async function updateProfile(
  values: ProfileValues
): Promise<{ error?: string }> {
  const user = await requireUser();

  const parseResult = profileSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }
  const parsed = parseResult.data;

  const existing = await prisma.user.findUnique({
    where: { email: parsed.email },
  });
  if (existing && existing.id !== user.id) {
    return { error: "A user with that email already exists." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.name && parsed.name.length > 0 ? parsed.name : null,
      email: parsed.email,
    },
  });

  revalidatePath("/settings/profile");
  return {};
}

export async function changePassword(
  values: ChangePasswordValues
): Promise<{ error?: string }> {
  const user = await requireUser();

  const parseResult = changePasswordSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }
  const parsed = parseResult.data;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return { error: "User not found." };
  }

  const isValid = await verifyPassword(
    parsed.currentPassword,
    dbUser.passwordHash
  );
  if (!isValid) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return {};
}
