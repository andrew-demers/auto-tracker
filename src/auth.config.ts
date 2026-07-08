import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/generated/prisma/client";

// Edge-safe auth config (no Prisma/bcrypt here) shared by middleware and the
// full auth.ts. The Credentials provider itself is only added in auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        const authedUser = user as unknown as { id: string; role: UserRole };
        token.id = authedUser.id;
        token.role = authedUser.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const authedToken = token as unknown as { id: string; role: UserRole };
        session.user.id = authedToken.id;
        session.user.role = authedToken.role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
