import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { formatCurrency } from "@/lib/utils";
import { Users } from "lucide-react";

export default async function RegionalCustomersPage() {
  const session = await getCurrentSession();
  const repo = new MockPerformanceRepository();
  if (!session) return null;

  const customers = await repo.getCustomerList(session.scope, {
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
          <Users className="w-5 h-5 text-[#CF2E2E]" />
          Regional Customers Directory
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Active relationship accounts across authorized region.
        </p>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E4E7EC] text-[#667085] font-bold uppercase">
                <th className="p-3">Customer ID</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Account Number</th>
                <th className="p-3">Assigned RO</th>
                <th className="p-3 text-right">Portfolio Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {customers.map((c) => (
                <tr key={c.customerId} className="hover:bg-[#F8F9FA]">
                  <td className="p-3 font-mono font-bold text-[#CF2E2E]">{c.customerId}</td>
                  <td className="p-3 font-bold text-[#24252B]">{c.customerName}</td>
                  <td className="p-3 font-mono text-[#667085]">{c.accountNumber}</td>
                  <td className="p-3 font-semibold text-[#24252B]">{c.relationshipOfficerName}</td>
                  <td className="p-3 text-right font-extrabold tabular-nums">
                    {formatCurrency(c.totalPortfolio)}
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
