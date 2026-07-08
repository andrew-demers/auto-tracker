import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Unauthenticated (excluded from proxy.ts's route matcher) so Docker's
// HEALTHCHECK can hit it directly - see the Dockerfile.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
