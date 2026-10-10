import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { formatCurrency } from "@/lib/utils";
import { Users } from "lucide-react";
import Link from "next/link";

export default async function RoCustomersPage() {
  const session = await getCurrentSession();
  const repo = new MockPerformanceRepository();
  if (!session) return null;

  const customers = await repo.getCustomerList(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: session.scope.effectiveRoIds[0],
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#CF2E2E]" />
            My Relationship Customers
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Active high-net-worth and corporate customer accounts assigned to your portfolio.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E4E7EC] text-[#667085] font-bold uppercase">
                <th className="p-3">Customer ID</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Account Number</th>
                <th className="p-3">Tier</th>
                <th className="p-3 text-right">Total Portfolio Balance</th>
                <th className="p-3 text-center">Active Deals</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {customers.map((c) => (
                <tr key={c.customerId} className="hover:bg-[#F8F9FA]">
                  <td className="p-3 font-mono font-bold text-[#CF2E2E]">{c.customerId}</td>
                  <td className="p-3 font-bold text-[#24252B]">{c.customerName}</td>
                  <td className="p-3 font-mono text-[#667085]">{c.accountNumber}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FFF1EE] text-[#CF2E2E]">
                      {c.tier}
                    </span>
                  </td>
                  <td className="p-3 text-right font-extrabold tabular-nums">
                    {formatCurrency(c.totalPortfolio)}
                  </td>
                  <td className="p-3 text-center font-semibold">{c.activeInvestmentsCount}</td>
                  <td className="p-3 text-center">
                    <Link
                      href={`/ro/customers/${c.customerId}`}
                      className="px-2.5 py-1 bg-[#FFF1EE] text-[#CF2E2E] rounded font-bold hover:bg-[#CF2E2E] hover:text-white transition-colors"
                    >
                      Details
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
