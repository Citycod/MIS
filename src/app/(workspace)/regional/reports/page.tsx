import { FileText, Download } from "lucide-react";
import { FinancialSampleSection } from "@/components/financial-sample/financial-sample-section";
import type { SearchParams } from "@/lib/filters";

export default async function RegionalReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  if (raw.source !== "built-in") return <FinancialSampleSection raw={raw} regional allowExport showMpr dashboardKey="financial_sample_export" title="Reports and Export Data" description="Generate a scoped Monthly Performance Review PowerPoint, import controlled source extracts, or download authorized financial event data as CSV." />;
  const reports = [
    { key: "regional-ro-ranking-summary", title: "Regional RO Ranking & Target Gap Summary", format: "Excel / PDF" },
    { key: "regional-movement-waterfall", title: "Regional Portfolio Movement Ledger", format: "Excel" },
    { key: "regional-customer-portfolio-list", title: "Regional Master Customer Portfolio List", format: "Excel" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#CF2E2E]" />
          Regional Executive Reports & Export Directory
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Authorized regional executive reports compiled directly from Finance database views.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.key} className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <FileText className="w-6 h-6 text-[#CF2E2E] mb-2" />
              <h3 className="font-bold text-sm text-[#24252B] mb-1">{r.title}</h3>
              <span className="text-[10px] bg-[#F8F9FA] border border-[#E4E7EC] px-2 py-0.5 rounded text-[#667085]">
                Format: {r.format}
              </span>
            </div>
            <button className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#CF2E2E] text-white text-xs font-bold rounded-lg hover:bg-[#AA2227] transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Download Report
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
