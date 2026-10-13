"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, UsersRound, WalletCards } from "lucide-react";
import type { CustomerSummaryItem } from "@/types/repository";
import { formatCurrency } from "@/lib/utils";

const PAGE_SIZE = 8;

export function CustomerRecords({ customers, basePath, showOfficer }: { customers: CustomerSummaryItem[]; basePath: string; showOfficer?: boolean }) {
  const [query, setQuery] = useState("");
  const [placementFilter, setPlacementFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter(customer => (!needle || [customer.customerId, customer.customerName, customer.accountNumber, customer.relationshipOfficerName].some(value => value.toLowerCase().includes(needle))) && (placementFilter === "all" || customer.activeInvestmentsCount > 0))
      .sort((a, b) => sort === "portfolio" ? b.totalPortfolio - a.totalPortfolio : sort === "placements" ? b.activeInvestmentsCount - a.activeInvestmentsCount : a.customerName.localeCompare(b.customerName));
  }, [customers, placementFilter, query, sort]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);
  const withPlacements = customers.filter(customer => customer.activeInvestmentsCount > 0).length;

  return <div className="space-y-5">
    <h2 className="text-xl font-semibold text-[#252525] sm:text-2xl">Customer Records</h2>
    <div className="grid gap-4 sm:grid-cols-3">
      <Summary icon={UsersRound} label="Total Customers" value={String(customers.length)} />
      <Summary icon={WalletCards} label="With Placements" value={String(withPlacements)} />
      <Summary icon={SlidersHorizontal} label="Inactive Customers" value="Unavailable" muted />
    </div>
    <section className="rounded-xl border border-[#E5E5E5] bg-white">
      <div className="grid gap-3 border-b border-[#E5E5E5] p-4 md:grid-cols-[1fr_190px_190px]">
        <label className="relative"><span className="sr-only">Search customers</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} className="h-11 w-full rounded-md border border-[#E5E5E5] pl-10 pr-3 text-sm" placeholder="Search customers" /></label>
        <select aria-label="Filter customers" value={placementFilter} onChange={event => { setPlacementFilter(event.target.value); setPage(1); }} className="h-11 rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"><option value="all">All customers</option><option value="placements">With placements</option></select>
        <select aria-label="Sort customers" value={sort} onChange={event => setSort(event.target.value)} className="h-11 rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"><option value="name">Sort: Customer name</option><option value="portfolio">Sort: Portfolio value</option><option value="placements">Sort: Placements</option></select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead><tr className="bg-[#FCF6F6] text-xs font-semibold text-[#737373]"><th className="px-5 py-3">Customer ID</th><th className="px-5 py-3">Customer Name</th><th className="px-5 py-3">Account Number</th>{showOfficer && <th className="px-5 py-3">Relationship Officer</th>}<th className="px-5 py-3 text-right">Portfolio Position</th><th className="px-5 py-3 text-center">Placements</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-[#E5E5E5]">{visible.map(customer => <tr key={customer.customerId} className="hover:bg-[#FFFBFB]"><td className="px-5 py-4 font-medium text-[#A51F27]">{customer.customerId}</td><td className="px-5 py-4 font-medium text-[#252525]">{customer.customerName}</td><td className="px-5 py-4 text-[#737373]">{customer.accountNumber}</td>{showOfficer && <td className="px-5 py-4">{customer.relationshipOfficerName}</td>}<td className="px-5 py-4 text-right tabular-nums">{formatCurrency(customer.totalPortfolio)}</td><td className="px-5 py-4 text-center">{customer.activeInvestmentsCount}</td><td className="px-5 py-4 text-right"><Link className="font-semibold text-[#A51F27] hover:underline" href={`${basePath}/${customer.customerId}`}>View details</Link></td></tr>)}</tbody>
        </table>
        {!visible.length && <p className="px-5 py-14 text-center text-sm text-[#737373]">No customer records match the current search.</p>}
      </div>
      <div className="flex items-center justify-between border-t border-[#E5E5E5] px-5 py-4 text-sm text-[#737373]"><span>{rows.length} record{rows.length === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><button className="rounded-md border border-[#E5E5E5] px-3 py-1.5 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{Math.min(page, pageCount)} of {pageCount}</span><button className="rounded-md border border-[#E5E5E5] px-3 py-1.5 disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
    </section>
  </div>;
}

function Summary({ icon: Icon, label, value, muted = false }: { icon: typeof UsersRound; label: string; value: string; muted?: boolean }) {
  return <div className="flex items-center gap-4 rounded-xl border border-[#E5E5E5] bg-white p-5"><div className="grid h-11 w-11 place-items-center rounded-lg bg-[#FCF6F6] text-[#A51F27]"><Icon size={20} /></div><div><p className="text-xs text-[#737373]">{label}</p><p className={`mt-1 font-semibold ${muted ? "text-sm text-[#737373]" : "text-xl text-[#252525]"}`}>{value}</p></div></div>;
}
