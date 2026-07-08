import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function generateRandomPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
