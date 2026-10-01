import { describe, expect, it } from "vitest";
import { normaliseDatabaseUrl } from "../src/lib/server/dbUrl";
import { DatabaseError } from "../src/lib/server/dbError";

const DIRECT = "postgresql://user@db.abcdefgh.supabase.co:5432/postgres";
const POOLER = "postgresql://user@aws-0-eu-west-2.pooler.supabase.com:6543/postgres";
const SESSION_POOLER =
  "postgresql://user@aws-0-eu-west-2.pooler.supabase.com:5432/postgres";

describe("normaliseDatabaseUrl", () => {
  it("adds sslmode=require when it is missing", () => {
    const url = new URL(normaliseDatabaseUrl(DIRECT));
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("keeps an explicit sslmode", () => {
    const url = new URL(normaliseDatabaseUrl(`${DIRECT}?sslmode=verify-full`));
    expect(url.searchParams.get("sslmode")).toBe("verify-full");
  });

  it("adds PgBouncer settings for the transaction pooler", () => {
    const url = new URL(normaliseDatabaseUrl(POOLER));
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("leaves the session pooler port alone", () => {
    const url = new URL(normaliseDatabaseUrl(SESSION_POOLER));
    expect(url.searchParams.has("pgbouncer")).toBe(false);
  });

  it("strips quotes and whitespace pasted in with the value", () => {
    const url = new URL(normaliseDatabaseUrl(`  "${POOLER}"  `));
    expect(url.hostname).toBe("aws-0-eu-west-2.pooler.supabase.com");
  });

  it("rejects a value that is not a PostgreSQL connection string", () => {
    expect(() => normaliseDatabaseUrl("https://example.supabase.co")).toThrow(DatabaseError);
    expect(() => normaliseDatabaseUrl("not a url")).toThrow(DatabaseError);
  });

  it("rejects an empty value", () => {
    expect(() => normaliseDatabaseUrl("   ")).toThrow(DatabaseError);
  });
});
