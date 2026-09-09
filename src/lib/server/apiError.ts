import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthenticationError, AuthorisationError } from "./auth";
import { ConcurrencyError } from "./packService";

/**
 * Consistent API error handling. Internal details and connection strings are
 * never returned to the client or written to the log.
 */
export function apiError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (error instanceof AuthorisationError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ConcurrencyError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  if (error instanceof Error && /not found|does not exist|Unknown section/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof Error && /must be|required|Invalid/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("Unhandled API error", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
