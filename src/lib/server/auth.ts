import { assertDatabaseConfigured, prisma } from "./db";

/**
 * Users and permissions.
 *
 * The application does not require sign-in. Every request runs as a single
 * built-in local user, which is provisioned in the database on first use so
 * that packs still have an owner. No passwords or identity providers are used.
 */

export type Role = "CONTRIBUTOR" | "REVIEWER" | "ADMINISTRATOR";

export interface SessionUser {
  id: string;
  externalId: string;
  email: string;
  displayName: string;
  role: Role;
}

export class AuthorisationError extends Error {
  constructor(message = "Not authorised") {
    super(message);
    this.name = "AuthorisationError";
  }
}

const LOCAL_USER = {
  externalId: "local:default",
  email: "user@local",
  displayName: "Track Quality Pack user",
  role: "ADMINISTRATOR" as Role,
};

interface UserRecord {
  id: string;
  externalId: string;
  email: string;
  displayName: string;
  role: string;
}

/** The subset of the Prisma client used to provision the local user. */
export interface UserStore {
  findFirst(args: {
    where: { OR: Array<{ externalId: string } | { email: string }> };
  }): Promise<UserRecord | null>;
  create(args: {
    data: {
      externalId: string;
      email: string;
      displayName: string;
      role: Role;
    };
  }): Promise<UserRecord>;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Find the local user, creating it only when it is missing.
 *
 * `upsert` fails when a row already matches one of the other unique columns
 * (for example a user created with the same email under a different external
 * id) and when two concurrent requests both try to create the row. Both cases
 * surface as a unique constraint violation, so the row is looked up on either
 * unique column and the create is retried once after a conflict.
 */
export async function resolveLocalUser(users: UserStore): Promise<UserRecord> {
  const where = {
    OR: [{ externalId: LOCAL_USER.externalId }, { email: LOCAL_USER.email }],
  };

  const existing = await users.findFirst({ where });
  if (existing) return existing;

  try {
    return await users.create({
      data: {
        externalId: LOCAL_USER.externalId,
        email: LOCAL_USER.email,
        displayName: LOCAL_USER.displayName,
        role: LOCAL_USER.role,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await users.findFirst({ where });
    if (raced) return raced;
    throw error;
  }
}

/** Resolve (and provision on first use) the single local user. */
export async function getSessionUser(): Promise<SessionUser> {
  assertDatabaseConfigured();
  const user = await resolveLocalUser(prisma.user);

  return {
    id: user.id,
    externalId: user.externalId,
    email: user.email,
    displayName: user.displayName,
    role: user.role as Role,
  };
}

const ROLE_RANK: Record<Role, number> = {
  CONTRIBUTOR: 1,
  REVIEWER: 2,
  ADMINISTRATOR: 3,
};

export function hasRole(user: { role: Role }, required: Role): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[required];
}

export function requireRole(user: { role: Role }, required: Role): void {
  if (!hasRole(user, required)) {
    throw new AuthorisationError(`Requires the ${required} role`);
  }
}

/** Permission rules applied on the server for every pack mutation. */
export function canEditPack(
  user: { id: string; role: Role },
  pack: { ownerId: string; status: string },
): boolean {
  if (pack.status === "ARCHIVED") return user.role === "ADMINISTRATOR";
  if (pack.status === "COMPLETE") return hasRole(user, "REVIEWER");
  if (user.role === "ADMINISTRATOR" || user.role === "REVIEWER") return true;
  return pack.ownerId === user.id;
}

export function canChangeStatus(
  user: { id: string; role: Role },
  pack: { ownerId: string },
  next: string,
): boolean {
  if (next === "ARCHIVED") return user.role === "ADMINISTRATOR";
  if (next === "COMPLETE") return hasRole(user, "REVIEWER");
  if (next === "READY_FOR_REVIEW") {
    return hasRole(user, "REVIEWER") || pack.ownerId === user.id;
  }
  return hasRole(user, "REVIEWER") || pack.ownerId === user.id;
}
