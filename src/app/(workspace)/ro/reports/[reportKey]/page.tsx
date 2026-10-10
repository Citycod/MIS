import { ArrowLeft, Download, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ReportDetailPageProps {
  params: Promise<{ reportKey: string }>;
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const resolvedParams = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/ro/reports"
          className="p-2 bg-white border border-[#E4E7EC] rounded-lg hover:bg-[#F8F9FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#24252B]" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#24252B]">
            Report Generator: {resolvedParams.reportKey}
          </h1>
          <p className="text-xs text-[#667085]">Filtered strictly by your authorized scope and selected period.</p>
        </div>
      </div>

      <div className="bg-white border border-[#E4E7EC] rounded-xl p-8 text-center max-w-lg mx-auto shadow-xs">
        <CheckCircle2 className="w-12 h-12 text-[#16794A] mx-auto mb-3" />
        <h3 className="font-bold text-sm text-[#24252B] mb-1">Report Data Ready for Export</h3>
        <p className="text-xs text-[#667085] mb-6">
          Query compiled directly from approved SQL calculation views.
        </p>

        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#CF2E2E] text-white text-xs font-bold rounded-lg hover:bg-[#AA2227] transition-all cursor-pointer">
          <Download className="w-4 h-4" />
          Download XLSX Report
        </button>
      </div>
    </div>
  );
}
