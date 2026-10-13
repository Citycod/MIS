import { getCurrentSession } from "@/lib/server/security/auth";
import { getPerformanceRepository } from "@/lib/server/repository/repository-factory";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface InvestmentDetailPageProps {
  params: Promise<{ investmentId: string }>;
}

export default async function InvestmentDetailPage({ params }: InvestmentDetailPageProps) {
  const resolvedParams = await params;
  const session = await getCurrentSession();
  const repo = getPerformanceRepository();
  if (!session) return null;

  const investments = await repo.getInvestmentList(session.scope, {
    regionId: session.scope.effectiveRegionId,
    roId: session.scope.effectiveRoIds[0],
    asOfDate: "2026-09-30",
    productCode: "PROD-ALL",
    periodMode: "MTD",
  });

  const deal = investments.find((inv) => inv.investmentId === resolvedParams.investmentId) || investments[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/ro/investments"
          className="p-2 bg-white border border-[#E4E7EC] rounded-lg hover:bg-[#F8F9FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#24252B]" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B]">
            Investment Deal {resolvedParams.investmentId}
          </h1>
          <p className="text-xs text-[#667085]">Customer: {deal?.customerName} • Product: {deal?.productName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Principal Amount</span>
          <p className="text-xl font-extrabold text-[#24252B] mt-1">{formatCurrency(deal?.principalAmount)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Interest Yield</span>
          <p className="text-xl font-extrabold text-[#16794A] mt-1">{deal?.interestRatePercentage}% p.a.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Tenor</span>
          <p className="text-xl font-extrabold text-[#24252B] mt-1">{deal?.tenorDays} Days</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E4E7EC]">
          <span className="text-xs font-bold text-[#667085] uppercase">Maturity Date</span>
          <p className="text-xl font-extrabold text-[#CF2E2E] mt-1">{formatDate(deal?.maturityDate)}</p>
        </div>
      </div>
    </div>
  );
}
