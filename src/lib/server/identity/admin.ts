import "server-only";
import type { Session } from "@/types/auth";
import { getCurrentSession } from "@/lib/server/security/auth";
import { IdentityPermissions } from "./store";

export class IdentityAdminError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function requireIdentityAdmin(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) throw new IdentityAdminError("Unauthorized.", 401);
  if (!session.permissions.includes(IdentityPermissions.manageUsers)) throw new IdentityAdminError("User administration permission is required.", 403);
  if (!session.mfaEnabled) throw new IdentityAdminError("Enroll an authenticator app before using user administration.", 428);
  if (!session.mfaVerified) throw new IdentityAdminError("MFA verification is required for this session.", 401);
  return session;
}
