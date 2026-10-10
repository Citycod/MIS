import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { KpiCard } from "@/components/ui/kpi-card";
import { SupersetDashboardPlaceholder } from "@/components/superset/superset-dashboard-placeholder";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShieldCheck, TrendingUp, Layers } from "lucide-react";

export default async function RoDashboardPage() {
  const session = await getCurrentSession();
  const repo = new MockPerformanceRepository();

  if (!session) return null;

  const kpis = await repo.getKpiSummary(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: session.scope.effectiveRoIds[0],
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  const investments = await repo.getInvestmentList(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: session.scope.effectiveRoIds[0],
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B] tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-[#CF2E2E]" />
            Relationship Officer Performance Dashboard
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Personal portfolio position, target achievement, monthly movement, and active deals.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#FFF1EE] border border-[#CF2E2E]/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#CF2E2E]">
          <ShieldCheck className="w-4 h-4" />
          <span>Scope: {session.user.name} ({session.user.roId})</span>
        </div>
      </div>

      {/* KPI Card Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Current Portfolio Position"
          value={kpis.portfolioBalance}
          target={kpis.portfolioTarget}
          gap={kpis.gapToTarget}
          achievementPercentage={kpis.achievementPercentage}
          subtitle={`As of ${formatDate(kpis.asOfDate)}`}
        />
        <KpiCard
          title="Required Monthly Pace"
          value={kpis.monthlyPaceRequired}
          subtitle="Monthly net inflow needed to hit annual target"
          highlightColor="positive"
        />
        <KpiCard
          title="Active Relationship Customers"
          value={kpis.activeCustomersCount}
          type="number"
          subtitle="Assigned high-net-worth & corporate accounts"
        />
        <KpiCard
          title="Weighted Portfolio Yield"
          value={kpis.weightedYieldPercentage}
          type="percent"
          subtitle="Average annual interest yield across active deals"
        />
      </div>

      {/* Analytical Visuals Grid (Superset Embedded Visuals) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SupersetDashboardPlaceholder
            config={{
              id: "superset-ro-monthly-movement-01",
              title: "Monthly Portfolio Movement (Opening, Inflows, Liquidations, Net)",
              metricType: "portfolio-movement",
            }}
          />
        </div>
        <div className="lg:col-span-4">
          <SupersetDashboardPlaceholder
            config={{
              id: "superset-ro-product-mix-01",
              title: "Product Investment Mix (MTD / YTD Share)",
              metricType: "product-mix",
            }}
          />
        </div>
      </div>

      {/* Active Investment Deals Table */}
      <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3 mb-4">
          <h3 className="font-bold text-sm text-[#24252B] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#CF2E2E]" />
            Active Investment Deals & Placements
          </h3>
          <span className="text-xs text-[#667085]">{investments.length} Active Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E4E7EC] text-[#667085] font-bold uppercase tracking-wider">
                <th className="p-3">Deal ID</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Product</th>
                <th className="p-3 text-right">Principal Amount</th>
                <th className="p-3 text-right">Rate (%)</th>
                <th className="p-3">Maturity Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC] text-[#24252B]">
              {investments.map((inv) => (
                <tr key={inv.investmentId} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="p-3 font-mono font-semibold text-[#CF2E2E]">{inv.investmentId}</td>
                  <td className="p-3 font-semibold">{inv.customerName}</td>
                  <td className="p-3">{inv.productName}</td>
                  <td className="p-3 text-right font-extrabold tabular-nums">
                    {formatCurrency(inv.principalAmount)}
                  </td>
                  <td className="p-3 text-right font-bold text-[#16794A]">{inv.interestRatePercentage}%</td>
                  <td className="p-3 text-[#667085]">{formatDate(inv.maturityDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LayoutDashboard(props: React.SVGProps<SVGSVGElement>) {
  return <TrendingUp {...props} />;
}
