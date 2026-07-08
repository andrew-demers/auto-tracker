import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { google, type drive_v3 } from "googleapis";
import { ZipArchive } from "archiver";
import Database from "better-sqlite3";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { createOAuth2Client } from "@/lib/google-oauth";
import { getUploadsDir } from "@/lib/storage";

// Cloud backup: zips a consistent SQLite snapshot + the uploads directory
// and ships it to a dedicated "Auto Tracker Backups" folder in the admin's
// connected Google Drive account, tracked via BackupRecord rows.

const BACKUP_FOLDER_NAME = "Auto Tracker Backups";
const DEFAULT_RETENTION_COUNT = 14;

function getDatabaseFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  return path.resolve(url.replace(/^file:/, ""));
}

/**
 * Zips a consistent point-in-time snapshot of the SQLite database (taken via
 * `VACUUM INTO`, so the live db is never copied mid-write) plus the entire
 * uploads directory into a temp file under the OS tmpdir. Returns the path
 * to the resulting .zip - callers are responsible for deleting it (and its
 * parent temp directory) once done.
 */
export async function createBackupArchive(): Promise<string> {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "auto-tracker-backup-"));
  const dbSnapshotPath = path.join(tmpRoot, "auto-tracker.db");
  const archivePath = path.join(tmpRoot, `auto-tracker-backup-${Date.now()}.zip`);

  const db = new Database(getDatabaseFilePath());
  try {
    db.exec(`VACUUM INTO '${dbSnapshotPath.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }

  const uploadsDir = getUploadsDir();
  let uploadsDirExists = true;
  try {
    await stat(uploadsDir);
  } catch {
    uploadsDirExists = false;
  }

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(archivePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    archive.file(dbSnapshotPath, { name: "auto-tracker.db" });
    if (uploadsDirExists) {
      archive.directory(uploadsDir, "uploads");
    }
    archive.finalize();
  });

  await rm(dbSnapshotPath, { force: true });

  return archivePath;
}

/** Builds a Drive client from the stored (decrypted) refresh token, or null if not connected. */
export async function getDriveClient(): Promise<drive_v3.Drive | null> {
  const integration = await prisma.backupIntegration.findUnique({
    where: { id: "singleton" },
  });
  if (!integration?.googleRefreshTokenEnc) {
    return null;
  }

  const refreshToken = decrypt(integration.googleRefreshTokenEnc);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/** Finds (or creates) the "Auto Tracker Backups" Drive folder, caching its id. */
export async function ensureBackupFolder(drive: drive_v3.Drive): Promise<string> {
  const integration = await prisma.backupIntegration.findUnique({
    where: { id: "singleton" },
  });
  if (integration?.driveFolderId) {
    return integration.driveFolderId;
  }

  const existing = await drive.files.list({
    q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  let folderId = existing.data.files?.[0]?.id;
  if (!folderId) {
    const created = await drive.files.create({
      requestBody: {
        name: BACKUP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    folderId = created.data.id ?? undefined;
  }
  if (!folderId) {
    throw new Error("Failed to create or find the Drive backup folder.");
  }

  await prisma.backupIntegration.update({
    where: { id: "singleton" },
    data: { driveFolderId: folderId },
  });

  return folderId;
}

async function enforceRetention(drive: drive_v3.Drive, folderId: string): Promise<void> {
  const retentionCount = Number(process.env.BACKUP_RETENTION_COUNT) || DEFAULT_RETENTION_COUNT;

  const list = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, createdTime)",
    orderBy: "createdTime desc",
    pageSize: 1000,
    spaces: "drive",
  });

  const files = list.data.files ?? [];
  const toDelete = files.slice(retentionCount);

  for (const file of toDelete) {
    if (!file.id) continue;
    try {
      await drive.files.delete({ fileId: file.id });
    } catch (err) {
      console.error("[backup] Failed to delete old backup file during retention cleanup:", err);
    }
  }
}

let backupInProgress = false;

export interface RunBackupResult {
  ran: boolean;
  reason?: string;
}

/**
 * Orchestrates archive -> upload -> BackupRecord -> retention cleanup ->
 * local temp file cleanup. Safe to call even when Drive isn't connected
 * (records a FAILED BackupRecord with a clear reason rather than throwing),
 * and guards against overlapping concurrent runs.
 */
export async function runBackup(): Promise<RunBackupResult> {
  if (backupInProgress) {
    return { ran: false, reason: "A backup is already in progress." };
  }
  backupInProgress = true;

  let archivePath: string | null = null;
  try {
    const drive = await getDriveClient();
    if (!drive) {
      const reason = "Google Drive is not connected. Connect it from Settings > Backups.";
      await prisma.backupRecord.create({
        data: { status: "FAILED", errorMessage: reason },
      });
      return { ran: false, reason };
    }

    archivePath = await createBackupArchive();
    const sizeBytes = (await stat(archivePath)).size;
    const folderId = await ensureBackupFolder(drive);

    const uploaded = await drive.files.create({
      requestBody: {
        name: path.basename(archivePath),
        parents: [folderId],
      },
      media: {
        mimeType: "application/zip",
        body: createReadStream(archivePath),
      },
      fields: "id",
    });

    await prisma.backupRecord.create({
      data: {
        status: "SUCCESS",
        sizeBytes,
        driveFileId: uploaded.data.id ?? null,
      },
    });

    await enforceRetention(drive, folderId);

    return { ran: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during backup.";
    await prisma.backupRecord.create({
      data: { status: "FAILED", errorMessage: message },
    });
    return { ran: false, reason: message };
  } finally {
    if (archivePath) {
      await rm(path.dirname(archivePath), { recursive: true, force: true });
    }
    backupInProgress = false;
  }
}
