import { NextResponse } from "next/server";
import { IdentityAdminError, requireIdentityAdmin } from "@/lib/server/identity/admin";
import { listAuditEvents } from "@/lib/server/identity/store";

export async function GET() {
  try {
    await requireIdentityAdmin();
    return NextResponse.json({ events: listAuditEvents() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof IdentityAdminError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Audit data unavailable." }, { status });
  }
}
