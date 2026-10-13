import "server-only";
import { DatabaseSync } from "node:sqlite";
import type { AuthorizedScope } from "@/types/auth";
import type { GlobalFilters } from "@/types/filter";
import type {
  KpiSummary,
  MonthlyMovement,
  PerformanceRepository,
  ProductInvestmentMixItem,
  RoPerformanceItem,
} from "@/types/repository";
import { getDemoV2DatabasePath } from "./data-mode";
import { getActiveDataCatalog, getProductName } from "./data-catalog";
import { revalidateAuthorizedScope, ScopeError } from "@/lib/server/security/scope";

type Row = Record<string, unknown>;
const DEMO_V2_AS_OF_DATE = "2026-10-10";
const decimal = (value: unknown): string | null => value === null || value === undefined ? null : String(value);
const count = (value: unknown): number => Number(value || 0);

function emptyKpis(date: string): KpiSummary {
  return {
    portfolioBalance: null, portfolioTarget: null, gapToTarget: null, achievementPercentage: null,
    monthlyPaceRequired: null, activeCustomersCount: 0, totalDealsCount: 0, weightedYieldPercentage: null,
    monthlyNetMovement: null, mtdInflow: null, mtdOutflow: null, ytdInflow: null, ytdOutflow: null,
    ytdNetMovement: null, profitability: null, wacc: null, asOfDate: date, currency: "NGN",
    dataVersion: "synthetic-demo-v2.1", metricDefinitionVersion: "demo-reporting-views-v2.1",
    availability: "no-data", provisional: false, paceBasis: "Pending Finance Definition",
  };
}

export class DemoV2PerformanceRepository implements PerformanceRepository {
  private withDatabase<T>(read: (db: DatabaseSync) => T): T {
    const db = new DatabaseSync(getDemoV2DatabasePath(), { readOnly: true });
    try {
      db.exec("PRAGMA query_only = ON");
      return read(db);
    } finally {
      db.close();
    }
  }

  private all(db: DatabaseSync, sql: string, params: unknown[] = []): Row[] {
    return db.prepare(sql).all(...params);
  }

  private one(db: DatabaseSync, sql: string, params: unknown[] = []): Row | undefined {
    return db.prepare(sql).get(...params);
  }

  private authorize(scope: AuthorizedScope, filters: GlobalFilters) {
    return revalidateAuthorizedScope(scope, filters);
  }

  private roClause(scope: AuthorizedScope) {
    return { sql: `ro_id IN (${scope.effectiveRoIds.map(() => "?").join(",")})`, params: scope.effectiveRoIds };
  }

  private isSupportedDate(db: DatabaseSync, asOfDate: string): boolean {
    const month = `${asOfDate.slice(0, 7)}-01`;
    const latest = this.one(db, "SELECT MAX(reporting_month) AS month FROM v_demo_events");
    if (!latest?.month) return false;
    if (month === latest.month) return asOfDate === DEMO_V2_AS_OF_DATE;
    const exists = this.one(db, "SELECT 1 AS ok FROM v_demo_monthly_ro_position WHERE reporting_month = ? LIMIT 1", [month]);
    if (!exists) return false;
    const date = new Date(`${month}T00:00:00Z`);
    const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    return asOfDate === monthEnd;
  }

  private productCondition(filters: GlobalFilters, alias = "") {
    if (filters.productCode === "PROD-ALL") return { sql: "", params: [] as unknown[] };
    const name = getProductName(filters.productCode);
    if (!name) throw new ScopeError("Unknown product mapping.");
    return { sql: ` AND ${alias}product = ?`, params: [name] as unknown[] };
  }

