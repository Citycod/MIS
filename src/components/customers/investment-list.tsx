"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { InvestmentDealItem } from "@/types/repository";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InvestmentList({ investments }: { investments: InvestmentDealItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<InvestmentDealItem | null>(null);
  function open(item: InvestmentDealItem) { setSelected(item); dialog.current?.showModal(); }
  return <>
    <section className="rounded-xl border border-[#E5E5E5] bg-white">
      <div className="border-b border-[#E5E5E5] px-5 py-4"><h3 className="font-semibold text-[#252525]">Investment Placements</h3></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="bg-[#FCF6F6] text-xs text-[#737373]"><th className="px-5 py-3">Fund ID</th><th className="px-5 py-3">Product</th><th className="px-5 py-3 text-right">Investment Amount</th><th className="px-5 py-3">Effective Date</th><th className="px-5 py-3">Maturity Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#E5E5E5]">{investments.map(item => <tr key={item.investmentId}><td className="px-5 py-4 font-medium text-[#A51F27]">{item.investmentId}</td><td className="px-5 py-4">{item.productName}</td><td className="px-5 py-4 text-right tabular-nums">{formatCurrency(item.principalAmount)}</td><td className="px-5 py-4">{formatDate(item.effectiveDate)}</td><td className="px-5 py-4">{formatDate(item.maturityDate)}</td><td className="px-5 py-4">{item.status}</td><td className="px-5 py-4 text-right"><button onClick={() => open(item)} className="font-semibold text-[#A51F27] hover:underline">View</button></td></tr>)}</tbody></table>{!investments.length && <p className="px-5 py-12 text-center text-sm text-[#737373]">No investment placements are available for this customer.</p>}</div>
    </section>
    <dialog ref={dialog} className="m-auto w-[min(92vw,680px)] rounded-xl border border-[#E5E5E5] bg-white p-0 shadow-2xl backdrop:bg-black/35" onClose={() => setSelected(null)}>
      {selected && <div><div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-5"><div><h3 className="text-lg font-semibold">Investment Details</h3><p className="mt-1 text-sm text-[#737373]">{selected.investmentId}</p></div><button aria-label="Close investment details" className="rounded-md p-2 hover:bg-[#FCF6F6]" onClick={() => dialog.current?.close()}><X size={19} /></button></div><div className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2"><Field label="Customer Name" value={selected.customerName} /><Field label="Product Type" value={selected.productName} /><Field label="Fund ID" value={selected.investmentId} /><Field label="Account Description" value="Unavailable" /><Field label="Investment Amount" value={formatCurrency(selected.principalAmount)} /><Field label="Tenor" value={`${selected.tenorDays} days`} /><Field label="Effective Date" value={formatDate(selected.effectiveDate)} /><Field label="Maturity Date" value={formatDate(selected.maturityDate)} /><Field label="Days to Maturity" value="Unavailable" /><Field label="Maturity Mandate" value="Unavailable" /><Field label="Interest Amount" value="Unavailable" /></div><div className="flex justify-end border-t border-[#E5E5E5] px-6 py-4"><button autoFocus className="samtl-primary-button min-h-10" onClick={() => dialog.current?.close()}>Close</button></div></div>}
    </dialog>
  </>;
}

function Field({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-[#737373]">{label}</p><p className="mt-1 text-sm font-semibold text-[#252525]">{value}</p></div>; }
