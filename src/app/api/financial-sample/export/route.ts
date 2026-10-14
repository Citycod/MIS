import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getMisDataMode } from "@/lib/server/repository/data-mode";
import { getProductDisplayName } from "@/lib/server/repository/data-catalog";
import { mapFinancialSampleScope } from "@/lib/server/financial-sample/scope";
import { getCurrentSession } from "@/lib/server/security/auth";
import { FilterError, normalizeAuthorizedScope, ScopeError } from "@/lib/server/security/scope";
import type { GlobalFilters } from "@/types/filter";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const CUTOFF = "2026-10-10";

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  try {
    const params = request.nextUrl.searchParams;
    const context = normalizeAuthorizedScope(session.user, {
      regionId: session.scope.effectiveRegionId,
      roId: params.get("roId") ?? (session.user.role === "RO" ? session.user.roId : "ALL"),
      startDate: params.get("startDate") ?? "2026-01-01",
      asOfDate: CUTOFF,
      productCode: params.get("productCode") ?? "PROD-ALL",
      periodMode: "YTD",
      roleView: "portfolio-overview",
    } satisfies Partial<GlobalFilters>);
    const mapped = mapFinancialSampleScope(context.scope, getMisDataMode() === "demo-v2");
    const databasePath = path.join(process.cwd(), ".local", "mis-financial-sample", "reporting.sqlite");
    const database = new DatabaseSync(databasePath, { readOnly: true });
    let rows: Record<string, unknown>[];
    try {
      database.exec("PRAGMA query_only = ON");
      const roPlaceholders = mapped.roIds.map(() => "?").join(",");
      const queryParams: unknown[] = [
        mapped.regionId,
        ...mapped.roIds,
        context.filters.startDate!,
        CUTOFF,
      ];
      let productClause = "";
      if (context.filters.productCode !== "PROD-ALL") {
        const product = getProductDisplayName(context.filters.productCode);
        if (!product) throw new ScopeError("Product is outside the authorized reporting catalog.");
        productClause = " AND product = ?";
        queryParams.push(product);
      }
      rows = database.prepare(`
        SELECT event_id, event_date, reporting_month, region_id, region_name,
          ro_id, ro_name, customer_id, customer_name, product, source_product,
          mapping_status, event_type, transaction_amount_ngn, calculation_base_ngn,
          customer_rate_pct, pool_rate_pct, tenor_days,
          date(event_date, '+' || tenor_days || ' days') AS calculated_maturity_date,
          source_maturity_date, signed_movement_ngn, new_external_inflow_ngn,
          withdrawal_ngn, maturity_outflow_ngn, rollover_volume_ngn,
          record_origin, data_classification, reporting_cutoff
        FROM v_financial_events_as_of
        WHERE region_id = ? AND ro_id IN (${roPlaceholders})
          AND event_date BETWEEN ? AND ?${productClause}
        ORDER BY event_date, event_id
      `).all(...queryParams);
    } finally {
      database.close();
    }
    const columns = [
      "event_id", "event_date", "reporting_month", "region_id", "region_name", "ro_id", "ro_name",
      "customer_id", "customer_name", "product", "source_product", "mapping_status", "event_type",
      "transaction_amount_ngn", "calculation_base_ngn", "customer_rate_pct", "pool_rate_pct", "tenor_days",
      "calculated_maturity_date", "source_maturity_date", "signed_movement_ngn", "new_external_inflow_ngn",
      "withdrawal_ngn", "maturity_outflow_ngn", "rollover_volume_ngn", "record_origin",
      "data_classification", "reporting_cutoff",
    ];
    const body = [columns.map(csvCell).join(","), ...rows.map(row => columns.map(column => csvCell(row[column])).join(","))].join("\r\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mis-financial-sample-${CUTOFF}.csv"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) return NextResponse.json({ error: error.message }, { status: 403, headers });
    if (error instanceof FilterError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    return NextResponse.json({ error: "Financial sample export is unavailable." }, { status: 503, headers });
  }
}
