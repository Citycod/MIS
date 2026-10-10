import { cookies } from "next/headers";
import { Session, User } from "@/types/auth";
import { MOCK_USERS } from "@/mocks/fixtures";
import { normalizeAuthorizedScope } from "./scope";

const SESSION_COOKIE_NAME = "pis_session";

export async function getCurrentSession(rawFilters?: Record<string, string>): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  let userId = "USR-RO-001"; // Default demo fallback user if no cookie set yet
  if (sessionCookie?.value) {
    userId = sessionCookie.value;
  }

  const user: User | undefined = MOCK_USERS[userId] || MOCK_USERS["USR-RO-001"];
  if (!user) return null;

  const { scope } = normalizeAuthorizedScope(user, rawFilters);

  return {
    user,
    scope,
    expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
  };
}

export async function setSessionUser(userId: string): Promise<boolean> {
  if (!MOCK_USERS[userId]) return false;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
  return true;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
