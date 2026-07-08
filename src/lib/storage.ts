import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Local filesystem attachment storage. Files live under UPLOADS_DIR
// (default ./data/uploads for local dev, /data/uploads in Docker) at
// <ownerType>/<ownerId>/<uuid>-<sanitized-filename>.

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || "./data/uploads";
}

function sanitizeFilename(filename: string): string {
  const base = filename.trim().replace(/[/\\]/g, "_");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  const trimmed = cleaned.slice(-150);
  return trimmed.length > 0 ? trimmed : "file";
}

export interface SavedAttachmentFile {
  /** Path relative to the uploads root - what gets stored on Attachment.storedPath. */
  storedPath: string;
  sizeBytes: number;
}

export async function saveUploadedFile(
  file: File,
  ownerType: "FUEL_UP" | "EXPENSE",
  ownerId: string
): Promise<SavedAttachmentFile> {
  const mimeType = file.type || "application/octet-stream";
  if (
    !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]
    )
  ) {
    throw new Error(
      `Unsupported file type "${mimeType}". Allowed: JPEG, PNG, WEBP, HEIC, PDF.`
    );
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error("File is too large (max 15MB).");
  }
  if (file.size === 0) {
    throw new Error("File is empty.");
  }

  const uploadsDir = getUploadsDir();
  const ownerDirRel = path.join(ownerType, ownerId);
  const ownerDirAbs = path.join(/* turbopackIgnore: true */ uploadsDir, ownerDirRel);
  await mkdir(ownerDirAbs, { recursive: true });

  const safeName = sanitizeFilename(file.name || "upload");
  const storedPath = path.join(ownerDirRel, `${crypto.randomUUID()}-${safeName}`);
  const absolutePath = path.join(/* turbopackIgnore: true */ uploadsDir, storedPath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return { storedPath, sizeBytes: buffer.length };
}

/** Resolves an Attachment.storedPath (relative) to an absolute filesystem path. */
export function resolveStoredPath(storedPath: string): string {
  return path.join(/* turbopackIgnore: true */ getUploadsDir(), storedPath);
}

/** Best-effort delete - never throws (e.g. file already gone). */
export async function deleteStoredFile(storedPath: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(storedPath));
  } catch {
    // Ignore - the DB row is the source of truth; a missing file on disk
    // shouldn't block the rest of a delete operation.
  }
}
