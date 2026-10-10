import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { formatCurrency } from "@/lib/utils";
import { Layers } from "lucide-react";

export default async function RegionalPortfolioPage() {
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
          <Layers className="w-5 h-5 text-[#CF2E2E]" />
          Regional Portfolio Breakdown
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Aggregated regional balance: <strong className="text-[#24252B]">{formatCurrency(kpis.portfolioBalance)}</strong>
        </p>
      </div>
    </div>
  );
}
