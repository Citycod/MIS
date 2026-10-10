import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RoDetailPageProps {
  params: Promise<{ roId: string }>;
}

export default async function RoDetailPage({ params }: RoDetailPageProps) {
  const resolvedParams = await params;
  const session = await getCurrentSession();
  const repo = new MockPerformanceRepository();
  if (!session) return null;

  const roList = await repo.getRoPerformanceComparison(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: "ALL",
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  const ro = roList.find((r) => r.roId === resolvedParams.roId) || roList[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/regional/relationship-officers"
          className="p-2 bg-white border border-[#E4E7EC] rounded-lg hover:bg-[#F8F9FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#24252B]" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B]">
            Officer Performance: {ro?.roName} ({resolvedParams.roId})
          </h1>
          <p className="text-xs text-[#667085]">Branch: {ro?.branchName} • Region: {ro?.regionName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Closing Position</span>
          <p className="text-xl font-extrabold text-[#24252B] mt-1">{formatCurrency(ro?.closingPosition)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Annual Target</span>
          <p className="text-xl font-extrabold text-[#667085] mt-1">{formatCurrency(ro?.targetAmount)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Achievement</span>
          <p className="text-xl font-extrabold text-[#CF2E2E] mt-1">{formatPercent(ro?.achievementPercentage)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Required Monthly Pace</span>
          <p className="text-xl font-extrabold text-[#16794A] mt-1">{formatCurrency(ro?.requiredPaceMonthly)}</p>
        </div>
      </div>
    </div>
  );
}
