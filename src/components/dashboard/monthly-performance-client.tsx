"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, Lock, Upload, X } from "lucide-react";
import type { AuthorizedScope } from "@/types/auth";
import type { GlobalFilters } from "@/types/filter";
import type { FilterOptions } from "@/components/filters/global-filter-bar";
import { filterQuery } from "@/lib/filters";
import { SupersetEmbed } from "@/components/superset/superset-embed";

type Props = {
  filters: GlobalFilters;
  options: FilterOptions;
  scope: AuthorizedScope;
  source: "built-in" | "csv";
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function MonthlyPerformanceClient({ filters, options, scope, source }: Props) {
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
  const dashboardKey = source === "csv" ? "csv_monthly_performance_review" : "monthly_performance_review";

  function navigate(next: GlobalFilters, nextSource = source) {
    const query = new URLSearchParams(filterQuery(next));
    if (nextSource === "csv") query.set("source", "csv");
    startTransition(() => router.push(`${pathname}?${query}`, { scroll: false }));
  }

  async function uploadCsv(form: FormData) {
    setUploading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/csv-import", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "CSV import failed.");
      const next = { ...draft, startDate: result.startDate, asOfDate: result.endDate, periodMode: "YTD" as const };
      setDraft(next);
      setMessage(`${result.rows.toLocaleString()} synthetic rows imported. Apache Superset is refreshing the dashboard.`);
      dialog.current?.close();
      navigate(next, "csv");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "CSV import failed.");
    } finally { setUploading(false); }
  }

  return <div className="mx-auto max-w-[1500px]" data-dashboard-scope={filterQuery(filters)} data-dashboard-source={source}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-sm text-[#667085]">
        <span className="rounded-full bg-[#F7E7E8] px-4 py-1.5 text-xs font-semibold text-[#A51F27]">YTD</span>
        <span>{displayDate(filters.startDate!)} – {displayDate(filters.asOfDate)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#E8D5D7] bg-[#FCF6F6] px-3 py-1.5 text-[11px] font-semibold text-[#651015]">{source === "csv" ? "Imported CSV · Synthetic Data" : "Synthetic Data"}</span>
        {source === "csv" && <button className="secondary-button" onClick={() => navigate(filters, "built-in")}>Use built-in data</button>}
        <button className="secondary-button gap-2" onClick={() => { setError(""); setMessage(""); dialog.current?.showModal(); }}><Upload size={15} /> Import CSV</button>
      </div>
    </div>

    <form aria-label="Dashboard filters" onSubmit={event => { event.preventDefault(); navigate({ ...draft, startDate }); }} className="mb-5 rounded-xl border border-[#E8E1E2] bg-white p-4 shadow-[0_1px_3px_rgba(101,16,21,0.05)] sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_.9fr_1.05fr_.95fr_auto] xl:items-end">
        <label className="samtl-filter-label">Start Date
          <input className="samtl-filter-input" type="date" required max={draft.asOfDate} value={startDate} disabled={pending} onChange={event => setDraft({ ...draft, startDate: event.target.value })} />
        </label>
        <label className="samtl-filter-label">End Date
          <input className="samtl-filter-input" type="date" required min={startDate} value={draft.asOfDate} disabled={pending} onChange={event => setDraft({ ...draft, asOfDate: event.target.value })} />
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
        <button type="submit" disabled={pending} className="samtl-apply-button">{pending ? "Applying…" : "Apply"}</button>
      </div>
    </form>

    {message && <p role="status" className="mb-4 rounded-lg border border-[#B7DFC9] bg-[#F0FAF4] px-4 py-3 text-sm text-[#16794A]">{message}</p>}
    <section className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white" aria-label="Apache Superset performance dashboard">
      <SupersetEmbed key={`${dashboardKey}:${filterQuery(filters)}`} dashboardKey={dashboardKey} title="Performance Review" filters={filters} fullDashboard />
    </section>
    <p className="mt-3 text-[11px] text-[#737373]">Synthetic demonstration data · Figures for UI illustration only · Financial definitions remain subject to Finance-approved reporting views</p>

    <dialog ref={dialog} aria-label="Import synthetic CSV data" className="m-auto w-[min(92vw,560px)] rounded-2xl border border-[#E8D5D7] bg-white p-0 shadow-2xl backdrop:bg-black/35">
      <form action={uploadCsv} className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-[#252525]">Import synthetic CSV data</h2><p className="mt-1 text-sm leading-6 text-[#737373]">The file creates a separate development reporting database. It never writes to CRM or replaces the Phase 2 databases.</p></div>
          <button type="button" aria-label="Close CSV import" className="rounded-lg p-2 text-[#651015] hover:bg-[#FCF6F6]" onClick={() => dialog.current?.close()}><X size={18} /></button>
        </div>
        <div className="mt-5 rounded-lg bg-[#FCF6F6] p-4 text-xs leading-5 text-[#651015]">
          Required columns: reporting date, authorized region and RO, approved product, annual target, funds mobilized, and optional target completion. Uploaded figures must already be approved or synthetic; MIS does not calculate them in the browser.
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
