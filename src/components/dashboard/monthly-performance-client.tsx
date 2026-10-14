"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ChevronDown, Download, Lock, RotateCcw, Upload, X } from "lucide-react";
import type { AuthorizedScope } from "@/types/auth";
import type { GlobalFilters } from "@/types/filter";
import type { KpiSummary, MonthlyMovement } from "@/types/repository";
import type { FilterOptions } from "@/components/filters/global-filter-bar";
import { filterQuery } from "@/lib/filters";
import { formatCurrency } from "@/lib/utils";
import { MonthlyMovementTable } from "@/components/dashboard/monthly-movement-table";
import { SupersetEmbed } from "@/components/superset/superset-embed";

type Props = {
  filters: GlobalFilters;
  options: FilterOptions;
  scope: AuthorizedScope;
  source: "built-in" | "csv" | "financial-sample";
  kpis: KpiSummary | null;
  movement: MonthlyMovement[];
  regional: boolean;
  selectedRoId?: string;
};

const FINANCIAL_SAMPLE_CUTOFF = "2026-10-10";

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function MonthlyPerformanceClient({ filters, options, scope, source, kpis, movement, regional, selectedRoId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const startDate = draft.startDate ?? `${draft.asOfDate.slice(0, 4)}-01-01`;
  const regionName = options.regions.find(region => region.id === draft.regionId)?.name ?? draft.regionId;
  const dashboardKey = source === "csv"
    ? "csv_monthly_performance_review"
    : source === "financial-sample"
      ? "financial_sample_overview"
      : "monthly_performance_review";
  const reportingStatus = source === "csv"
    ? "Imported reporting range"
    : source === "financial-sample"
      ? "Financial sample cutoff · 10 Oct 2026"
    : kpis?.availability === "no-data"
      ? "No reporting snapshot"
      : kpis?.provisional
        ? "Partial month · Provisional"
        : "Month-end reporting";
  const comparisonFilters = { ...filters, roId: "ALL" };

  function navigate(next: GlobalFilters, nextSource = source) {
    const query = new URLSearchParams(filterQuery(next));
    if (nextSource === "csv") query.set("source", "csv");
    if (nextSource === "financial-sample") query.set("source", "financial-sample");
    const isOfficerDetail = /^\/regional\/relationship-officers\/[^/]+$/.test(pathname);
    const destination = isOfficerDetail
      ? next.roId === "ALL" ? "/regional/dashboard" : `/regional/relationship-officers/${next.roId}`
      : pathname;
    startTransition(() => router.push(`${destination}?${query}`, { scroll: false }));
  }

  function useFinancialSample() {
    const next: GlobalFilters = {
      ...draft,
      startDate: "2026-01-01",
      asOfDate: FINANCIAL_SAMPLE_CUTOFF,
      productCode: "PROD-ALL",
      periodMode: "YTD",
    };
    setDraft(next);
    navigate(next, "financial-sample");
  }

  function resetFilters() {
    const next: GlobalFilters = {
      ...filters,
      regionId: scope.effectiveRegionId,
      roId: scope.isLockedRo ? scope.effectiveRoIds[0] : "ALL",
      startDate: `${options.defaultDate.slice(0, 4)}-01-01`,
      asOfDate: options.defaultDate,
      productCode: "PROD-ALL",
      periodMode: "YTD",
    };
    setDraft(next);
    navigate(next, "built-in");
  }

  async function uploadCsv(form: FormData) {
    setUploading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/csv-import", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "CSV import failed.");
      const next = { ...draft, startDate: result.startDate, asOfDate: result.endDate, periodMode: "YTD" as const };
      setDraft(next);
      const completionMessage = result.targetCompletionRows === 0
        ? " Target Completion will show unavailable because target_completion_pct is blank in every row."
        : "";
      setMessage(`${result.rows.toLocaleString()} synthetic rows imported.${completionMessage} Apache Superset is refreshing the dashboard.`);
      dialog.current?.close();
      navigate(next, "csv");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "CSV import failed.");
    } finally { setUploading(false); }
  }

  return <div className="mx-auto max-w-[1500px]" data-dashboard-scope={filterQuery(filters)} data-dashboard-source={source}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm text-[#667085]">
        <span className="rounded-full bg-[#F7E7E8] px-4 py-1.5 text-xs font-semibold text-[#A51F27]">YTD</span>
        <span>{displayDate(filters.startDate!)} – {displayDate(filters.asOfDate)}</span>
        <span className="rounded-full border border-[#E8D5D7] bg-[#FCF6F6] px-3 py-1.5 text-[11px] font-medium text-[#651015]">{reportingStatus}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#E8D5D7] bg-[#FCF6F6] px-3 py-1.5 text-[11px] font-semibold text-[#651015]">{source === "csv" ? "Imported CSV · Synthetic Data" : source === "financial-sample" ? "1,000-event Financial Sample · Synthetic Data" : "Synthetic Data"}</span>
        {source === "built-in" && <button className="secondary-button" onClick={useFinancialSample}>Use financial sample</button>}
        {source !== "built-in" && <button className="secondary-button" onClick={resetFilters}>Use built-in data</button>}
        <button className="secondary-button gap-2" onClick={() => { setError(""); setMessage(""); dialog.current?.showModal(); }}><Upload size={15} /> Import CSV</button>
      </div>
    </div>

    <form aria-label="Dashboard filters" onSubmit={event => { event.preventDefault(); navigate({ ...draft, startDate }); }} className="mb-5 rounded-xl border border-[#E8E1E2] bg-white p-4 shadow-[0_1px_3px_rgba(101,16,21,0.05)] sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_.9fr_1.05fr_.95fr_auto] xl:items-end">
        <label className="samtl-filter-label">Start Date
          <input className="samtl-filter-input" type="date" required max={draft.asOfDate} value={startDate} disabled={pending} onChange={event => setDraft({ ...draft, startDate: event.target.value })} />
        </label>
        <label className="samtl-filter-label">End Date
          <input className="samtl-filter-input" type="date" required min={startDate} value={draft.asOfDate} disabled={pending || source === "financial-sample"} onChange={event => setDraft({ ...draft, asOfDate: event.target.value })} />
        </label>
        <label className="samtl-filter-label">Region <Lock size={11} className="inline" />
          <select className="samtl-filter-input" value={draft.regionId} disabled aria-label="Region">
            <option value={draft.regionId}>{regionName.replace(" Region", "")}</option>
          </select>
        </label>
        <label className="samtl-filter-label">Relationship Officer {scope.isLockedRo && <Lock size={11} className="inline" />}
          <select className="samtl-filter-input" value={draft.roId} disabled={scope.isLockedRo || pending} onChange={event => setDraft({ ...draft, roId: event.target.value })}>
            {!scope.isLockedRo && <option value="ALL">All Relationship Officers</option>}
            {options.officers.map(officer => <option key={officer.id} value={officer.id}>{scope.isLockedRo ? "My Portfolio" : officer.name}</option>)}
          </select>
        </label>
        <label className="samtl-filter-label">Product
          <select className="samtl-filter-input" value={draft.productCode} disabled={pending} onChange={event => setDraft({ ...draft, productCode: event.target.value })}>
            {options.products.map(product => <option key={product.code} value={product.code}>{product.name}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pending} className="samtl-apply-button flex-1">{pending ? "Applying…" : "Apply"}</button>
          <button type="button" disabled={pending} aria-label="Reset dashboard filters" title="Reset filters" className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-lg border border-[#D8D8D8] bg-white text-[#651015] hover:bg-[#FCF6F6]" onClick={resetFilters}><RotateCcw size={16} /></button>
        </div>
      </div>
    </form>

    {message && <p role="status" className="mb-4 rounded-lg border border-[#B7DFC9] bg-[#F0FAF4] px-4 py-3 text-sm text-[#16794A]">{message}</p>}
    <section className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white" aria-label="Apache Superset performance dashboard">
      <SupersetEmbed key={`${dashboardKey}:${filterQuery(filters)}`} dashboardKey={dashboardKey} title="Performance Review" filters={filters} fullDashboard />
    </section>

    <details className="group mt-4 overflow-hidden rounded-xl border border-[#E8E1E2] bg-white shadow-[0_1px_3px_rgba(101,16,21,0.04)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
        <div>
          <p className="text-sm font-semibold text-[#252525]">Performance details</p>
          <p className="mt-0.5 text-xs text-[#737373]">Portfolio position, target gap, required run rate and movement reconciliation</p>
        </div>
        <ChevronDown size={18} className="shrink-0 text-[#A51F27] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[#E8E1E2] p-4 sm:p-5">
        {source === "financial-sample" ? <FinancialSampleDetails regional={regional} filters={filters} />
          : source === "csv" ? <p className="rounded-lg bg-[#FCF6F6] px-4 py-3 text-sm text-[#651015]">Detailed reconciliation is unavailable for imported CSV data because this import contains dashboard metrics only. Use built-in data to view the approved YTD movement records.</p>
          : kpis?.availability === "no-data" ? <div className="rounded-lg border border-[#E8D5D7] bg-[#FCF6F6] px-4 py-4 text-sm text-[#651015]"><p className="font-semibold">No detailed reporting snapshot is available for these filters.</p><p className="mt-1 text-xs text-[#737373]">Choose another reporting date or reset the dashboard to the latest available YTD snapshot.</p><button type="button" className="secondary-button mt-3 gap-2" onClick={resetFilters}><RotateCcw size={14} /> Reset filters</button></div>
            : <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <DetailMetric label="Current Portfolio Position" value={formatCurrency(kpis?.portfolioBalance, "NGN", true)} />
                <DetailMetric label="Remaining Gap" value={formatCurrency(kpis?.gapToTarget, "NGN", true)} unavailable={kpis?.gapToTarget === null} />
                <DetailMetric label="Required Monthly Run Rate" value={formatCurrency(kpis?.monthlyPaceRequired, "NGN", true)} unavailable={kpis?.monthlyPaceRequired === null} note={kpis?.monthlyPaceRequired === null ? kpis?.paceBasis : undefined} />
              </div>
              {regional && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#FCF6F6] px-4 py-3 text-sm"><span className="text-[#651015]">Compare authorized officers and open individual YTD performance.</span><Link className="font-semibold text-[#A51F27] hover:underline" href={`/regional/relationship-officers?${filterQuery(comparisonFilters)}`}>{selectedRoId ? "Back to RO comparison" : "Compare relationship officers"} →</Link></div>}
              <MonthlyMovementTable rows={movement} embedded />
            </>}
      </div>
    </details>
    <p className="mt-3 text-[11px] text-[#737373]">Synthetic demonstration data · Figures for UI illustration only · Financial definitions remain subject to Finance-approved reporting views</p>

    <dialog ref={dialog} aria-label="Import synthetic CSV data" className="m-auto w-[min(92vw,560px)] rounded-2xl border border-[#E8D5D7] bg-white p-0 shadow-2xl backdrop:bg-black/35">
      <form action={uploadCsv} className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-[#252525]">Import synthetic CSV data</h2><p className="mt-1 text-sm leading-6 text-[#737373]">The file creates a separate development reporting database. It never writes to CRM or replaces the Phase 2 databases.</p></div>
          <button type="button" aria-label="Close CSV import" className="rounded-lg p-2 text-[#651015] hover:bg-[#FCF6F6]" onClick={() => dialog.current?.close()}><X size={18} /></button>
        </div>
        <div className="mt-5 rounded-lg bg-[#FCF6F6] p-4 text-xs leading-5 text-[#651015]">
          <p>Use one summarized performance row per reporting date, region, officer and product. Event-level investment exports are not accepted because they do not contain an approved annual target.</p>
          <p className="mt-3 overflow-x-auto whitespace-nowrap rounded-md border border-[#E8D5D7] bg-white px-3 py-2 font-mono text-[10px]">reporting_date,region_id,region_name,ro_id,ro_name,product,annual_target_ngn,funds_mobilized_ngn,target_completion_pct</p>
          <p className="mt-3">Header case and order may vary. NGN values may contain commas or the ₦ symbol. Enter completion as a number from 0 to 100; leaving it blank displays unavailable. Uploaded figures must already be approved or synthetic; MIS does not calculate them in the browser.</p>
        </div>
        <label className="mt-5 block text-sm font-semibold text-[#252525]">CSV file
          <input name="file" type="file" accept=".csv,text/csv" required className="mt-2 block w-full rounded-lg border border-[#D8D8D8] p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#F7E7E8] file:px-3 file:py-2 file:font-semibold file:text-[#A51F27]" />
        </label>
        <a href="/api/csv-import" download className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#A51F27]"><Download size={15} /> Download CSV template</a>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[#FFF1F1] px-4 py-3 text-sm text-[#B42318]">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" disabled={uploading} className="samtl-primary-button min-h-10!">{uploading ? "Importing…" : "Import and refresh"}</button></div>
      </form>
    </dialog>
  </div>;
}

function FinancialSampleDetails({ regional, filters }: { regional: boolean; filters: GlobalFilters }) {
  const base = regional ? "/regional" : "/ro";
  const query = new URLSearchParams(filterQuery(filters));
  query.set("source", "financial-sample");
  const sections = [
    ["Investment", `${base}/investments`],
    ["Customers", `${base}/customers`],
    ["Concentration Risk", `${base}/concentration-risk`],
    ["Profitability", `${base}/profitability`],
    ["Target & Run Rate", `${base}/targets`],
    ["Export Data", `${base}/reports`],
  ];
  return <div>
    <p className="rounded-lg bg-[#FCF6F6] px-4 py-3 text-sm leading-6 text-[#651015]">The financial sample retains all 1,000 events and applies the fixed 10 October 2026 cutoff. Product labels use the configured SAMTL demo mapping; source product values remain available in detail tables.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map(([label, href]) => <Link key={label} href={`${href}?${query}`} className="rounded-xl border border-[#E8E1E2] bg-white px-4 py-4 text-sm font-semibold text-[#651015] transition-colors hover:bg-[#FCF6F6]">Open {label} →</Link>)}
    </div>
  </div>;
}

function DetailMetric({ label, value, unavailable = false, note }: { label: string; value: string; unavailable?: boolean; note?: string }) {
  return <div className="rounded-xl border border-[#E8E1E2] bg-[#FFFCFC] px-4 py-4">
    <p className="text-xs font-medium text-[#737373]">{label}</p>
    <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#651015]">{unavailable ? "Unavailable" : value}</p>
    {note && <p className="mt-1 text-[11px] text-[#737373]">{note}</p>}
  </div>;
}
