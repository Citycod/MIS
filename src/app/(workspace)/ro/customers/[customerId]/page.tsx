import { getCurrentSession } from "@/lib/server/security/auth";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CustomerDetailPageProps {
  params: Promise<{ customerId: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const resolvedParams = await params;
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

  const customer = customers.find((c) => c.customerId === resolvedParams.customerId) || customers[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/ro/customers"
          className="p-2 bg-white border border-[#E4E7EC] rounded-lg hover:bg-[#F8F9FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#24252B]" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B]">
            {customer ? customer.customerName : resolvedParams.customerId}
          </h1>
          <p className="text-xs text-[#667085]">Customer ID: {resolvedParams.customerId} • Account: {customer?.accountNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Total Portfolio Position</span>
          <p className="text-2xl font-extrabold text-[#24252B] mt-1">{formatCurrency(customer?.totalPortfolio)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Assigned Relationship Officer</span>
          <p className="text-sm font-bold text-[#24252B] mt-1">{customer?.relationshipOfficerName}</p>
          <p className="text-xs text-[#667085]">{customer?.branchName}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Customer Tier</span>
          <p className="text-sm font-extrabold text-[#CF2E2E] mt-1">{customer?.tier}</p>
        </div>
      </div>
    </div>
  );
}
