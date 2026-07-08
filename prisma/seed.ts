import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function generateRandomPassword(): string {
  // 16 random bytes -> base64url, trimmed to a friendly length.
  return crypto.randomBytes(16).toString("base64url");
}

function printBanner(lines: string[]) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const border = "=".repeat(width);
  console.log(`\n${border}`);
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log(`${border}\n`);
}

async function main() {
  const existingUserCount = await prisma.user.count();

  if (existingUserCount > 0) {
    console.log(
      `[seed] ${existingUserCount} user(s) already exist - skipping admin seed.`
    );
    return;
  }

  const envEmail = process.env.ADMIN_EMAIL?.trim();
  const envPassword = process.env.ADMIN_PASSWORD?.trim();

  const email = envEmail && envEmail.length > 0 ? envEmail : "admin@localhost";
  const usingGeneratedPassword = !envPassword || envPassword.length === 0;
  const password = usingGeneratedPassword
    ? generateRandomPassword()
    : envPassword;

  if (!envEmail) {
    console.warn(
      "[seed] ADMIN_EMAIL is not set - defaulting to admin@localhost. " +
        "Update this via Settings so the admin account can receive notifications."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      notifyEnabled: true,
    },
  });

  printBanner([
    "Auto Tracker - first admin account created",
    "",
    `Email:    ${email}`,
    `Password: ${password}`,
    "",
    ...(usingGeneratedPassword
      ? ["This password was randomly generated - save it now."]
      : []),
    "Sign in and change this password from Settings > Profile.",
  ]);
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
