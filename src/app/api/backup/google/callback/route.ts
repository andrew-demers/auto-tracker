import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { createOAuth2Client } from "@/lib/google-oauth";

function getAppUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const appUrl = getAppUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam || !code) {
    return NextResponse.redirect(
      `${appUrl}/settings/backups?error=${encodeURIComponent(errorParam || "Google did not return an authorization code.")}`
    );
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google didn't return a refresh token. Remove Auto Tracker's access at https://myaccount.google.com/permissions and try connecting again."
      );
    }
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    await prisma.backupIntegration.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        googleAccountEmail: userInfo.data.email ?? null,
        googleRefreshTokenEnc: encrypt(tokens.refresh_token),
        connectedAt: new Date(),
      },
      update: {
        googleAccountEmail: userInfo.data.email ?? null,
        googleRefreshTokenEnc: encrypt(tokens.refresh_token),
        // A new account might not have the old folder - re-resolve it lazily.
        driveFolderId: null,
        connectedAt: new Date(),
      },
    });

    return NextResponse.redirect(`${appUrl}/settings/backups`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect Google Drive.";
    return NextResponse.redirect(`${appUrl}/settings/backups?error=${encodeURIComponent(message)}`);
  }
}
