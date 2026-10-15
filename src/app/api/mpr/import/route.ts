import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/security/auth";
import { ScopeError } from "@/lib/server/security/scope";
import { importMprSource, importTemplate, MprImportError, type MprImportType } from "@/lib/server/mpr/importer";
import { resolveMprScope } from "@/lib/server/mpr/reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

function importType(value: unknown): MprImportType {
  if (value === "odoo-targets" || value === "symplus-positions") return value;
  throw new MprImportError("Select the Odoo target or Symplus position import type.");
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}

function errorResponse(error: unknown) {
  if (error instanceof ScopeError) return NextResponse.json({ error: error.message }, { status: 403, headers: PRIVATE_HEADERS });
  if (error instanceof MprImportError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
  return NextResponse.json({ error: "The controlled source import is temporarily unavailable." }, { status: 503, headers: PRIVATE_HEADERS });
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    if (session.user.role !== "REGIONAL_MANAGER") throw new MprImportError("Only authorized managers may download source templates.", 403);
    const type = importType(request.nextUrl.searchParams.get("type"));
    const scope = resolveMprScope(session, session.scope.effectiveRegionId);
    const template = importTemplate(type, scope.regionId, scope.roIds[0]);
    return new NextResponse(template, {
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-template.csv"`,
      },
    });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers: PRIVATE_HEADERS });
  try {
    const form = await request.formData();
    const type = importType(form.get("type"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new MprImportError("Choose a CSV source file.");
    const result = await importMprSource(session, type, file);
    console.info("mpr_source_import_completed", {
      userId: session.user.id, role: session.user.role, teamId: session.scope.effectiveRegionId,
      sourceType: type, importId: result.importId, rowCount: result.rows, idempotent: result.idempotent,
    });
    return NextResponse.json({
      message: result.idempotent ? `This source file was already imported (${result.rows} rows).` : `Imported ${result.rows} controlled source rows.`,
      ...result,
    }, { headers: PRIVATE_HEADERS });
  } catch (error) { return errorResponse(error); }
}
