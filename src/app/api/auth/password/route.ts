import { NextRequest, NextResponse } from "next/server";
import { changeLocalPassword, recordAudit } from "@/lib/server/identity/store";
import { getCurrentSession } from "@/lib/server/security/auth";
import { requestNetworkContext, verifyCsrf } from "@/lib/server/security/csrf";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) return NextResponse.json({ error: "Invalid security token." }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const error = changeLocalPassword(session.user.id, currentPassword, newPassword, session.sessionId);
  if (error) {
    recordAudit({ ...requestNetworkContext(request), actorUserId: session.user.id }, "identity.password.changed", "failure", "user", session.user.id);
    return NextResponse.json({ error }, { status: 400 });
  }
  recordAudit({ ...requestNetworkContext(request), actorUserId: session.user.id }, "identity.password.changed", "success", "user", session.user.id);
  return NextResponse.json({ success: true });
}
