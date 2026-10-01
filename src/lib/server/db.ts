import { PrismaClient } from "@prisma/client";
import { DatabaseError } from "./dbError";
import { resolveDatabaseUrl } from "./dbUrl";

/**
 * Server-only Prisma client. The connection string is read from the
 * `Supabase_DB_URL` environment variable and never reaches the browser bundle.
 * It is normalised and passed to Prisma explicitly, so that the value the app
 * connects with is the same one the configuration checks validate.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const log: ("warn" | "error")[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  let url: string | undefined;
  try {
    url = resolveDatabaseUrl();
  } catch {
    // An unusable value is reported by assertDatabaseConfigured on each
    // request, which keeps the message identical for every caller.
    url = undefined;
  }

  return url
    ? new PrismaClient({ log, datasources: { db: { url } } })
    : new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function assertDatabaseConfigured(): void {
  if (resolveDatabaseUrl() === undefined) {
    throw new DatabaseError(
      "Supabase_DB_URL is not configured. Set it as a protected application setting.",
    );
  }
}
