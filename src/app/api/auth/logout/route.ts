import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/server/security/auth";
import { requestNetworkContext, verifyCsrf } from "@/lib/server/security/csrf";
import { recordAudit } from "@/lib/server/identity/store";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) return NextResponse.json({ error: "Invalid security token." }, { status: 403 });
  const userId = await clearSession();
  recordAudit({ ...requestNetworkContext(request), actorUserId: userId ?? undefined }, "authentication.logout", "success", "user", userId ?? undefined);
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
