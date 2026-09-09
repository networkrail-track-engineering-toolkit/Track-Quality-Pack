import { PrismaClient } from "@prisma/client";

/**
 * Server-only Prisma client. The connection string is read from the
 * `Supabase_DB_URL` environment variable and never reaches the browser bundle.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function assertDatabaseConfigured(): void {
  if (!process.env.Supabase_DB_URL) {
    throw new Error(
      "Supabase_DB_URL is not configured. Set it as a protected application setting.",
    );
  }
}
