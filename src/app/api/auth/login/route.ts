import { NextRequest, NextResponse } from "next/server";
import {
  clearLoginFailures,
  createAuthenticationChallenge,
  findLocalCredential,
  loginThrottleKey,
  loginThrottleStatus,
  recordAudit,
  recordLoginFailure,
  verifyLocalCredential,
} from "@/lib/server/identity/store";
import { createIdentitySession, MFA_CHALLENGE_COOKIE_NAME, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/server/security/auth";
import { requestNetworkContext, verifyCsrf } from "@/lib/server/security/csrf";

const PRIVATE_HEADERS = { "Cache-Control": "no-store, private" };

export async function POST(request: NextRequest) {
  const network = requestNetworkContext(request);
  if (!verifyCsrf(request)) {
    recordAudit(network, "authentication.login", "denied", "authentication", "local", { reason: "csrf" });
    return NextResponse.json({ error: "The sign-in request expired. Refresh the page and try again." }, { status: 403, headers: PRIVATE_HEADERS });
  }

  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const username = body && typeof body === "object" && "username" in body && typeof body.username === "string" ? body.username.trim() : "";
  const password = body && typeof body === "object" && "password" in body && typeof body.password === "string" ? body.password : "";
  if (!username || !password) return NextResponse.json({ error: "Staff ID and password are required." }, { status: 400, headers: PRIVATE_HEADERS });

  const bucket = loginThrottleKey(username, network.ip);
  const throttle = loginThrottleStatus(bucket);
  if (!throttle.allowed) {
    recordAudit(network, "authentication.login", "denied", "authentication", "local", { reason: "rate_limited" });
    return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, {
      status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(throttle.retryAfterSeconds) },
    });
  }

  const candidate = findLocalCredential(username);
  const user = verifyLocalCredential(username, password);
  if (!user) {
    recordLoginFailure(bucket);
    recordAudit({ ...network, actorUserId: candidate?.user.id }, "authentication.login", "failure", "authentication", "local", { reason: "invalid_credentials_or_inactive" });
    return NextResponse.json({ error: "Invalid staff ID or password." }, { status: 401, headers: PRIVATE_HEADERS });
  }

  clearLoginFailures(bucket);
  if (user.mfaEnabled) {
    const challenge = createAuthenticationChallenge(user.id, "mfa_login");
    const response = NextResponse.json({ mfaRequired: true }, { headers: PRIVATE_HEADERS });
    response.cookies.set(MFA_CHALLENGE_COOKIE_NAME, challenge, {
      httpOnly: true, secure: process.env.NODE_ENV === "production" && process.env.MIS_IDENTITY_TEST_MODE !== "true", sameSite: "strict", path: "/api/auth/mfa", maxAge: 300,
    });
    recordAudit({ ...network, actorUserId: user.id }, "authentication.password_verified", "success", "user", user.id, { mfaRequired: true });
    return response;
  }

  const session = createIdentitySession(user, "local", false, network.ip, network.userAgent);
  const redirectTo = user.mustChangePassword ? "/change-password" : user.role === "REGIONAL_MANAGER" ? "/regional/dashboard?source=financial-sample" : "/ro/dashboard?source=financial-sample";
  const response = NextResponse.json({ success: true, redirectTo, mustChangePassword: user.mustChangePassword }, { headers: PRIVATE_HEADERS });
  response.cookies.set(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.expiresAt));
  recordAudit({ ...network, actorUserId: user.id }, "authentication.login", "success", "user", user.id, { provider: "local", mfaVerified: false });
  return response;
}
