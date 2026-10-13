import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CustomerSummaryItem, InvestmentDealItem } from "@/types/repository";
import { formatCurrency } from "@/lib/utils";
import { InvestmentList } from "./investment-list";

export function CustomerDetail({ customer, investments, backHref }: { customer: CustomerSummaryItem; investments: InvestmentDealItem[]; backHref: string }) {
  return <div className="space-y-5">
    <div className="flex items-center gap-3"><Link href={backHref} aria-label="Back to customer records" className="grid h-10 w-10 place-items-center rounded-lg border border-[#E5E5E5] hover:bg-[#FCF6F6]"><ArrowLeft size={18} /></Link><div><h2 className="text-xl font-semibold text-[#252525] sm:text-2xl">{customer.customerName}</h2><p className="mt-1 text-sm text-[#737373]">{customer.customerId} · {customer.accountNumber}</p></div></div>
    <div className="grid gap-4 md:grid-cols-3">
      <InfoCard label="Customer Information"><Field label="Customer ID" value={customer.customerId} /><Field label="Account Number" value={customer.accountNumber} /><Field label="Customer Tier" value={customer.tier} /></InfoCard>
      <InfoCard label="Contact Information"><Field label="Email" value="Unavailable" /><Field label="Phone Number" value="Unavailable" /><Field label="Date Registered" value="Unavailable" /></InfoCard>
      <InfoCard label="Account Summary"><Field label="Portfolio Position" value={formatCurrency(customer.totalPortfolio)} /><Field label="Active Placements" value={String(customer.activeInvestmentsCount)} /><Field label="Relationship Officer" value={customer.relationshipOfficerName} /></InfoCard>
    </div>
    <InvestmentList investments={investments} />
  </div>;
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) { return <section className="rounded-xl border border-[#E5E5E5] bg-white p-5"><h3 className="mb-4 font-semibold text-[#252525]">{label}</h3><dl className="space-y-3">{children}</dl></section>; }
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-[#737373]">{label}</dt><dd className="mt-1 text-sm font-medium text-[#252525]">{value}</dd></div>; }
