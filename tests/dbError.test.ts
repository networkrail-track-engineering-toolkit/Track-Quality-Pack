import { describe, expect, it } from "vitest";
import { DatabaseError, describeDatabaseError } from "@/lib/server/dbError";

describe("database error classification", () => {
  it("reports an unreachable database", () => {
    expect(describeDatabaseError({ code: "P1001" })).toMatch(/could not be reached/i);
    expect(describeDatabaseError({ errorCode: "P1017" })).toMatch(/could not be reached/i);
  });

  it("reports rejected credentials and a missing database", () => {
    expect(describeDatabaseError({ code: "P1000" })).toMatch(/credentials/i);
    expect(describeDatabaseError({ code: "P1003" })).toMatch(/does not exist/i);
  });

  it("reports a schema that has not been migrated", () => {
    expect(describeDatabaseError({ code: "P2021" })).toMatch(/prisma migrate deploy/);
    expect(describeDatabaseError({ code: "P2022" })).toMatch(/prisma migrate deploy/);
  });

  it("treats a client initialisation failure as unreachable", () => {
    const error = new Error("boom");
    error.name = "PrismaClientInitializationError";
    expect(describeDatabaseError(error)).toMatch(/could not be reached/i);
  });

  it("passes through a configuration error", () => {
    expect(describeDatabaseError(new DatabaseError("Supabase_DB_URL is not configured."))).toBe(
      "Supabase_DB_URL is not configured.",
    );
  });

  it("never echoes the underlying message", () => {
    const leak = Object.assign(new Error("******db.example:5432"), {
      code: "P1001",
    });
    expect(describeDatabaseError(leak)).not.toMatch(/secret/);
  });

  it("ignores errors that are not database failures", () => {
    expect(describeDatabaseError(new Error("Validation failed"))).toBeNull();
    expect(describeDatabaseError({ code: "P2002" })).toBeNull();
    expect(describeDatabaseError(null)).toBeNull();
  });
});
