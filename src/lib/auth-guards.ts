import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "@/generated/prisma/client";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
}

/** Use in server components/pages - redirects to /login if unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

/**
 * Use inside server actions (and anywhere throwing is preferable to
 * redirecting) - throws ForbiddenError if not an admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError("You must be signed in.");
  }
  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required.");
  }
  return session.user as SessionUser;
}
