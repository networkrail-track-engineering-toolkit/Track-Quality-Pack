/**
 * Database failure classification.
 *
 * Prisma reports configuration, connectivity and migration problems through
 * error codes. Those raw messages can contain the host name and user from the
 * connection string, so they are never returned to the client or logged.
 * Instead each code is translated into a fixed message that says what to check.
 */

/** A database problem that the operator can act on, reported as HTTP 503. */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

const UNREACHABLE =
  "The database could not be reached. Check that Supabase_DB_URL is set correctly and that the database accepts connections from this app.";

const MIGRATIONS_PENDING =
  "The database schema is out of date. Run `npx prisma migrate deploy` against the database.";

const CODE_MESSAGES: Record<string, string> = {
  P1000: "The database rejected the credentials in Supabase_DB_URL.",
  P1001: UNREACHABLE,
  P1002: UNREACHABLE,
  P1003: "The database named in Supabase_DB_URL does not exist.",
  P1008: UNREACHABLE,
  P1010: "The database rejected the credentials in Supabase_DB_URL.",
  P1011: "The database refused the TLS connection. Check the sslmode in Supabase_DB_URL.",
  P1013: "Supabase_DB_URL is not a valid PostgreSQL connection string.",
  P1017: UNREACHABLE,
  P2021: MIGRATIONS_PENDING,
  P2022: MIGRATIONS_PENDING,
};

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown; errorCode?: unknown }).code ??
    (error as { errorCode?: unknown }).errorCode;
  return typeof code === "string" ? code : undefined;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

/**
 * Return a safe, actionable message when the error is a database
 * configuration, connectivity or migration failure, otherwise `null`.
 */
export function describeDatabaseError(error: unknown): string | null {
  if (error instanceof DatabaseError) return error.message;

  const code = errorCode(error);
  if (code && code in CODE_MESSAGES) return CODE_MESSAGES[code];

  const name = errorName(error);
  if (name === "PrismaClientInitializationError") return UNREACHABLE;

  return null;
}
