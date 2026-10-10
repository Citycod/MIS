import { SupersetDashboardPlaceholder } from "@/components/superset/superset-dashboard-placeholder";
import { BarChart3 } from "lucide-react";

export default function RegionalProfitabilityPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#CF2E2E]" />
          Regional Profitability Analysis
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Regional net margin and interest income analytics from Finance SQL views.
        </p>
      </div>

      <SupersetDashboardPlaceholder
        config={{
          id: "superset-regional-profitability-01",
          title: "Apache Superset Regional Profitability Analytics",
          metricType: "portfolio-movement",
        }}
      />
    </div>
  );
}
