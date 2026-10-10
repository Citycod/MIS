import { SupersetDashboardPlaceholder } from "@/components/superset/superset-dashboard-placeholder";
import { BarChart3, Info } from "lucide-react";

export default function RoProfitabilityPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#CF2E2E]" />
          Profitability Analysis (Approved Views Only)
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Net interest margin, interest income, and cost of funds derived from Finance-approved SQL views.
        </p>
      </div>

      <div className="bg-[#FFF1EE] border border-[#CF2E2E]/20 p-4 rounded-xl text-xs text-[#24252B] flex items-center gap-2">
        <Info className="w-4 h-4 text-[#CF2E2E] shrink-0" />
        <span>
          Note: Profitability values are computed strictly inside Finance SQL calculation views. Unapproved calculation bases are rendered as null/pending sign-off per spec 08.
        </span>
      </div>

      <SupersetDashboardPlaceholder
        config={{
          id: "superset-ro-profitability-01",
          title: "Apache Superset Net Margin & Yield Analytics",
          metricType: "portfolio-movement",
        }}
      />
    </div>
  );
}
