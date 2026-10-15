import "server-only";

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { Session } from "@/types/auth";
import { getMisDataMode } from "@/lib/server/repository/data-mode";
import { mapFinancialSampleScope } from "@/lib/server/financial-sample/scope";
import { normalizeAuthorizedScope, ScopeError } from "@/lib/server/security/scope";
import type { MprInflowRow, MprProductRow, MprProfitabilityRow, MprReportData, MprTeamRow } from "./types";

export class MprReportError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

type SqlRow = Record<string, string | number | null>;

function databasePath() {
  return path.join(process.cwd(), ".local", "mis-financial-sample", "reporting.sqlite");
}

function placeholders(values: readonly unknown[]) {
  if (!values.length) throw new ScopeError("No authorized Relationship Officers are available for this report.");
  return values.map(() => "?").join(",");
}

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new MprReportError("A required financial measure is unavailable.", 409);
  return value;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapTeamRow(row: SqlRow): MprTeamRow {
  return {
    teamId: String(row.team_id), teamName: String(row.team_name), roId: String(row.ro_id), roName: String(row.ro_name),
    newTargetNgn: number(row.new_target_ngn), balanceSheetNgn: number(row.balance_sheet_ngn),
    gapToMeetNgn: number(row.gap_to_meet_ngn), achievementPct: nullableNumber(row.achievement_pct),
    remainingFullMonths: number(row.remaining_full_months),
    requiredMonthlyRunRateNgn: nullableNumber(row.required_monthly_run_rate_ngn),
    targetSource: String(row.target_source), positionSource: String(row.position_source),
    targetDefinition: String(row.target_definition), positionAsOfDate: String(row.position_as_of_date),
    dataClassification: String(row.data_classification),
  };
}

function assertReconciled(rows: MprTeamRow[], totals: MprTeamRow) {
  const tolerance = 0.01;
  const sum = (key: "newTargetNgn" | "balanceSheetNgn" | "gapToMeetNgn") => rows.reduce((total, row) => total + row[key], 0);
  if (Math.abs(sum("newTargetNgn") - totals.newTargetNgn) > tolerance
    || Math.abs(sum("balanceSheetNgn") - totals.balanceSheetNgn) > tolerance
    || Math.abs(sum("gapToMeetNgn") - totals.gapToMeetNgn) > tolerance) {
    throw new MprReportError("Team totals do not reconcile to the authorized officer rows.", 409);
  }
  for (const row of rows) {
    if (Math.abs((row.newTargetNgn - row.balanceSheetNgn) - row.gapToMeetNgn) > tolerance) {
      throw new MprReportError(`Gap reconciliation failed for ${row.roName}.`, 409);
    }
    if (row.remainingFullMonths > 0 && row.requiredMonthlyRunRateNgn !== null
      && Math.abs(row.gapToMeetNgn / row.remainingFullMonths - row.requiredMonthlyRunRateNgn) > tolerance) {
      throw new MprReportError(`Monthly run-rate reconciliation failed for ${row.roName}.`, 409);
    }
  }
}

export function resolveMprScope(session: Session, requestedTeamId: string) {
  if (!requestedTeamId || requestedTeamId !== session.scope.effectiveRegionId) {
    throw new ScopeError("The selected team is outside your authorized scope.");
  }
  const authorized = normalizeAuthorizedScope(session.user, {
    regionId: session.scope.effectiveRegionId,
    roId: session.user.role === "RO" ? session.user.roId : "ALL",
    asOfDate: "2026-10-10", startDate: "2026-01-01", productCode: "PROD-ALL", periodMode: "YTD",
  }).scope;
  return mapFinancialSampleScope(authorized, getMisDataMode() === "demo-v2");
}

