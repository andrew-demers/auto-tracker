import "server-only";
import { google } from "googleapis";

// Shared Google OAuth2 client construction, used both by the
// connect/callback route handlers and by backup.ts's getDriveClient().
// Scope is drive.file only - the app can only see/manage files it creates
// itself, never the user's whole Drive.

const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
];

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getRedirectUri(): string {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${appUrl}/api/backup/google/callback`;
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

export function buildGoogleAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES,
  });
}
