"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { createOAuth2Client } from "@/lib/google-oauth";
import { runBackup } from "@/lib/backup";

export async function getBackupSettingsData() {
  await requireAdmin();
  const [integration, records] = await Promise.all([
    prisma.backupIntegration.findUnique({ where: { id: "singleton" } }),
    prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return {
    connected: Boolean(integration?.googleRefreshTokenEnc),
    email: integration?.googleAccountEmail ?? null,
    records,
  };
}

export async function disconnectGoogleDrive(): Promise<{ error?: string }> {
  await requireAdmin();

  const integration = await prisma.backupIntegration.findUnique({
    where: { id: "singleton" },
  });
  if (!integration?.googleRefreshTokenEnc) {
    return {};
  }

  try {
    const refreshToken = decrypt(integration.googleRefreshTokenEnc);
    const oauth2Client = createOAuth2Client();
    await oauth2Client.revokeToken(refreshToken);
  } catch (err) {
    // Best-effort - still clear our local record even if Google's revoke
    // call fails (e.g. the token was already invalid on their side).
    console.error("[backup] Failed to revoke Google token during disconnect:", err);
  }

  await prisma.backupIntegration.update({
    where: { id: "singleton" },
    data: {
      googleAccountEmail: null,
      googleRefreshTokenEnc: null,
      driveFolderId: null,
      connectedAt: null,
    },
  });

  revalidatePath("/settings/backups");
  return {};
}

export async function runBackupNow(): Promise<{ error?: string }> {
  await requireAdmin();

  const result = await runBackup();
  revalidatePath("/settings/backups");

  if (!result.ran) {
    return { error: result.reason ?? "Backup did not run." };
  }
  return {};
}
