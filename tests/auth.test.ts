import { describe, expect, it } from "vitest";
import {
  canChangeStatus,
  canEditPack,
  hasRole,
  resolveLocalUser,
  type UserStore,
} from "@/lib/server/auth";

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

function uniqueConstraintError(target: string) {
  return Object.assign(new Error(`Unique constraint failed on ${target}`), {
    code: "P2002",
  });
}

function store(rows: Array<Record<string, string>>): UserStore {
  return {
    async findFirst({ where }) {
      const match = rows.find((row) =>
        where.OR.some((clause) =>
          Object.entries(clause).every(([key, value]) => row[key] === value),
        ),
      );
      return (match as never) ?? null;
    },
    async create({ data }) {
      if (rows.some((row) => row.externalId === data.externalId)) {
        throw uniqueConstraintError("externalId");
      }
      if (rows.some((row) => row.email === data.email)) {
        throw uniqueConstraintError("email");
      }
      const row = { id: `user-${rows.length + 1}`, ...data };
      rows.push(row);
      return row as never;
    },
  };
}

describe("local user provisioning", () => {
  it("creates the local user on first use", async () => {
    const rows: Array<Record<string, string>> = [];
    const user = await resolveLocalUser(store(rows));
    expect(user.externalId).toBe("local:default");
    expect(rows).toHaveLength(1);
  });

  it("reuses the existing local user", async () => {
    const rows = [
      {
        id: "user-9",
        externalId: "local:default",
        email: "user@local",
        displayName: "Track Quality Pack user",
        role: "ADMINISTRATOR",
      },
    ];
    const user = await resolveLocalUser(store(rows));
    expect(user.id).toBe("user-9");
    expect(rows).toHaveLength(1);
  });

  it("reuses a row that already holds the local email", async () => {
    const rows = [
      {
        id: "user-7",
        externalId: "legacy:entra",
        email: "user@local",
        displayName: "Legacy user",
        role: "ADMINISTRATOR",
      },
    ];
    const user = await resolveLocalUser(store(rows));
    expect(user.id).toBe("user-7");
    expect(rows).toHaveLength(1);
  });

  it("recovers when a concurrent request created the row first", async () => {
    const rows: Array<Record<string, string>> = [];
    const backing = store(rows);
    let firstLookup = true;
    const racing: UserStore = {
      async findFirst(args) {
        if (firstLookup) {
          firstLookup = false;
          return null;
        }
        return backing.findFirst(args);
      },
      create: async (args) => {
        rows.push({
          id: "user-race",
          externalId: "local:default",
          email: "user@local",
          displayName: "Track Quality Pack user",
          role: "ADMINISTRATOR",
        });
        return backing.create(args);
      },
    };
    const user = await resolveLocalUser(racing);
    expect(user.id).toBe("user-race");
  });

  it("rethrows errors that are not unique constraint violations", async () => {
    const failing: UserStore = {
      async findFirst() {
        return null;
      },
      async create() {
        throw Object.assign(new Error("table missing"), { code: "P2021" });
      },
    };
    await expect(resolveLocalUser(failing)).rejects.toThrow("table missing");
  });
});
