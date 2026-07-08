import { z } from "zod";

export const userRoleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "User" },
] as const;

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  name: z.string().trim().max(100).optional(),
  role: z.enum(["ADMIN", "USER"]),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
});

export type CreateUserValues = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().max(100).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "USER"]),
  notifyEnabled: z.boolean(),
});

export type UpdateUserValues = z.input<typeof updateUserSchema>;

export const profileSchema = z.object({
  name: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export type ProfileValues = z.input<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.input<typeof changePasswordSchema>;
