import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { UserCheck } from "lucide-react";
import Link from "next/link";

export default async function RegionalRoDirectoryPage() {
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#CF2E2E]" />
          Relationship Officers Directory & Regional Ranking
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Authorized officers assigned to {session.scope.effectiveRegionId}.
        </p>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E4E7EC] text-[#667085] font-bold uppercase">
                <th className="p-3">RO ID</th>
                <th className="p-3">RO Name</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Closing Position</th>
                <th className="p-3 text-right">Annual Target</th>
                <th className="p-3 text-right">Achievement (%)</th>
                <th className="p-3 text-right">Gap</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {roList.map((ro) => (
                <tr key={ro.roId} className="hover:bg-[#F8F9FA]">
                  <td className="p-3 font-mono font-bold text-[#CF2E2E]">{ro.roId}</td>
                  <td className="p-3 font-bold text-[#24252B]">{ro.roName}</td>
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
                  <td className="p-3 text-center">
                    <Link
                      href={`/regional/relationship-officers/${ro.roId}`}
                      className="px-2.5 py-1 bg-[#FFF1EE] text-[#CF2E2E] rounded font-bold hover:bg-[#CF2E2E] hover:text-white transition-colors"
                    >
                      View RO Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
