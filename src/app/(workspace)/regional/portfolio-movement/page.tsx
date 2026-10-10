import { SupersetDashboardPlaceholder } from "@/components/superset/superset-dashboard-placeholder";
import { TrendingUp } from "lucide-react";

export default function RegionalPortfolioMovementPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#CF2E2E]" />
          Regional Portfolio Movement (Aggregate Region Scope)
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Opening position, external inflows, liquidations, net movement, and closing position across authorized region.
        </p>
      </div>

      <SupersetDashboardPlaceholder
        config={{
          id: "superset-regional-movement-full-01",
          title: "Apache Superset Regional Portfolio Movement Ledger & Waterfall Analytics",
          metricType: "portfolio-movement",
        }}
      />
    </div>
  );
}
