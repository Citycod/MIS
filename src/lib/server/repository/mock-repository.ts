import "server-only";
import { AuthorizedScope } from "@/types/auth";
import { GlobalFilters } from "@/types/filter";
import { KpiSummary, MonthlyMovement, PerformanceRepository, ProductInvestmentMixItem } from "@/types/repository";
import { MOCK_CUSTOMERS, MOCK_INVESTMENTS, MOCK_REGIONS, MOCK_USERS } from "@/mocks/fixtures";
import data from "@/mocks/dashboard-snapshots.json";
import { normalizeAuthorizedScope, ScopeError } from "@/lib/server/security/scope";

type Snapshot = { roIds: string[]; regionId: string; date: string; productCode: string; kpi: KpiSummary; movement: MonthlyMovement; mix: Record<"MTD" | "YTD", ProductInvestmentMixItem[]> };
const snapshots: Snapshot[] = data as Snapshot[];

// Revalidate every repository read. No totals, ratios, targets or financial formulas here.
function authorize(scope: AuthorizedScope, filters: GlobalFilters) {
  const user = MOCK_USERS[scope.userId];
  if (!user || user.role !== scope.role) throw new ScopeError("Invalid principal.");
  const effective = normalizeAuthorizedScope(user, filters).scope;
  if (effective.effectiveRegionId !== scope.effectiveRegionId ||
      effective.effectiveRoIds.some(id => !scope.effectiveRoIds.includes(id))) {
    throw new ScopeError("Requested filters exceed the authorized scope.");
  }
  return effective;
}
function select(scope: AuthorizedScope, filters: GlobalFilters, date = filters.asOfDate) {
  return snapshots.find(s => s.regionId === scope.effectiveRegionId && s.date === date &&
    s.productCode === filters.productCode && s.roIds.slice().sort().join() === scope.effectiveRoIds.slice().sort().join());
}
function emptyKpis(date: string): KpiSummary {
  return { portfolioBalance: null, portfolioTarget: null, gapToTarget: null, achievementPercentage: null,
    monthlyPaceRequired: null, activeCustomersCount: 0, totalDealsCount: 0, weightedYieldPercentage: null,
    monthlyNetMovement: null, mtdInflow: null, mtdOutflow: null, ytdInflow: null, ytdOutflow: null,
    ytdNetMovement: null, profitability: null, wacc: null, asOfDate: date, currency: "NGN",
    dataVersion: "synthetic-2026-v2", metricDefinitionVersion: "demo-unapproved-v2", availability: "no-data",
    provisional: false, paceBasis: "No snapshot available." };
}
export class MockPerformanceRepository implements PerformanceRepository {
  async getKpiSummary(scope: AuthorizedScope, filters: GlobalFilters) {
    return select(authorize(scope, filters), filters)?.kpi ?? emptyKpis(filters.asOfDate);
  }
  async getMonthlyMovement(scope: AuthorizedScope, filters: GlobalFilters) {
    const effective = authorize(scope, filters);
    if (!select(effective, filters)) return [];
    return snapshots.filter(s => s.regionId === effective.effectiveRegionId &&
      s.roIds.slice().sort().join() === effective.effectiveRoIds.slice().sort().join() &&
      s.productCode === filters.productCode && s.date.slice(0, 4) === filters.asOfDate.slice(0, 4) &&
      s.date <= filters.asOfDate && (s.date === filters.asOfDate || (!s.kpi.provisional && s.date.slice(0, 7) < filters.asOfDate.slice(0, 7))) &&
      (filters.periodMode === "YTD" || s.date.slice(0, 7) === filters.asOfDate.slice(0, 7)))
      .sort((a, b) => a.date.localeCompare(b.date)).map(s => s.movement);
  }
  async getCustomerList(scope: AuthorizedScope, filters: GlobalFilters) {
    const effective = authorize(scope, filters);
    const deals = await this.getInvestmentList(effective, filters);
    return MOCK_CUSTOMERS.filter(c => effective.effectiveRoIds.includes(c.relationshipOfficerId) &&
      (filters.productCode === "PROD-ALL" || deals.some(d => d.customerId === c.customerId)));
  }
  async getInvestmentList(scope: AuthorizedScope, filters: GlobalFilters) {
    const effective = authorize(scope, filters);
    return MOCK_INVESTMENTS.filter(i => effective.effectiveRoIds.includes(i.roId) &&
      (filters.productCode === "PROD-ALL" || i.productCode === filters.productCode) && i.effectiveDate <= filters.asOfDate);
  }
  async getRoPerformanceComparison(scope: AuthorizedScope, filters: GlobalFilters) {
    const effective = authorize(scope, filters);
    if (effective.role !== "REGIONAL_MANAGER") throw new ScopeError("Regional manager access required.");
    return effective.effectiveRoIds.flatMap(id => {
      const snapshot = select({ ...effective, effectiveRoIds: [id] }, filters);
      const user = Object.values(MOCK_USERS).find(u => u.roId === id);
      if (!snapshot || !user) return [];
      const k = snapshot.kpi;
      return [{ roId: id, roName: user.name, regionId: user.regionId,
        regionName: MOCK_REGIONS.find(r => r.id === user.regionId)!.name, branchName: user.branchName!,
        closingPosition: k.portfolioBalance, targetAmount: k.portfolioTarget, achievementPercentage: k.achievementPercentage,
        gapAmount: k.gapToTarget, requiredPaceMonthly: k.monthlyPaceRequired, monthlyNetMovement: k.monthlyNetMovement,
        wacc: k.wacc, profitability: k.profitability, customerCount: k.activeCustomersCount }];
    });
  }
  async getProductInvestmentMix(scope: AuthorizedScope, filters: GlobalFilters) {
    return select(authorize(scope, filters), filters)?.mix[filters.periodMode] ?? [];
  }
}
