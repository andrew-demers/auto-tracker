"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";

  try {
    // redirect: false so we can pick the destination ourselves below (the
    // user's last-active vehicle, if any) instead of always landing on "/".
    // signIn still sets the session cookie the same way when it succeeds.
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  // Look up the just-authenticated user by email (same normalization the
  // credentials `authorize()` callback uses) rather than via `auth()` -
  // the session cookie signIn() just set isn't reliably readable back via
  // auth() within this same server action invocation.
  let target = "/";
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { lastActiveVehicleId: true },
    });
    if (user?.lastActiveVehicleId) {
      target = `/vehicles/${user.lastActiveVehicleId}`;
    }
  }

  redirect(target);
}
