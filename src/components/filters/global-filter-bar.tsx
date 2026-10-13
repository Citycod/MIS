"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Lock, SlidersHorizontal } from "lucide-react";
import { AuthorizedScope } from "@/types/auth";
import { GlobalFilters, RoleView } from "@/types/filter";
import { DEFAULT_ROLE_VIEW, filterQuery, normalizeRoleView } from "@/lib/filters";

export interface FilterOptions {
  regions: { id: string; name: string }[];
  officers: { id: string; name: string; regionId: string }[];
  products: { code: string; name: string }[];
  roleViews: readonly { value: RoleView; label: string }[];
  defaultDate: string;
  reportingDates: readonly string[];
}
interface Props { scope: AuthorizedScope; initialFilters: GlobalFilters; options: FilterOptions; children?: ReactNode }
export function GlobalFilterBar(props: Props) {
  return <FilterForm key={filterQuery(props.initialFilters)} {...props} />;
}
function FilterForm({ scope, initialFilters, options, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  const helpId = useId();
  const detail = /^\/regional\/relationship-officers\/.+/.test(pathname);
  function apply(filters: GlobalFilters) {
    const path = detail ? (filters.roId === "ALL" ? "/regional/dashboard" : `/regional/relationship-officers/${filters.roId}`) : pathname;
    startTransition(() => router.push(`${path}?${filterQuery(filters)}`, { scroll: false }));
  }
  return <>
    <form aria-label="Global filters" aria-busy={pending} onSubmit={e => { e.preventDefault(); apply(draft); }} className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={15} className="text-[#CF2E2E]" /> Portfolio filters</span>
        <span id={`${helpId}-scope`} className="text-[#667085]">{scope.isLockedRo ? "Region and officer locked to your assigned portfolio" : "Region locked to your assignment; select an authorized officer"}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="filter-label">Role View
          <select className="filter-input" aria-describedby={`${helpId}-lens`} value={normalizeRoleView(draft.roleView)} disabled={pending} onChange={e => setDraft({ ...draft, roleView: normalizeRoleView(e.target.value) })}>
            {options.roleViews.map(view => <option key={view.value} value={view.value}>{view.label}</option>)}
          </select>
        </label>
        <label className="filter-label">Region {scope.isLockedRegion && <Lock size={11} className="inline" />}
          <select className="filter-input" aria-describedby={`${helpId}-scope`} value={draft.regionId} disabled={scope.isLockedRegion || pending} onChange={e => setDraft({ ...draft, regionId: e.target.value, roId: "ALL" })}>
            {options.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="filter-label">Relationship Officer {scope.isLockedRo && <Lock size={11} className="inline" />}
          <select className="filter-input" aria-describedby={`${helpId}-scope`} value={draft.roId} disabled={scope.isLockedRo || pending} onChange={e => setDraft({ ...draft, roId: e.target.value })}>
            {!scope.isLockedRo && <option value="ALL">All ROs in region</option>}
            {options.officers.filter(o => o.regionId === draft.regionId).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="filter-label">Date
          <input className="filter-input" type="date" list={`${helpId}-dates`} aria-describedby={`${helpId}-dates-help`} required value={draft.asOfDate} disabled={pending} onChange={e => setDraft({ ...draft, asOfDate: e.target.value })} />
          <datalist id={`${helpId}-dates`}>{options.reportingDates.map(date => <option key={date} value={date} />)}</datalist>
        </label>
        <label className="filter-label">Product
          <select className="filter-input" value={draft.productCode} disabled={pending} onChange={e => setDraft({ ...draft, productCode: e.target.value })}>
            {options.products.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        <div className="filter-label">Period
          <div className="mt-1.5 flex h-10 gap-1 rounded-lg border border-[#CBD0D8] bg-white p-1" role="group" aria-label="Reporting period">
            {(["MTD", "YTD"] as const).map(period => <button key={period} type="button" disabled={pending} aria-pressed={draft.periodMode === period} className={`min-w-0 flex-1 rounded px-3 text-xs font-semibold ${draft.periodMode === period ? "bg-[#CF2E2E] text-white" : "text-[#667085]"}`} onClick={() => {
              const next = { ...draft, periodMode: period }; setDraft(next); apply(next);
            }}>{period}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
          <button type="submit" disabled={pending} className="primary-button">{pending ? "Applying…" : "Apply"}</button>
          <button type="button" disabled={pending} className="secondary-button" onClick={() => {
            const reset = { ...initialFilters, roleView: DEFAULT_ROLE_VIEW, roId: scope.isLockedRo ? scope.effectiveRoIds[0] : "ALL", asOfDate: options.defaultDate, productCode: "PROD-ALL", periodMode: "MTD" as const };
            setDraft(reset); apply(reset);
          }}>Reset</button>
        </div>
      </div>
      <p id={`${helpId}-lens`} className="mt-3 text-xs text-[#667085]">Role View changes section order only. Your authorized portfolio and totals stay the same.</p>
      <p id={`${helpId}-dates-help`} className="mt-1 text-xs text-[#667085]">Use a reporting month-end or the available partial-month snapshot. Other dates show no data.</p>
      <p className="mt-3 text-xs text-[#667085]" aria-live="polite">{pending ? "Updating portfolio data…" : `Applied: ${options.roleViews.find(view => view.value === normalizeRoleView(initialFilters.roleView))?.label} · ${options.regions.find(r => r.id === initialFilters.regionId)?.name} · ${initialFilters.roId === "ALL" ? "All authorized ROs" : options.officers.find(o => o.id === initialFilters.roId)?.name} · ${initialFilters.asOfDate} · ${options.products.find(p => p.code === initialFilters.productCode)?.name} · ${initialFilters.periodMode}`}</p>
    </form>
    {children && (pending ? <section className="panel p-10 text-center text-sm text-[#667085]" role="status">Updating portfolio data…</section> : <div className="space-y-6" data-dashboard-results>{children}</div>)}
  </>;
}

// Existing later-phase routes retain their foundational filter strip.
export function WorkspaceFilterBar(props: Props) {
  const pathname = usePathname();
  if (pathname.endsWith("/dashboard") || pathname.startsWith("/regional/relationship-officers")) return null;
  return <div className="mb-6"><GlobalFilterBar {...props} /></div>;
}
