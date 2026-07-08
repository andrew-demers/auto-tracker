import "server-only";
import crypto from "node:crypto";

// AES-256-GCM encrypt/decrypt for secrets we must store at rest (currently
// just the Google Drive refresh token on BackupIntegration). The key is
// derived from AUTH_SECRET via scrypt rather than requiring a second secret
// env var - AUTH_SECRET is already required for the app to run at all.

const ALGORITHM = "aes-256-gcm";
const SALT = "auto-tracker-backup-token-v1";

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set to encrypt/decrypt stored secrets.");
  }
  return crypto.scryptSync(secret, SALT, 32);
}

/** Returns "iv.authTag.ciphertext", each base64-encoded. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    "."
  );
}

export function decrypt(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload.");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
