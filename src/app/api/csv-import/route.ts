import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/security/auth";
import { CsvImportError, csvTemplate, parseAuthorizedCsv, replaceCsvReportingDatabase } from "@/lib/server/csv-import";
import { requestNetworkContext, verifyCsrf } from "@/lib/server/security/csrf";
import { recordAudit } from "@/lib/server/identity/store";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  return new NextResponse(csvTemplate(session.user), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="mis-synthetic-import-template.csv"' },
  });
}

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) return NextResponse.json({ error: "Invalid security token." }, { status: 403, headers });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  if (process.env.NODE_ENV === "production" && process.env.MIS_CSV_IMPORT_ENABLED !== "true") {
    return NextResponse.json({ error: "CSV import is available only in development." }, { status: 403, headers });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) throw new CsvImportError("Choose a CSV file.");
    if (file.size === 0 || file.size > 5 * 1024 * 1024) throw new CsvImportError("CSV files must be between 1 byte and 5 MB.");
    const rows = parseAuthorizedCsv(await file.text(), session.user);
    const result = await replaceCsvReportingDatabase(rows);
    recordAudit({ ...requestNetworkContext(request), actorUserId: session.user.id }, "reporting.csv.imported", "success", "reporting", "csv", { rows: rows.length });
    return NextResponse.json({ ok: true, synthetic: true, ...result }, { headers });
  } catch (error) {
    if (error instanceof CsvImportError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    return NextResponse.json({ error: "The synthetic CSV import could not be completed." }, { status: 500, headers });
  }
}