export function getMprReportData(session: Session, requestedTeamId: string, requestedCutoff: string): MprReportData {
  const scope = resolveMprScope(session, requestedTeamId);
  const database = new DatabaseSync(databasePath(), { readOnly: true });
  try {
    database.exec("PRAGMA query_only = ON");
    const settings = database.prepare(`SELECT reporting_cutoff, active_source_sha256, mapping_version
      FROM financial_reporting_settings WHERE settings_id = 1`).get() as SqlRow | undefined;
    if (!settings) throw new MprReportError("Financial reporting settings are unavailable.", 503);
    const cutoff = String(settings.reporting_cutoff);
    if (requestedCutoff !== cutoff) {
      throw new MprReportError(`This reporting source currently supports the ${cutoff} cutoff only.`, 400);
    }
    const roSql = placeholders(scope.roIds);
    const rawRows = database.prepare(`SELECT * FROM v_mpr_team_summary
      WHERE team_id = ? AND ro_id IN (${roSql}) ORDER BY ro_name`).all(scope.regionId, ...scope.roIds) as SqlRow[];
    if (!rawRows.length) throw new MprReportError("No authorized Team Summary data is available.", 404);
    const rows = rawRows.map(mapTeamRow);

    const totalRaw = database.prepare(`SELECT
        team_id, MAX(team_name) team_name, 'TEAM-TOTAL' ro_id, 'Team Total' ro_name,
        SUM(new_target_ngn) new_target_ngn, SUM(balance_sheet_ngn) balance_sheet_ngn,
        SUM(gap_to_meet_ngn) gap_to_meet_ngn,
        CASE WHEN SUM(new_target_ngn) = 0 THEN NULL ELSE SUM(balance_sheet_ngn) / SUM(new_target_ngn) * 100.0 END achievement_pct,
        CASE WHEN MIN(remaining_full_months) = MAX(remaining_full_months) THEN MIN(remaining_full_months) ELSE NULL END remaining_full_months,
        CASE WHEN MIN(remaining_full_months) = MAX(remaining_full_months) AND MIN(remaining_full_months) > 0
          THEN SUM(gap_to_meet_ngn) / MIN(remaining_full_months) ELSE NULL END required_monthly_run_rate_ngn,
        group_concat(DISTINCT target_source) target_source,
        group_concat(DISTINCT position_source) position_source,
        group_concat(DISTINCT target_definition) target_definition,
        MAX(position_as_of_date) position_as_of_date,
        group_concat(DISTINCT data_classification) data_classification
      FROM v_mpr_team_summary WHERE team_id = ? AND ro_id IN (${roSql})`).get(scope.regionId, ...scope.roIds) as SqlRow;
    const totals = mapTeamRow(totalRaw);
    assertReconciled(rows, totals);

    const profitRaw = database.prepare(`SELECT ro_id, MAX(ro_name) ro_name,
        SUM(interest_income_ngn) interest_income_ngn, SUM(interest_expense_ngn) interest_expense_ngn,
        SUM(illustrative_wht_ngn) wht_ngn, SUM(illustrative_management_margin_ngn) margin_ngn,
        SUM(illustrative_opex_ngn) opex_ngn, SUM(illustrative_final_profitability_ngn) profitability_ngn,
        MAX(profitability_status) status
      FROM v_financial_monthly_profitability
      WHERE region_id = ? AND ro_id IN (${roSql}) AND reporting_month <= date(substr(?, 1, 7) || '-01')
      GROUP BY ro_id ORDER BY ro_name`).all(scope.regionId, ...scope.roIds, cutoff) as SqlRow[];
    const profitability: MprProfitabilityRow[] = profitRaw.map(row => ({
      roId: String(row.ro_id), roName: String(row.ro_name), interestIncomeNgn: number(row.interest_income_ngn),
      interestExpenseNgn: number(row.interest_expense_ngn), whtNgn: number(row.wht_ngn), marginNgn: number(row.margin_ngn),
      opexNgn: number(row.opex_ngn), profitabilityNgn: number(row.profitability_ngn), status: String(row.status),
    }));

    const usesImportedPositions = rows.every(row => row.positionSource === "SYMPLUS_MANUAL_IMPORT");
    let productRaw: SqlRow[];
    if (usesImportedPositions) {
      productRaw = database.prepare(`WITH latest AS (
          SELECT team_id, ro_id, MAX(position_as_of_date) position_as_of_date
          FROM mpr_symplus_positions WHERE team_id = ? AND ro_id IN (${roSql}) AND position_as_of_date <= ?
          GROUP BY team_id, ro_id
        )
        SELECT p.product, SUM(p.balance_sheet_position_ngn) position_ngn
        FROM mpr_symplus_positions p JOIN latest l ON l.team_id=p.team_id AND l.ro_id=p.ro_id AND l.position_as_of_date=p.position_as_of_date
        GROUP BY p.product ORDER BY position_ngn DESC`).all(scope.regionId, ...scope.roIds, cutoff) as SqlRow[];
    } else {
      productRaw = database.prepare(`SELECT COALESCE(product, source_product) product, SUM(current_position_ngn) position_ngn
        FROM v_financial_current_position WHERE region_id = ? AND ro_id IN (${roSql})
        GROUP BY COALESCE(product, source_product) ORDER BY position_ngn DESC`).all(scope.regionId, ...scope.roIds) as SqlRow[];
    }
    const products: MprProductRow[] = productRaw.map(row => ({ product: String(row.product), positionNgn: number(row.position_ngn) }));
    const inflowRaw = database.prepare(`SELECT reporting_month month, SUM(inflow_ngn) inflow_ngn
      FROM v_financial_monthly_movement WHERE region_id = ? AND ro_id IN (${roSql}) AND reporting_month <= date(substr(?,1,7)||'-01')
      GROUP BY reporting_month ORDER BY reporting_month`).all(scope.regionId, ...scope.roIds, cutoff) as SqlRow[];
    const inflows: MprInflowRow[] = inflowRaw.map(row => ({ month: String(row.month), inflowNgn: number(row.inflow_ngn) }));

    const synthetic = rows.some(row => row.dataClassification.includes("SYNTHETIC"));
    return {
      teamId: requestedTeamId, teamName: rows[0].teamName, reportingCutoff: cutoff,
      reportingMonth: cutoff.slice(0, 7), generatedAt: new Date().toISOString(), generatedBy: session.user.id,
      scopeLabel: session.user.role === "RO" ? "Relationship Officer portfolio" : "Authorized regional team",
      rows, totals: { ...totals, roName: "Team Total" }, profitability, products, inflows,
      accountOpeningAvailable: false,
      accountOpeningMessage: "No approved account-opening dataset is connected. Current and previous YTD figures are unavailable and were not fabricated.",
      synthetic,
      sourceVersions: [
        `Financial event source ${String(settings.active_source_sha256).slice(0, 12)}`,
        `Product mapping ${String(settings.mapping_version)}`,
        ...new Set(rows.flatMap(row => [row.targetSource, row.positionSource])),
      ],
      methodology: [
        "Gap to Meet = New Target - Balance Sheet. The signed value is preserved.",
        "Run Rate = Gap to Meet / remaining full months after the reporting month.",
        "October 2026 is partial; the convention excludes October and counts November through December.",
        "Illustrative WHT, OPEX, management margin and final profitability remain subject to Finance approval.",
      ],
    };
  } finally {
    database.close();
  }
}
