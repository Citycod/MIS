import { NextRequest, NextResponse } from "next/server";
import { consumeMfaLoginChallenge, createServerSession, getManagedIdentityUser, recordAudit } from "@/lib/server/identity/store";
import { MFA_CHALLENGE_COOKIE_NAME, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/server/security/auth";
import { requestNetworkContext, verifyCsrf } from "@/lib/server/security/csrf";

export async function POST(request: NextRequest) {
  const network = requestNetworkContext(request);
  if (!verifyCsrf(request)) return NextResponse.json({ error: "Invalid security token." }, { status: 403 });
  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const challenge = request.cookies.get(MFA_CHALLENGE_COOKIE_NAME)?.value;
  if (!challenge || !/^\d{6}$/u.test(code)) return NextResponse.json({ error: "Enter the six-digit authenticator code." }, { status: 400 });
  const userId = consumeMfaLoginChallenge(challenge, code);
  const user = userId ? getManagedIdentityUser(userId) : null;
  if (!user || user.status !== "active") {
    recordAudit(network, "authentication.mfa", "failure", "authentication", "totp");
    return NextResponse.json({ error: "The authenticator code is invalid or expired." }, { status: 401 });
  }
  const session = createServerSession(user.id, "local", true, network.ip, network.userAgent);
  const redirectTo = user.mustChangePassword ? "/change-password" : user.role === "REGIONAL_MANAGER" ? "/regional/dashboard?source=financial-sample" : "/ro/dashboard?source=financial-sample";
  const response = NextResponse.json({ success: true, redirectTo }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.expiresAt));
  response.cookies.delete(MFA_CHALLENGE_COOKIE_NAME);
  recordAudit({ ...network, actorUserId: user.id }, "authentication.login", "success", "user", user.id, { provider: "local", mfaVerified: true });
  return response;
}