  async getKpiSummary(scope: AuthorizedScope, filters: GlobalFilters): Promise<KpiSummary> {
    const effective = this.authorize(scope, filters);
    return this.withDatabase(db => {
      if (!this.isSupportedDate(db, filters.asOfDate)) return emptyKpis(filters.asOfDate);
      const month = `${filters.asOfDate.slice(0, 7)}-01`;
      const ro = this.roClause(effective);
      const product = this.productCondition(filters);
      const positionView = filters.productCode === "PROD-ALL" ? "v_demo_monthly_ro_position" : "v_demo_monthly_ro_product_movement";
      const position = this.one(db, `
        SELECT COUNT(*) AS rows,
          printf('%.2f', SUM(closing_position_ngn)) AS balance,
          printf('%.2f', SUM(net_external_movement_ngn)) AS monthly_net
          ${filters.productCode === "PROD-ALL" ? ", printf('%.2f', SUM(annual_portfolio_target_ngn)) AS target, printf('%.2f', SUM(remaining_gap_ngn)) AS gap, CASE WHEN COUNT(*) = 1 THEN printf('%.2f', MAX(achievement_pct)) ELSE NULL END AS achievement" : ""}
        FROM ${positionView}
        WHERE reporting_month = ? AND region_id = ? AND ${ro.sql}${product.sql}
      `, [month, effective.effectiveRegionId, ...ro.params, ...product.params]);
      if (!position || count(position.rows) === 0) return emptyKpis(filters.asOfDate);

      const eventProduct = this.productCondition(filters);
      const flows = this.one(db, `
        SELECT
          printf('%.2f', COALESCE(SUM(CASE WHEN reporting_month = ? THEN external_inflow_ngn ELSE 0 END), 0)) AS mtd_inflow,
          printf('%.2f', COALESCE(SUM(CASE WHEN reporting_month = ? THEN withdrawal_ngn ELSE 0 END), 0)) AS mtd_outflow,
          printf('%.2f', COALESCE(SUM(external_inflow_ngn), 0)) AS ytd_inflow,
          printf('%.2f', COALESCE(SUM(withdrawal_ngn), 0)) AS ytd_outflow,
          printf('%.2f', COALESCE(SUM(signed_external_movement_ngn), 0)) AS ytd_net,
          COUNT(*) AS deals, COUNT(DISTINCT customer_id) AS customers
        FROM v_demo_events
        WHERE event_date BETWEEN ? AND ? AND region_id = ? AND ${ro.sql}${eventProduct.sql}
      `, [month, month, `${filters.asOfDate.slice(0, 4)}-01-01`, filters.asOfDate, effective.effectiveRegionId, ...ro.params, ...eventProduct.params]);
      return {
        portfolioBalance: decimal(position.balance),
        portfolioTarget: filters.productCode === "PROD-ALL" ? decimal(position.target) : null,
        gapToTarget: filters.productCode === "PROD-ALL" ? decimal(position.gap) : null,
        achievementPercentage: filters.productCode === "PROD-ALL" ? decimal(position.achievement) : null,
        monthlyPaceRequired: null,
        activeCustomersCount: count(flows?.customers),
        totalDealsCount: count(flows?.deals),
        weightedYieldPercentage: null,
        monthlyNetMovement: decimal(position.monthly_net),
        mtdInflow: decimal(flows?.mtd_inflow), mtdOutflow: decimal(flows?.mtd_outflow),
        ytdInflow: decimal(flows?.ytd_inflow), ytdOutflow: decimal(flows?.ytd_outflow), ytdNetMovement: decimal(flows?.ytd_net),
        profitability: null, wacc: null, asOfDate: filters.asOfDate, currency: "NGN",
        dataVersion: "synthetic-demo-v2.1", metricDefinitionVersion: "demo-reporting-views-v2.1",
        availability: "available", provisional: month === "2026-10-01",
        paceBasis: "Pending Finance Definition",
      };
    });
  }

  async getMonthlyMovement(scope: AuthorizedScope, filters: GlobalFilters): Promise<MonthlyMovement[]> {
    const effective = this.authorize(scope, filters);
    return this.withDatabase(db => {
      if (!this.isSupportedDate(db, filters.asOfDate)) return [];
      const month = `${filters.asOfDate.slice(0, 7)}-01`;
      const start = filters.periodMode === "MTD" ? month : `${filters.asOfDate.slice(0, 4)}-01-01`;
      const ro = this.roClause(effective);
      const product = this.productCondition(filters);
      const view = filters.productCode === "PROD-ALL" ? "v_demo_monthly_ro_position" : "v_demo_monthly_ro_product_movement";
      return this.all(db, `
        SELECT reporting_month,
          printf('%.2f', SUM(opening_position_ngn)) AS opening_position,
          printf('%.2f', SUM(external_inflows_ngn)) AS inflows,
          printf('%.2f', SUM(withdrawals_ngn)) AS withdrawals,
          printf('%.2f', SUM(net_external_movement_ngn)) AS net_movement,
          printf('%.2f', SUM(closing_position_ngn)) AS closing_position
        FROM ${view}
        WHERE reporting_month BETWEEN ? AND ? AND region_id = ? AND ${ro.sql}${product.sql}
        GROUP BY reporting_month ORDER BY reporting_month
      `, [start, month, effective.effectiveRegionId, ...ro.params, ...product.params]).map(row => ({
        month: String(row.reporting_month).slice(0, 7),
        openingPosition: String(row.opening_position), externalInflows: String(row.inflows),
        outflowsLiquidations: String(row.withdrawals), netMovement: String(row.net_movement),
        closingPosition: String(row.closing_position), targetPosition: null, paceRequired: null,
      }));
    });
  }

