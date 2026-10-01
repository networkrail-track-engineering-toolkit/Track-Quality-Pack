import { DatabaseError } from "./dbError";

/**
 * Connection string handling for the Supabase PostgreSQL database.
 *
 * Azure App Service has no outbound IPv6, while the Supabase direct host
 * (`db.<ref>.supabase.co`) only publishes an IPv6 address. A direct URL
 * therefore fails to connect from the Web App with Prisma `P1001`. The
 * supported route is the Supabase connection pooler, which is reachable over
 * IPv4 and needs `pgbouncer=true` so that Prisma stops using prepared
 * statements that PgBouncer cannot replay.
 *
 * Operators often paste the value with the surrounding quotes or trailing
 * whitespace kept from the Supabase dashboard, which produces the same
 * unreachable error, so the value is normalised before use.
 */

const POOLER_HOST_SUFFIX = "pooler.supabase.com";
const POOLER_TRANSACTION_PORT = "6543";

/** Remove whitespace and any wrapping quotes copied in with the value. */
function clean(raw: string): string {
  const trimmed = raw.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

function isTransactionPooler(url: URL): boolean {
  return (
    url.hostname.endsWith(POOLER_HOST_SUFFIX) &&
    url.port === POOLER_TRANSACTION_PORT
  );
}

/**
 * Normalise a PostgreSQL connection string: require TLS, and add the PgBouncer
 * settings Prisma needs when the Supabase transaction pooler is used.
 */
export function normaliseDatabaseUrl(raw: string): string {
  const value = clean(raw);
  if (!value) {
    throw new DatabaseError(
      "Supabase_DB_URL is not configured. Set it as a protected application setting.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DatabaseError("Supabase_DB_URL is not a valid PostgreSQL connection string.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new DatabaseError("Supabase_DB_URL is not a valid PostgreSQL connection string.");
  }

  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }

  if (isTransactionPooler(url)) {
    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
  }

  return url.toString();
}

/**
 * The connection string for this process, or `undefined` when none is set.
 * `DATABASE_URL` is accepted as a fallback because several hosting providers
 * and Prisma's own tooling set that name.
 */
export function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.Supabase_DB_URL ?? process.env.DATABASE_URL;
  if (raw === undefined || clean(raw) === "") return undefined;
  return normaliseDatabaseUrl(raw);
}
