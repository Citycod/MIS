import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { KpiCard } from "@/components/ui/kpi-card";
import { Target } from "lucide-react";

export default async function RegionalTargetsPage() {
  const session = await getCurrentSession();
  const repo = new MockPerformanceRepository();
  if (!session) return null;

  const kpis = await repo.getKpiSummary(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: "ALL",
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <Target className="w-5 h-5 text-[#CF2E2E]" />
          Regional Aggregate Targets & Required Pace
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Regional target totals and aggregate monthly required pace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Regional Position Target"
          value={kpis.portfolioTarget}
          subtitle="Sum of annual targets for officers in region"
        />
        <KpiCard
          title="Regional Gap Amount"
          value={kpis.gapToTarget}
          subtitle="Net growth required across region"
          highlightColor="warning"
        />
        <KpiCard
          title="Regional Required Pace"
          value={kpis.monthlyPaceRequired}
          subtitle="Required net monthly movement for region"
          highlightColor="positive"
        />
      </div>
    </div>
  );
}
