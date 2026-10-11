import { BarChart2, PieChart, LineChart } from "lucide-react";
import { SupersetDashboardConfig } from "@/types/superset";
import type { GlobalFilters } from "@/types/filter";
import { SupersetEmbed } from "./superset-embed";
import { filterQuery } from "@/lib/filters";

interface Props {
  config: SupersetDashboardConfig;
  className?: string;
  filters?: GlobalFilters;
  description?: string;
  children?: React.ReactNode;
}
// Reuse the approved panel layout; only the analytics surface is embedded.
export function SupersetDashboardPlaceholder({ config, className = "", filters, description, children }: Props) {
  const Icon = config.metricType === "product-mix" ? PieChart : config.metricType === "regional-trend" ? LineChart : BarChart2;
  return <section className={`panel flex h-full flex-col ${className}`} data-chart-key={config.id} data-filter-scope={filters ? filterQuery(filters) : undefined}>
    <div className="flex items-start justify-between gap-3 border-b border-[#E4E7EC] px-5 py-4">
      <div><h2 className="text-sm font-semibold">{config.title}</h2><p className="mt-1 text-xs text-[#667085]">{description || "Monthly portfolio analytics"}</p></div>
      <Icon size={18} className="shrink-0 text-[#CF2E2E]" />
    </div>
    {filters ? <SupersetEmbed key={filterQuery(filters)} dashboardKey={config.id} title={config.title} filters={filters} /> : <div className="m-5 flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-[#D2D6DD] bg-[#FAFAFA] p-5 text-center">
      <Icon size={27} strokeWidth={1.3} className="mb-3 text-[#9198A4]" />
      <p className="text-sm font-medium">{config.metricType === "product-mix" ? "Investment mix donut" : "Apache Superset chart"}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#667085]">Awaiting analytics connection. {config.metricType === "product-mix" ? "Composition figures are shown below." : "Portfolio figures remain available on this dashboard."}</p>
    </div>}
    {children}
    {filters && <p className="mt-auto border-t border-[#E4E7EC] px-5 py-3 text-[11px] text-[#667085]">{filters.periodMode} · As of {filters.asOfDate} · NGN · {filters.roId === "ALL" ? "All authorized ROs" : filters.roId} · {filters.productCode === "PROD-ALL" ? "All products" : filters.productCode}</p>}
  </section>;
}
