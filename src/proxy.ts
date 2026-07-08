import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe proxy (formerly "middleware" - renamed in Next.js 16): only uses
// the `authorized` callback from auth.config.ts (no Prisma/bcrypt), which
// redirects unauthenticated requests to /login and keeps authenticated
// users off /login.
export default NextAuth(authConfig).auth;

// Runs on every route except the NextAuth API routes, the health endpoint,
// static assets, image files, and the generated app icons (icon/apple-icon
// are fetched by browsers/iOS without auth context, e.g. from the login
// screen - they must stay reachable unauthenticated). /login is
// intentionally included so the `authorized` callback in auth.config.ts can
// both allow unauthenticated access to it and bounce already-authenticated
// users away from it.
export const config = {
  matcher: [
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|apple-icon|icon|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)",
  ],
};
