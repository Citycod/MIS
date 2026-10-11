import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ShieldCheck, CalendarDays } from "lucide-react";
import { getCurrentSession } from "@/lib/server/security/auth";
import { normalizeAuthorizedScope, FilterError, ScopeError } from "@/lib/server/security/scope";
import { getFilterOptions } from "@/lib/server/security/filter-options";
import { MockPerformanceRepository } from "@/lib/server/repository/mock-repository";
import type { PerformanceRepository } from "@/types/repository";
import type { GlobalFilters } from "@/types/filter";
import { FILTER_KEYS, filterQuery, SearchParams } from "@/lib/filters";
import { GlobalFilterBar } from "@/components/filters/global-filter-bar";
import { KpiCard } from "@/components/ui/kpi-card";
import { ErrorPanel } from "@/components/ui/error-panel";
import { SupersetDashboardPlaceholder } from "@/components/superset/superset-dashboard-placeholder";
import { RoComparisonTable } from "./ro-comparison-table";
import { MonthlyMovementTable } from "./monthly-movement-table";
import { PeriodSwitcher } from "./period-switcher";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

interface Props { searchParams: Promise<SearchParams>; regional?: boolean; roId?: string; comparisonOnly?: boolean }
export async function PerformanceDashboard({ searchParams, regional = false, roId, comparisonOnly = false }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (regional !== (session.user.role === "REGIONAL_MANAGER")) redirect("/forbidden");
  const raw = await searchParams;
  const options = getFilterOptions(session.user);
  let context;
  try {
    const requested: Record<string, string> = {};
    for (const key of FILTER_KEYS) {
      if (Array.isArray(raw[key])) throw new FilterError("Use only one value per filter.");
      if (typeof raw[key] === "string") requested[key] = raw[key];
    }
    if (roId) {
      if (!options.officers.some(officer => officer.id === roId)) throw new ScopeError("Officer is outside your authorized scope.");
      if (requested.roId && requested.roId !== roId) throw new ScopeError("Officer URL and filter do not match.");
      requested.roId = roId;
    }
    context = normalizeAuthorizedScope(session.user, requested as Partial<GlobalFilters>);
  } catch (error) {
    if (error instanceof ScopeError) redirect("/forbidden");
    if (!(error instanceof FilterError)) throw error;
    return <><ErrorPanel title="Invalid dashboard filters" message={error.message} /><Link className="primary-button" href={regional ? "/regional/dashboard" : "/ro/dashboard"}>Reset dashboard filters</Link></>;
  }
  const { scope, filters } = context;
  const repo: PerformanceRepository = new MockPerformanceRepository();
  const [kpi, movement, mix, officers] = await Promise.all([
    repo.getKpiSummary(scope, filters), repo.getMonthlyMovement(scope, filters), repo.getProductInvestmentMix(scope, filters),
    regional ? repo.getRoPerformanceComparison(scope, filters) : Promise.resolve([]),
  ]);
  const region = options.regions.find(r => r.id === filters.regionId)!;
  const officer = options.officers.find(o => o.id === filters.roId);
  const isRegionTotal = regional && filters.roId === "ALL";
  const title = roId ? `${officer?.name} · Performance` : comparisonOnly ? "Relationship Officer Performance" : regional ? "Regional RO Performance" : "My Performance";
  const productSelected = filters.productCode !== "PROD-ALL";
  const pendingTarget = productSelected ? "Product target allocation pending definition" : "Synthetic annual position target";
  const period = filters.periodMode;
  const chartPrefix = regional ? "regional_overview" : "ro_overview";
  return <div className="mx-auto max-w-[1600px] space-y-6" data-dashboard-scope={filterQuery(filters)}>
    <header>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#667085]"><span>Performance overview</span><span>/</span><span>{region.name}</span><span className="ml-auto rounded-full border border-[#E4E7EC] bg-white px-3 py-1">Demo / Synthetic Data</span></div>
      {roId && <Link className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[#B52626]" href={`/regional/dashboard?${filterQuery({ ...filters, roId: "ALL" })}`}><ArrowLeft size={14} /> Back to all ROs</Link>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1><p className="mt-1 text-sm text-[#667085]">{officer ? officer.name : region.name} · Portfolio position, monthly movement and target progress</p></div>
        <div className="flex items-center gap-2 pt-1 text-xs text-[#667085]"><CalendarDays size={15} />As of {formatDate(filters.asOfDate)}</div>
      </div>
    </header>
    <GlobalFilterBar scope={scope} initialFilters={filters} options={options} />
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085]">
      <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> {region.name} · {officer?.name || `${scope.effectiveRoIds.length} authorized officers`} · NGN</span>
      <span>{kpi.availability === "no-data" ? "No reporting snapshot" : kpi.provisional ? "Partial month · Provisional MTD snapshot" : "Month-end reporting"}</span>
    </div>
    {kpi.availability === "no-data" ? <section className="panel p-10 text-center"><h2 className="text-lg font-semibold">No data for this selection</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#667085]">Synthetic snapshots are available at each month-end from January to September 2026 and on 15 September 2026. Call Deposit has no eligible investment activity. Select another date or product, or reset the filters.</p></section> : <>
      {!comparisonOnly && <>
        <section aria-label="Portfolio key performance indicators" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard title={isRegionTotal ? "Regional Portfolio" : "Current Portfolio"} value={kpi.portfolioBalance} compact subtitle={`Position at ${formatDate(kpi.asOfDate)}`} />
          <KpiCard title={isRegionTotal ? "Regional Annual Target" : "Annual Target"} value={kpi.portfolioTarget} compact subtitle={pendingTarget} />
          <KpiCard title="Achievement" value={kpi.achievementPercentage} type="percent" subtitle={productSelected ? pendingTarget : "Of annual position target"} />
          <KpiCard title={Number(kpi.gapToTarget) < 0 ? "Surplus" : "Remaining Gap"} value={kpi.gapToTarget} compact subtitle={productSelected ? pendingTarget : "Position gap to annual target"} />
          <KpiCard title="Monthly Required Run Rate" value={kpi.monthlyPaceRequired} compact subtitle={productSelected ? pendingTarget : kpi.paceBasis} />
          <KpiCard title="Monthly Net Movement" value={kpi.monthlyNetMovement} compact subtitle="External inflows less withdrawals" />
        </section>
        <section className="panel px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{period === "MTD" ? "Month-to-date" : "Year-to-date"} performance</h2><p className="mt-1 text-xs text-[#667085]">{period === "MTD" ? filters.asOfDate.slice(0, 7) : `${filters.asOfDate.slice(0, 4)}-01-01`} through {filters.asOfDate} · External investment flows</p></div><PeriodSwitcher filters={filters} /></div>
          <dl className="grid gap-4 sm:grid-cols-3">{[["External inflows", period === "MTD" ? kpi.mtdInflow : kpi.ytdInflow], ["Withdrawals / liquidations", period === "MTD" ? kpi.mtdOutflow : kpi.ytdOutflow], ["Net external movement", period === "MTD" ? kpi.monthlyNetMovement : kpi.ytdNetMovement]].map(([label, value]) => <div key={label}><dt className="text-xs text-[#667085]">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(value, "NGN", true)}</dd></div>)}</dl>
        </section>
        <div className="grid gap-5 xl:grid-cols-2">
          <SupersetDashboardPlaceholder config={{ id: `${chartPrefix}:movement`, title: regional ? "Regional Monthly Net Movement" : "Monthly Portfolio Movement", metricType: "portfolio-movement" }} filters={filters} description="Monthly external inflows, withdrawals and signed net movement" />
          <SupersetDashboardPlaceholder config={{ id: `${chartPrefix}:position`, title: regional ? "Regional Closing Portfolio Trend" : "Closing Portfolio Position vs Annual Target", metricType: "regional-trend" }} filters={filters} description="Portfolio positions · Synthetic annual target reference; product allocations pending" />
        </div>
        <div className={`grid gap-5 ${regional ? "xl:grid-cols-2" : ""}`}>
          {regional && <SupersetDashboardPlaceholder config={{ id: "regional_overview:ro_position_target", title: "RO Position vs Target", metricType: "ro-comparison" }} filters={filters} description="Officer positions and synthetic annual targets · Product allocations pending" />}
          <SupersetDashboardPlaceholder config={{ id: "investment_mix", title: "Product Investment Mix", metricType: "product-mix" }} filters={filters} description="Eligible investment composition · MTD / YTD">
            <div className="px-5 pb-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-[#667085]">{period} eligible investment amount</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(mix[0]?.denominatorAmount)}</p></div><PeriodSwitcher filters={filters} /></div>
              {mix.length ? <ul className="divide-y divide-[#E4E7EC]">{mix.map(item => <li key={item.productCode} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"><span>{item.productName}</span><span className="ml-auto tabular-nums">{formatCurrency(item.allocatedAmount)} <strong className="ml-3 inline-block min-w-14 text-right">{formatPercent(item.percentageShare)}</strong></span></li>)}</ul> : <p className="text-sm text-[#667085]">No eligible investment activity.</p>}
              <p className="mt-3 text-[11px] leading-relaxed text-[#667085]">Numerator: eligible external investment inflow by product. Denominator: total eligible inflow for the applied scope and period. Synthetic convention excludes rollover principal; production definition awaits Finance approval.</p>
            </div>
          </SupersetDashboardPlaceholder>
        </div>
      </>}
      {regional && <RoComparisonTable key={`comparison-${filterQuery(filters)}`} rows={officers} filters={filters} />}
      {!comparisonOnly && <MonthlyMovementTable key={`movement-${filterQuery(filters)}`} rows={movement} />}
      {regional && !comparisonOnly && <section className="panel p-5"><h2 className="text-sm font-semibold">{isRegionTotal ? "Regional profitability summary" : "Officer profitability summary"}</h2><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-[#667085]">Profitability</p><p className="mt-1 text-sm font-medium">{kpi.profitability === null ? "Pending financial definition" : formatCurrency(kpi.profitability)}</p></div><div><p className="text-xs text-[#667085]">Weighted average cost of capital (WACC)</p><p className="mt-1 text-sm font-medium">{kpi.wacc === null ? "Pending financial definition" : formatPercent(kpi.wacc)}</p></div></div><p className="mt-3 text-xs text-[#667085]">Approved profitability and weighted-cost outputs have not been supplied.</p></section>}
      {regional && !comparisonOnly && !roId && <Link className="inline-flex items-center gap-1 text-sm font-semibold text-[#B52626]" href={`/regional/relationship-officers?${filterQuery(filters)}`}>Open RO comparison <ArrowUpRight size={15} /></Link>}
    </>}
    <footer className="border-t border-[#E4E7EC] pt-4 text-[11px] leading-relaxed text-[#667085]">Synthetic reporting snapshot · {kpi.dataVersion} · {kpi.metricDefinitionVersion} · All financial amounts are precomputed fixture outputs. Monthly target allocations, profitability and WACC await approved definitions.</footer>
  </div>;
}
