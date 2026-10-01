import { prisma } from "./db";

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

/** Resolve (and provision on first use) the single local user. */
export async function getSessionUser(): Promise<SessionUser> {
  const user = await prisma.user.upsert({
    where: { externalId: LOCAL_USER.externalId },
    update: {},
    create: {
      externalId: LOCAL_USER.externalId,
      email: LOCAL_USER.email,
      displayName: LOCAL_USER.displayName,
      role: LOCAL_USER.role,
    },
  });

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
