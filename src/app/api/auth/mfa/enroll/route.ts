import { NextRequest, NextResponse } from "next/server";
import { beginTotpEnrollment, confirmTotpEnrollment, recordAudit, setSessionMfaVerified, verifyLocalCredential } from "@/lib/server/identity/store";
import { getCurrentSession } from "@/lib/server/security/auth";
import { requestNetworkContext, verifyCsrf } from "@/lib/server/security/csrf";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) return NextResponse.json({ error: "Invalid security token." }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: unknown; currentPassword?: unknown; factorId?: unknown; code?: unknown } | null;
  const action = body?.action;
  const context = { ...requestNetworkContext(request), actorUserId: session.user.id };
  if (action === "start") {
    const password = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    if (!verifyLocalCredential(session.user.id, password)) {
      recordAudit(context, "identity.mfa.enrollment_started", "failure", "user", session.user.id);
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    const enrollment = beginTotpEnrollment(session.user.id);
    recordAudit(context, "identity.mfa.enrollment_started", "success", "user", session.user.id);
    return NextResponse.json(enrollment, { headers: { "Cache-Control": "no-store" } });
  }
  if (action === "confirm") {
    const factorId = typeof body?.factorId === "string" ? body.factorId : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!confirmTotpEnrollment(session.user.id, factorId, code)) {
      recordAudit(context, "identity.mfa.enrolled", "failure", "user", session.user.id);
      return NextResponse.json({ error: "The authenticator code is invalid." }, { status: 400 });
    }
    setSessionMfaVerified(session.sessionId);
    recordAudit(context, "identity.mfa.enrolled", "success", "user", session.user.id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unsupported MFA action." }, { status: 400 });
}
