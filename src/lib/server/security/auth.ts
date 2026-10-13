import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Session } from "@/types/auth";
import { normalizeAuthorizedScope } from "./scope";
import { getActiveDataCatalog } from "@/lib/server/repository/data-catalog";

const SESSION_COOKIE_NAME = "pis_session";
// Demo sessions only. A runtime secret may be supplied for multi-process demos.
// Without one, restart expires all sessions. Institutional identity remains an integration dependency.
const runtime = globalThis as typeof globalThis & { pisDemoSessionKey?: string };
const secret = process.env.SESSION_SECRET || (runtime.pisDemoSessionKey ??= randomBytes(32).toString("hex"));
function signature(payload: string) { return createHmac("sha256", secret).update(payload).digest("hex"); }

export async function getCurrentSession(rawFilters?: Record<string, string>): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra || !/^[a-f0-9]{64}$/.test(mac)) return null;
  if (!timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(signature(payload), "hex"))) return null;
  try {
    const { userId, expires } = JSON.parse(Buffer.from(payload, "base64url").toString());
    const users = getActiveDataCatalog().users;
    const user = typeof userId === "string" && Object.hasOwn(users, userId) ? users[userId] : undefined;
    if (!user || typeof expires !== "number" || expires <= Date.now()) return null;
    const { scope } = normalizeAuthorizedScope(user, rawFilters);
    return { user, scope, expiresAt: new Date(expires).toISOString() };
  } catch { return null; }
}
export async function setSessionUser(userId: string): Promise<boolean> {
  if (typeof userId !== "string" || !Object.hasOwn(getActiveDataCatalog().users, userId)) return false;
  const payload = Buffer.from(JSON.stringify({ userId, expires: Date.now() + 86400000 })).toString("base64url");
  (await cookies()).set(SESSION_COOKIE_NAME, `${payload}.${signature(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400,
  });
  return true;
}
export async function clearSession(): Promise<void> { (await cookies()).delete(SESSION_COOKIE_NAME); }
