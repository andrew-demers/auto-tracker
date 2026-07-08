import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "@/auth.config";
import type { UserRole } from "@/generated/prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Overrides the edge-safe jwt callback: that one only sets id/role at
    // sign-in. Since sessions are JWT-based, name/email otherwise stay
    // frozen at whatever they were at login - this refreshes them from the
    // DB on every subsequent request so profile edits show up without
    // forcing a re-login. Needs Prisma, so it can't live in auth.config.ts
    // (shared with the edge proxy).
    async jwt({ token, user }) {
      if (user) {
        const authedUser = user as unknown as { id: string; role: UserRole };
        token.id = authedUser.id;
        token.role = authedUser.role;
        return token;
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, email: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
        }
      }
      return token;
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
