import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/google-oauth";

// Admin-only: kicks off the Google OAuth consent flow for connecting Drive
// backup. Sits under proxy.ts route protection like the rest of the app,
// but also independently verifies admin status here.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }
  if (!isGoogleOAuthConfigured()) {
    return new Response(
      "Google OAuth is not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      { status: 500 }
    );
  }

  return NextResponse.redirect(buildGoogleAuthUrl());
}