  async getCustomerList(scope: AuthorizedScope, filters: GlobalFilters) {
    this.authorize(scope, filters);
    return [];
  }

  async getInvestmentList(scope: AuthorizedScope, filters: GlobalFilters) {
    this.authorize(scope, filters);
    return [];
  }

  async getRoPerformanceComparison(scope: AuthorizedScope, filters: GlobalFilters): Promise<RoPerformanceItem[]> {
    const effective = this.authorize(scope, filters);
    if (effective.role !== "REGIONAL_MANAGER") throw new ScopeError("Regional manager access required.");
    return this.withDatabase(db => {
      if (!this.isSupportedDate(db, filters.asOfDate)) return [];
      const month = `${filters.asOfDate.slice(0, 7)}-01`;
      const ro = this.roClause(effective);
      const product = this.productCondition(filters);
      const view = filters.productCode === "PROD-ALL" ? "v_demo_monthly_ro_position" : "v_demo_monthly_ro_product_movement";
      const rows = this.all(db, `
        SELECT ro_id, MAX(ro_name) AS ro_name, MAX(region) AS region_name,
          printf('%.2f', SUM(closing_position_ngn)) AS closing_position,
          printf('%.2f', SUM(net_external_movement_ngn)) AS monthly_net
          ${filters.productCode === "PROD-ALL" ? ", printf('%.2f', MAX(annual_portfolio_target_ngn)) AS target, printf('%.2f', MAX(achievement_pct)) AS achievement, printf('%.2f', MAX(remaining_gap_ngn)) AS gap" : ""}
        FROM ${view}
        WHERE reporting_month = ? AND region_id = ? AND ${ro.sql}${product.sql}
        GROUP BY ro_id ORDER BY ro_id
      `, [month, effective.effectiveRegionId, ...ro.params, ...product.params]);
      const customers = new Map(this.all(db, `
        SELECT ro_id, COUNT(DISTINCT customer_id) AS customer_count FROM v_demo_events
        WHERE event_date BETWEEN ? AND ? AND region_id = ? AND ${ro.sql}${this.productCondition(filters).sql}
        GROUP BY ro_id
      `, [`${filters.asOfDate.slice(0, 4)}-01-01`, filters.asOfDate, effective.effectiveRegionId, ...ro.params, ...this.productCondition(filters).params])
        .map(row => [String(row.ro_id), count(row.customer_count)]));
      return rows.map(row => ({
        roId: String(row.ro_id), roName: String(row.ro_name), regionId: effective.effectiveRegionId,
        regionName: String(row.region_name), branchName: "Synthetic demo",
        closingPosition: decimal(row.closing_position), targetAmount: decimal(row.target),
        achievementPercentage: decimal(row.achievement), gapAmount: decimal(row.gap),
        requiredPaceMonthly: null, monthlyNetMovement: decimal(row.monthly_net), wacc: null,
        profitability: null, customerCount: customers.get(String(row.ro_id)) || 0,
      }));
    });
  }

  async getProductInvestmentMix(scope: AuthorizedScope, filters: GlobalFilters): Promise<ProductInvestmentMixItem[]> {
    const effective = this.authorize(scope, filters);
    return this.withDatabase(db => {
      if (!this.isSupportedDate(db, filters.asOfDate)) return [];
      const month = `${filters.asOfDate.slice(0, 7)}-01`;
      const start = filters.periodMode === "MTD" ? month : `${filters.asOfDate.slice(0, 4)}-01-01`;
      const ro = this.roClause(effective);
      const product = this.productCondition(filters);
      return this.all(db, `
        WITH mix AS (
          SELECT product, SUM(eligible_inflow_ngn) AS amount
          FROM v_demo_investment_mix
          WHERE reporting_month BETWEEN ? AND ? AND region_id = ? AND ${ro.sql}${product.sql}
          GROUP BY product
        ), totals AS (SELECT SUM(amount) AS denominator FROM mix)
        SELECT product, printf('%.2f', amount) AS amount, printf('%.2f', denominator) AS denominator,
          printf('%.2f', CASE WHEN denominator > 0 THEN 100.0 * amount / denominator ELSE 0 END) AS percentage
        FROM mix CROSS JOIN totals WHERE amount > 0 ORDER BY amount DESC, product
      `, [start, month, effective.effectiveRegionId, ...ro.params, ...product.params]).map(row => {
        const productEntry = getActiveDataCatalog().products.find(item => item.name === row.product);
        return {
          productCode: productEntry?.code || String(row.product), productName: String(row.product),
          allocatedAmount: String(row.amount), percentageShare: String(row.percentage), denominatorAmount: String(row.denominator),
        };
      });
    });
  }
}
