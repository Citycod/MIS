import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/security/auth";
import { createGuestToken } from "@/lib/server/superset/guest-token";
import { FilterError, ScopeError } from "@/lib/server/security/scope";
import { FILTER_KEYS } from "@/lib/filters";
import { verifyCsrf } from "@/lib/server/security/csrf";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: "Invalid security token." }, { status: 403, headers });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { /* rejected below */ }
    if (!host || originHost !== host) return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers });
  }
  try {
    const body = await req.json();
    if (!body || typeof body.dashboardKey !== "string" || !body.filters || typeof body.filters !== "object" || Array.isArray(body.filters)) throw new FilterError("Dashboard and filters are required.");
    for (const [key, value] of Object.entries(body.filters)) {
      if (!FILTER_KEYS.includes(key as typeof FILTER_KEYS[number]) || typeof value !== "string") throw new FilterError("Invalid analytics filters.");
    }
    return NextResponse.json(await createGuestToken(session.user, body.dashboardKey, body.filters), { headers });
  } catch (error) {
    if (error instanceof ScopeError) return NextResponse.json({ error: error.message }, { status: 403, headers });
    if (error instanceof FilterError || error instanceof SyntaxError) return NextResponse.json({ error: "Invalid analytics request." }, { status: 400, headers });
    return NextResponse.json({ error: "Analytics is unavailable. Check the local Superset service and retry." }, { status: 503, headers });
  }
}
