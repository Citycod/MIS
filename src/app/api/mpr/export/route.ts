import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/security/auth";
import { ScopeError } from "@/lib/server/security/scope";
import { generateMprPresentation } from "@/lib/server/mpr/presentation";
import { getMprReportData, MprReportError } from "@/lib/server/mpr/reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}

function safeFilePart(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "team";
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers: PRIVATE_HEADERS });
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 4096) throw new MprReportError("The export request is too large.");
    const body = await request.json() as Record<string, unknown>;
    if (body.reportType !== "monthly-performance-review" || body.format !== "pptx"
      || typeof body.teamId !== "string" || typeof body.cutoff !== "string") {
      throw new MprReportError("Select a valid report, team, cutoff and format.");
    }
    const report = getMprReportData(session, body.teamId, body.cutoff);
    const presentation = await generateMprPresentation(report);
    console.info("mpr_export_completed", {
      userId: session.user.id, role: session.user.role, teamId: report.teamId,
      cutoff: report.reportingCutoff, classification: report.synthetic ? "SYNTHETIC_DEMO_ONLY" : "CONTROLLED_SOURCE_IMPORT",
      teamRows: report.rows.length, presentationBytes: presentation.byteLength,
    });
    const prefix = report.synthetic ? "MIS-Demo-MPR" : "SAMTL-MPR";
    const filename = `${prefix}-${safeFilePart(report.teamName)}-${report.reportingCutoff}.pptx`;
    return new NextResponse(new Uint8Array(presentation), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) return NextResponse.json({ error: error.message }, { status: 403, headers: PRIVATE_HEADERS });
    if (error instanceof MprReportError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid export request." }, { status: 400, headers: PRIVATE_HEADERS });
    console.error("mpr_export_failed", { userId: session.user.id, role: session.user.role, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "The MPR PowerPoint is temporarily unavailable." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
