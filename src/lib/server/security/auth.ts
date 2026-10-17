import "server-only";
import { cookies } from "next/headers";
import type { Session } from "@/types/auth";
import { normalizeAuthorizedScope } from "./scope";
import {
  createServerSession,
  identityUserToApplicationUser,
  loadServerSession,
  revokeSessionByToken,
  type LoadedIdentitySession,
} from "@/lib/server/identity/store";
import type { IdentityProvider, ManagedIdentityUser } from "@/lib/server/identity/types";

export const SESSION_COOKIE_NAME = "mis_session";
export const MFA_CHALLENGE_COOKIE_NAME = "mis_mfa_challenge";

export function sessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.MIS_IDENTITY_TEST_MODE !== "true",
    sameSite: "strict" as const,
    path: "/",
    expires: new Date(expiresAt),
    priority: "high" as const,
  };
}

function materializeSession(loaded: LoadedIdentitySession, rawFilters?: Record<string, string>): Session {
  const user = identityUserToApplicationUser(loaded.user);
  const { scope } = normalizeAuthorizedScope(user, rawFilters);
  return {
    user,
    scope,
    sessionId: loaded.tokenHash,
    issuedAt: new Date(loaded.createdAt).toISOString(),
    expiresAt: new Date(loaded.expiresAt).toISOString(),
    authProvider: loaded.authProvider,
    mfaVerified: loaded.mfaVerified,
    mfaEnabled: loaded.user.mfaEnabled,
    mustChangePassword: loaded.user.mustChangePassword,
    permissions: loaded.user.permissions,
  };
}

export async function getCurrentSession(rawFilters?: Record<string, string>): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const loaded = loadServerSession(token);
  return loaded ? materializeSession(loaded, rawFilters) : null;
}

export function createIdentitySession(user: ManagedIdentityUser, provider: IdentityProvider, mfaVerified: boolean, ip: string | null, userAgent: string | null) {
  return createServerSession(user.id, provider, mfaVerified, ip, userAgent);
}

export async function clearSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = token ? revokeSessionByToken(token) : null;
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(MFA_CHALLENGE_COOKIE_NAME);
  return userId;
}
