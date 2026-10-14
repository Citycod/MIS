import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoComparisonTable } from "@/components/dashboard/ro-comparison-table";
import { filterQuery } from "@/lib/filters";
import type { FilterOptions } from "@/components/filters/global-filter-bar";
import type { GlobalFilters } from "@/types/filter";
import type { KpiSummary, RoPerformanceItem } from "@/types/repository";

type Props = {
  filters: GlobalFilters;
  options: FilterOptions;
  kpis: KpiSummary | null;
  rows: RoPerformanceItem[];
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function OfficerComparisonView({ filters, options, kpis, rows }: Props) {
  const dashboardFilters = { ...filters, roId: "ALL" };
  const regionName = options.regions.find(region => region.id === filters.regionId)?.name ?? filters.regionId;
  const status = kpis?.availability === "no-data"
    ? "No reporting snapshot"
    : kpis?.provisional
      ? "Partial month · Provisional"
      : "Month-end reporting";

  return <div className="mx-auto max-w-[1500px]">
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#A51F27] hover:underline" href={`/regional/dashboard?${filterQuery(dashboardFilters)}`}>
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#171717]">Relationship Officer Comparison</h1>
        <p className="mt-1 text-sm text-[#667085]">Search, sort and open an officer’s YTD performance for {regionName}.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-[#F7E7E8] px-3 py-1.5 font-semibold text-[#A51F27]">YTD</span>
        <span className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-[#667085]">{displayDate(filters.startDate!)} – {displayDate(filters.asOfDate)}</span>
        <span className="rounded-full border border-[#E8D5D7] bg-[#FCF6F6] px-3 py-1.5 font-medium text-[#651015]">{status}</span>
      </div>
    </div>
    <RoComparisonTable rows={rows} filters={filters} />
  </div>;
}
