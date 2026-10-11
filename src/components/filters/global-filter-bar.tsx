"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, SlidersHorizontal } from "lucide-react";
import { AuthorizedScope } from "@/types/auth";
import { GlobalFilters } from "@/types/filter";
import { DEFAULT_DATE, filterQuery } from "@/lib/filters";

export interface FilterOptions {
  regions: { id: string; name: string }[];
  officers: { id: string; name: string; regionId: string }[];
  products: { code: string; name: string }[];
}
interface Props { scope: AuthorizedScope; initialFilters: GlobalFilters; options: FilterOptions }
export function GlobalFilterBar(props: Props) {
  return <FilterForm key={filterQuery(props.initialFilters)} {...props} />;
}
function FilterForm({ scope, initialFilters, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  const detail = /^\/regional\/relationship-officers\/.+/.test(pathname);
  function apply(filters: GlobalFilters) {
    const path = detail ? (filters.roId === "ALL" ? "/regional/dashboard" : `/regional/relationship-officers/${filters.roId}`) : pathname;
    startTransition(() => router.push(`${path}?${filterQuery(filters)}`, { scroll: false }));
  }
  return (
    <form aria-label="Global filters" aria-busy={pending} onSubmit={e => { e.preventDefault(); apply(draft); }} className="rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={15} className="text-[#CF2E2E]" /> Portfolio filters</span>
        <span className="text-[#667085]">{scope.isLockedRo ? "Region and officer restricted to your assigned portfolio" : "Only your authorized regions and officers"}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1fr_1.2fr_auto]">
        <label className="filter-label">Region {scope.isLockedRegion && <Lock size={11} className="inline" />}
          <select className="filter-input" value={draft.regionId} disabled={scope.isLockedRegion || pending} onChange={e => setDraft({ ...draft, regionId: e.target.value, roId: "ALL" })}>
            {options.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="filter-label">Relationship Officer {scope.isLockedRo && <Lock size={11} className="inline" />}
          <select className="filter-input" value={draft.roId} disabled={scope.isLockedRo || pending} onChange={e => setDraft({ ...draft, roId: e.target.value })}>
            {!scope.isLockedRo && <option value="ALL">All ROs in region</option>}
            {options.officers.filter(o => o.regionId === draft.regionId).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="filter-label">Date
          <input className="filter-input" type="date" required value={draft.asOfDate} disabled={pending} onChange={e => setDraft({ ...draft, asOfDate: e.target.value })} />
        </label>
        <label className="filter-label">Product
          <select className="filter-input" value={draft.productCode} disabled={pending} onChange={e => setDraft({ ...draft, productCode: e.target.value })}>
            {options.products.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={pending} className="primary-button">{pending ? "Applying…" : "Apply"}</button>
          <button type="button" disabled={pending} className="secondary-button" onClick={() => {
            const reset = { ...initialFilters, roId: scope.isLockedRo ? scope.effectiveRoIds[0] : "ALL", asOfDate: DEFAULT_DATE, productCode: "PROD-ALL", periodMode: "MTD" as const };
            setDraft(reset); apply(reset);
          }}>Reset</button>
        </div>
      </div>
      <p className="mt-3 text-xs text-[#667085]" aria-live="polite">{pending ? "Updating portfolio data…" : `Applied: ${options.regions.find(r => r.id === initialFilters.regionId)?.name} · ${initialFilters.roId === "ALL" ? "All authorized ROs" : options.officers.find(o => o.id === initialFilters.roId)?.name} · ${initialFilters.asOfDate} · ${options.products.find(p => p.code === initialFilters.productCode)?.name}`}</p>
    </form>
  );
}

// Existing later-phase routes retain their foundational filter strip.
export function WorkspaceFilterBar(props: Props) {
  const pathname = usePathname();
  if (pathname.endsWith("/dashboard") || pathname.startsWith("/regional/relationship-officers")) return null;
  return <div className="mb-6"><GlobalFilterBar {...props} /></div>;
}
