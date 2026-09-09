import { headers } from "next/headers";
import { prisma } from "./db";

/**
 * Authentication and authorisation.
 *
 * Identity is resolved by a pluggable provider so the identity provider can be
 * changed per deployment without touching business logic:
 *  - `azure-easy-auth` reads the `x-ms-client-principal-*` headers injected by
 *    Azure App Service authentication (Entra ID).
 *  - `dev` is for local development only and is refused in production.
 *
 * No passwords are stored by this application.
 */

export type Role = "CONTRIBUTOR" | "REVIEWER" | "ADMINISTRATOR";

export interface Principal {
  externalId: string;
  email: string;
  displayName: string;
}

export interface SessionUser extends Principal {
  id: string;
  role: Role;
}

export class AuthorisationError extends Error {
  constructor(message = "Not authorised") {
    super(message);
    this.name = "AuthorisationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function resolvePrincipal(headerBag: {
  get(name: string): string | null;
}): Principal | null {
  const provider = process.env.AUTH_PROVIDER ?? "dev";
  if (provider === "azure-easy-auth") {
    const externalId = headerBag.get("x-ms-client-principal-id");
    const email = headerBag.get("x-ms-client-principal-name");
    if (!externalId || !email) return null;
    return { externalId, email, displayName: email };
  }
  if (process.env.NODE_ENV === "production") {
    throw new AuthenticationError(
      "The development authentication provider cannot be used in production",
    );
  }
  const email = process.env.DEV_USER_EMAIL ?? "developer@example.invalid";
  return {
    externalId: `dev:${email}`,
    email,
    displayName: process.env.DEV_USER_NAME ?? "Local Developer",
  };
}

/** Resolve (and provision on first sign-in) the current user. */
export async function getSessionUser(): Promise<SessionUser> {
  const principal = resolvePrincipal(await headers());
  if (!principal) throw new AuthenticationError();

  const defaultRole = (process.env.AUTH_PROVIDER ?? "dev") === "dev"
    ? ((process.env.DEV_USER_ROLE as Role) ?? "CONTRIBUTOR")
    : "CONTRIBUTOR";

  const user = await prisma.user.upsert({
    where: { externalId: principal.externalId },
    update: { email: principal.email, displayName: principal.displayName },
    create: {
      externalId: principal.externalId,
      email: principal.email,
      displayName: principal.displayName,
      role: defaultRole,
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
