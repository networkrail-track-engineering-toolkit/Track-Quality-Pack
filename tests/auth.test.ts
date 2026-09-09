import { describe, expect, it } from "vitest";
import { canChangeStatus, canEditPack, hasRole, resolvePrincipal } from "@/lib/server/auth";

const contributor = { id: "user-1", role: "CONTRIBUTOR" as const };
const reviewer = { id: "user-2", role: "REVIEWER" as const };
const administrator = { id: "user-3", role: "ADMINISTRATOR" as const };

describe("authorisation", () => {
  it("ranks roles", () => {
    expect(hasRole(contributor, "REVIEWER")).toBe(false);
    expect(hasRole(reviewer, "CONTRIBUTOR")).toBe(true);
    expect(hasRole(administrator, "REVIEWER")).toBe(true);
  });

  it("lets a contributor edit only their own draft", () => {
    expect(canEditPack(contributor, { ownerId: "user-1", status: "DRAFT" })).toBe(true);
    expect(canEditPack(contributor, { ownerId: "other", status: "DRAFT" })).toBe(false);
  });

  it("protects complete and archived packs", () => {
    expect(canEditPack(contributor, { ownerId: "user-1", status: "COMPLETE" })).toBe(false);
    expect(canEditPack(reviewer, { ownerId: "user-1", status: "COMPLETE" })).toBe(true);
    expect(canEditPack(reviewer, { ownerId: "user-1", status: "ARCHIVED" })).toBe(false);
    expect(canEditPack(administrator, { ownerId: "user-1", status: "ARCHIVED" })).toBe(true);
  });

  it("restricts workflow transitions", () => {
    expect(canChangeStatus(contributor, { ownerId: "user-1" }, "READY_FOR_REVIEW")).toBe(true);
    expect(canChangeStatus(contributor, { ownerId: "user-1" }, "COMPLETE")).toBe(false);
    expect(canChangeStatus(reviewer, { ownerId: "user-1" }, "COMPLETE")).toBe(true);
    expect(canChangeStatus(reviewer, { ownerId: "user-1" }, "ARCHIVED")).toBe(false);
    expect(canChangeStatus(administrator, { ownerId: "user-1" }, "ARCHIVED")).toBe(true);
  });
});

describe("identity providers", () => {
  it("reads the Azure App Service principal headers", () => {
    const previous = process.env.AUTH_PROVIDER;
    process.env.AUTH_PROVIDER = "azure-easy-auth";
    const principal = resolvePrincipal({
      get: (name) =>
        name === "x-ms-client-principal-id"
          ? "abc-123"
          : name === "x-ms-client-principal-name"
            ? "engineer@networkrail.example"
            : null,
    });
    expect(principal?.externalId).toBe("abc-123");
    process.env.AUTH_PROVIDER = previous;
  });

  it("returns no principal when the Azure headers are absent", () => {
    const previous = process.env.AUTH_PROVIDER;
    process.env.AUTH_PROVIDER = "azure-easy-auth";
    expect(resolvePrincipal({ get: () => null })).toBeNull();
    process.env.AUTH_PROVIDER = previous;
  });
});
