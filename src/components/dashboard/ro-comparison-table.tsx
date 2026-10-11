"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Search } from "lucide-react";
import type { RoPerformanceItem } from "@/types/repository";
import type { GlobalFilters } from "@/types/filter";
import { filterQuery } from "@/lib/filters";
import { formatCurrency, formatPercent } from "@/lib/utils";
const columns = [
  ["roName", "Relationship Officer"], ["closingPosition", "Closing position"], ["targetAmount", "Annual target"],
  ["achievementPercentage", "Achievement"], ["gapAmount", "Remaining gap"], ["monthlyNetMovement", "Monthly net movement"],
  ["requiredPaceMonthly", "Monthly pace"], ["wacc", "WACC"], ["profitability", "Profitability"],
] as const;
type SortKey = typeof columns[number][0];
export function RoComparisonTable({ rows, filters }: { rows: RoPerformanceItem[]; filters: GlobalFilters }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("closingPosition");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const visible = rows.filter(r => `${r.roName} ${r.branchName} ${r.roId}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    const left = a[sort], right = b[sort];
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    const order = sort === "roName" ? left.localeCompare(right) : Number(left) - Number(right);
    return direction === "asc" ? order : -order;
  });
  return <section className="panel" aria-labelledby="ro-comparison-heading">
    <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
      <div><h2 id="ro-comparison-heading" className="text-base font-semibold">Relationship Officer comparison</h2><p className="mt-1 text-xs text-[#667085]">Position, target gap and pace · Select an officer to view performance</p></div>
      <label className="relative block sm:w-64"><Search size={15} className="absolute left-3 top-3 text-[#667085]" /><span className="sr-only">Search officers or branches</span><input className="filter-input m-0! pl-9!" placeholder="Search officer or branch" value={search} onChange={e => setSearch(e.target.value)} /></label>
    </div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Officer comparison table; scroll horizontally for more columns">
      <table className="financial-table">
        <caption className="sr-only">Authorized RO performance in NGN as of {filters.asOfDate}</caption>
        <thead><tr>{columns.map(([key, label]) => <th key={key} scope="col" aria-sort={sort === key ? (direction === "asc" ? "ascending" : "descending") : "none"}>
          <button className="inline-flex min-h-8 items-center gap-1 cursor-pointer" onClick={() => { setSort(key); setDirection(sort === key && direction === "desc" ? "asc" : "desc"); }}>{label}{sort !== key ? <ArrowUpDown size={12} /> : direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</button>
        </th>)}</tr></thead>
        <tbody>{visible.map(ro => <tr key={ro.roId}>
          <td><Link className="flex items-center gap-2 font-semibold text-[#B52626] hover:underline" href={`/regional/relationship-officers/${ro.roId}?${filterQuery({ ...filters, roId: ro.roId })}`}>{ro.roName}<ArrowUpRight size={14} /></Link><span className="mt-1 block text-xs text-[#667085]">{ro.branchName} · {ro.roId}</span></td>
          {columns.slice(1).map(([key]) => <td key={key} className={key === "closingPosition" ? "font-semibold" : ""}>{ro[key] === null ? <span className="text-xs text-[#667085]">Pending definition</span> : key === "achievementPercentage" || key === "wacc" ? formatPercent(ro[key]) : formatCurrency(ro[key])}</td>)}
        </tr>)}</tbody>
      </table>
      {visible.length === 0 && <p className="p-8 text-center text-sm text-[#667085]">{rows.length ? "No officers match your search." : "No officer data for these filters."}</p>}
    </div>
    <p aria-live="polite" className="px-5 py-3 text-xs text-[#667085]">{visible.length} of {rows.length} authorized officers · WACC and profitability pending financial definition</p>
  </section>;
}
