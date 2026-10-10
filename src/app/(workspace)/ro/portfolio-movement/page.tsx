import { SupersetDashboardPlaceholder } from "@/components/superset/superset-dashboard-placeholder";
import { TrendingUp, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MOCK_MOVEMENT_LEDGER } from "@/mocks/fixtures";

export default function RoPortfolioMovementPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-[#E4E7EC] shadow-xs">
        <h1 className="text-xl font-extrabold text-[#24252B] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#CF2E2E]" />
          Monthly Portfolio Movement (RO Scope)
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Opening position, external inflows, liquidations, net movement, and closing position per month.
        </p>
      </div>

      <SupersetDashboardPlaceholder
        config={{
          id: "superset-ro-movement-ledger-01",
          title: "Apache Superset Portfolio Movement Waterfall & Monthly Trend",
          metricType: "portfolio-movement",
        }}
      />

      {/* Movement Ledger Table */}
      <div className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-xs">
        <h3 className="font-bold text-sm text-[#24252B] mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#CF2E2E]" />
          Monthly Movement Ledger (NGN)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E4E7EC] text-[#667085] font-bold uppercase">
                <th className="p-3">Month</th>
                <th className="p-3 text-right">Opening Position</th>
                <th className="p-3 text-right">External Inflows</th>
                <th className="p-3 text-right">Liquidations / Outflows</th>
                <th className="p-3 text-right">Net Movement</th>
                <th className="p-3 text-right">Closing Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {MOCK_MOVEMENT_LEDGER.map((m) => (
                <tr key={m.month} className="hover:bg-[#F8F9FA]">
                  <td className="p-3 font-bold text-[#24252B]">{m.month}</td>
                  <td className="p-3 text-right tabular-nums">{formatCurrency(m.openingPosition)}</td>
                  <td className="p-3 text-right tabular-nums text-[#16794A] font-semibold">
                    +{formatCurrency(m.externalInflows)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-[#B42318] font-semibold">
                    -{formatCurrency(m.outflowsLiquidations)}
                  </td>
                  <td className="p-3 text-right tabular-nums font-extrabold text-[#CF2E2E]">
                    {formatCurrency(m.netMovement)}
                  </td>
                  <td className="p-3 text-right tabular-nums font-extrabold text-[#24252B]">
                    {formatCurrency(m.closingPosition)}
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
