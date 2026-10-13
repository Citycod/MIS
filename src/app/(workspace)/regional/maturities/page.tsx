import { getCurrentSession } from "@/lib/server/security/auth";
import { getPerformanceRepository } from "@/lib/server/repository/repository-factory";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";

export default async function RegionalMaturitiesPage() {
  const session = await getCurrentSession();
  const repo = getPerformanceRepository();
  if (!session) return null;

  const investments = await repo.getInvestmentList(session.scope, {
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
          <CalendarCheck className="w-5 h-5 text-[#CF2E2E]" />
          Regional Maturities & Rollovers Pipeline
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Regional overview of maturing placements and retention rates.
        </p>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E4E7EC] text-[#667085] font-bold uppercase">
                <th className="p-3">Deal ID</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Assigned RO</th>
                <th className="p-3 text-right">Principal</th>
                <th className="p-3">Maturity Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {investments.map((inv) => (
                <tr key={inv.investmentId} className="hover:bg-[#F8F9FA]">
                  <td className="p-3 font-mono font-bold text-[#CF2E2E]">{inv.investmentId}</td>
                  <td className="p-3 font-bold text-[#24252B]">{inv.customerName}</td>
                  <td className="p-3 text-[#667085] font-semibold">{inv.roName}</td>
                  <td className="p-3 text-right font-extrabold tabular-nums">
                    {formatCurrency(inv.principalAmount)}
                  </td>
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
