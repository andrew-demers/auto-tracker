"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from "@/lib/validations/user";

export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      notifyEnabled: true,
      createdAt: true,
    },
  });
}

export async function createUser(values: CreateUserValues): Promise<{
  error?: string;
  temporaryPassword?: string;
  email?: string;
}> {
  await requireAdmin();

  const parseResult = createUserSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }
  const parsed = parseResult.data;

  const existing = await prisma.user.findUnique({
    where: { email: parsed.email },
  });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const password =
    parsed.password && parsed.password.length > 0
      ? parsed.password
      : generateRandomPassword();
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: parsed.email,
      name: parsed.name && parsed.name.length > 0 ? parsed.name : null,
      role: parsed.role,
      passwordHash,
    },
  });

  revalidatePath("/settings/users");
  return { temporaryPassword: password, email: user.email };
}

export async function updateUser(
  id: string,
  values: UpdateUserValues
): Promise<{ error?: string }> {
  await requireAdmin();

  const parseResult = updateUserSchema.safeParse(values);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input" };
  }
  const parsed = parseResult.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "User not found." };
  }

  if (target.role === "ADMIN" && parsed.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "You can't demote the last remaining admin." };
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: parsed.name && parsed.name.length > 0 ? parsed.name : null,
      role: parsed.role,
      notifyEnabled: parsed.notifyEnabled,
    },
  });

  revalidatePath("/settings/users");
  return {};
}

export async function resetUserPassword(
  id: string,
  newPassword?: string
): Promise<{ error?: string; temporaryPassword?: string }> {
  await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "User not found." };
  }

  const trimmed = newPassword?.trim();
  if (trimmed && trimmed.length > 0 && trimmed.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const password =
    trimmed && trimmed.length >= 8 ? trimmed : generateRandomPassword();
  const passwordHash = await hashPassword(password);

  await prisma.user.update({ where: { id }, data: { passwordHash } });

  revalidatePath("/settings/users");
  return { temporaryPassword: password };
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "User not found." };
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        error:
          target.id === admin.id
            ? "You're the last remaining admin - promote another user first."
            : "You can't delete the last remaining admin.",
      };
    }
  }

  await prisma.user.delete({ where: { id } });

  revalidatePath("/settings/users");
  return {};
}
