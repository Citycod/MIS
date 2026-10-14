import { getCurrentSession } from "@/lib/server/security/auth";
import { getPerformanceRepository } from "@/lib/server/repository/repository-factory";
import { KpiCard } from "@/components/ui/kpi-card";
import { Target } from "lucide-react";
import { FinancialSampleSection } from "@/components/financial-sample/financial-sample-section";
import type { SearchParams } from "@/lib/filters";

export default async function RoTargetsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  if (raw.source !== "built-in") return <FinancialSampleSection raw={raw} regional={false} dashboardKey="financial_sample_targets" title="Targets and Required Run Rate" description="My current position, assumed annual target, achievement, gap, and required monthly and daily pace." />;
  const session = await getCurrentSession();
  const repo = getPerformanceRepository();
  if (!session) return null;

  const kpis = await repo.getKpiSummary(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: session.scope.effectiveRoIds[0],
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <Target className="w-5 h-5 text-[#CF2E2E]" />
          My Targets & Required Pace
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Annual portfolio target, current achievement percentage, gap, and monthly required pace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Annual Position Target"
          value={kpis.portfolioTarget}
          subtitle="Assigned annual portfolio balance target"
        />
        <KpiCard
          title="Current Position Gap"
          value={kpis.gapToTarget}
          subtitle="Remaining balance growth required to achieve 100%"
          highlightColor="warning"
        />
        <KpiCard
          title="Required Monthly Pace"
          value={kpis.monthlyPaceRequired}
          subtitle="Net growth required per remaining month in fiscal year"
          highlightColor="positive"
        />
      </div>
    </div>
  );
}
