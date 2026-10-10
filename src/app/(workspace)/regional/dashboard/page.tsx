import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { KpiCard } from "@/components/ui/kpi-card";
import { SupersetDashboardPlaceholder } from "@/components/superset/superset-dashboard-placeholder";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Building2, UserCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function RegionalDashboardPage() {
  const session = await getCurrentSession();
  const repo = new MockPerformanceRepository();

  if (!session) return null;

  const kpis = await repo.getKpiSummary(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: session.scope.effectiveRoIds[0] || "ALL",
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  const roComparison = await repo.getRoPerformanceComparison(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: "ALL",
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B] tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#CF2E2E]" />
            Regional Manager Executive Performance Dashboard
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Regional portfolio aggregation, Relationship Officer ranking, target gap analysis, and movement pace.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#FFF1EE] border border-[#CF2E2E]/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#CF2E2E]">
          <ShieldCheck className="w-4 h-4" />
          <span>Authorized Scope: {session.scope.effectiveRegionId}</span>
        </div>
      </div>

      {/* Regional Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Regional Portfolio Position"
          value={kpis.portfolioBalance}
          target={kpis.portfolioTarget}
          gap={kpis.gapToTarget}
          achievementPercentage={kpis.achievementPercentage}
          subtitle="Aggregate active balance across assigned ROs"
        />
        <KpiCard
          title="Regional Monthly Pace"
          value={kpis.monthlyPaceRequired}
          subtitle="Required net movement per month across region"
          highlightColor="positive"
        />
        <KpiCard
          title="Assigned Officers Count"
          value={roComparison.length}
          type="number"
          subtitle="Relationship Officers under supervision"
        />
        <KpiCard
          title="Regional Weighted Yield"
          value={kpis.weightedYieldPercentage}
          type="percent"
          subtitle="Weighted interest yield across all region placements"
        />
      </div>

      {/* Relationship Officer Performance Comparison Table */}
      <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#24252B] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#CF2E2E]" />
              Relationship Officer Performance Directory & Comparison
            </h3>
            <p className="text-xs text-[#667085]">
              Ranked position, annual target, gap, and required monthly pace for assigned officers.
            </p>
          </div>
          <Link
            href="/regional/relationship-officers"
            className="text-xs font-bold text-[#CF2E2E] hover:underline"
          >
            View Full RO Directory →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E4E7EC] text-[#667085] font-bold uppercase tracking-wider">
                <th className="p-3">RO Name</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Closing Position</th>
                <th className="p-3 text-right">Annual Target</th>
                <th className="p-3 text-right">Achievement (%)</th>
                <th className="p-3 text-right">Gap Amount</th>
                <th className="p-3 text-right">Required Monthly Pace</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC] text-[#24252B]">
              {roComparison.map((ro) => (
                <tr key={ro.roId} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="p-3 font-bold text-[#24252B]">
                    <div>{ro.roName}</div>
                    <span className="text-[10px] text-[#667085] font-mono">{ro.roId}</span>
                  </td>
                  <td className="p-3 text-[#667085]">{ro.branchName}</td>
                  <td className="p-3 text-right font-extrabold tabular-nums">
                    {formatCurrency(ro.closingPosition)}
                  </td>
                  <td className="p-3 text-right font-semibold text-[#667085] tabular-nums">
                    {formatCurrency(ro.targetAmount)}
                  </td>
                  <td className="p-3 text-right font-bold text-[#CF2E2E]">
                    {formatPercent(ro.achievementPercentage)}
                  </td>
                  <td className="p-3 text-right font-semibold text-[#B42318] tabular-nums">
                    {formatCurrency(ro.gapAmount)}
                  </td>
                  <td className="p-3 text-right font-bold text-[#16794A] tabular-nums">
                    {formatCurrency(ro.requiredPaceMonthly)}
                  </td>
                  <td className="p-3 text-center">
                    <Link
                      href={`/regional/relationship-officers/${ro.roId}`}
                      className="px-2.5 py-1 bg-[#FFF1EE] text-[#CF2E2E] rounded font-bold hover:bg-[#CF2E2E] hover:text-white transition-colors"
                    >
                      Drilldown
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytical Visuals Grid (Superset Embedded Visuals) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SupersetDashboardPlaceholder
            config={{
              id: "superset-regional-movement-01",
              title: "Regional Monthly Movement Trend (Aggregate Region Ledger)",
              metricType: "portfolio-movement",
            }}
          />
        </div>
        <div className="lg:col-span-4">
          <SupersetDashboardPlaceholder
            config={{
              id: "superset-regional-product-mix-01",
              title: "Regional Product Investment Composition",
              metricType: "product-mix",
            }}
          />
        </div>
      </div>
    </div>
  );
}
