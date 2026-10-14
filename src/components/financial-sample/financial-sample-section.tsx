import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { SupersetEmbed } from "@/components/superset/superset-embed";
import { filterQuery, type SearchParams } from "@/lib/filters";
import { getCurrentSession } from "@/lib/server/security/auth";
import { normalizeAuthorizedScope } from "@/lib/server/security/scope";
import type { GlobalFilters } from "@/types/filter";

type DashboardKey =
  | "financial_sample_investments"
  | "financial_sample_customers"
  | "financial_sample_concentration"
  | "financial_sample_profitability"
  | "financial_sample_targets"
  | "financial_sample_export";

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export async function FinancialSampleSection({
  raw,
  dashboardKey,
  title,
  description,
  regional,
  allowExport = false,
}: {
  raw: SearchParams;
  dashboardKey: DashboardKey;
  title: string;
  description: string;
  regional: boolean;
  allowExport?: boolean;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (regional !== (session.user.role === "REGIONAL_MANAGER")) redirect("/forbidden");
  const filters = normalizeAuthorizedScope(session.user, {
    regionId: session.scope.effectiveRegionId,
    roId: single(raw.roId) ?? (session.user.role === "RO" ? session.user.roId : "ALL"),
    startDate: single(raw.startDate) ?? "2026-01-01",
    asOfDate: "2026-10-10",
    productCode: single(raw.productCode) ?? "PROD-ALL",
    periodMode: "YTD",
    roleView: "portfolio-overview",
  } satisfies Partial<GlobalFilters>).filters;
  const base = session.user.role === "REGIONAL_MANAGER" ? "/regional" : "/ro";
  const query = new URLSearchParams(filterQuery(filters));
  query.set("source", "financial-sample");
  const exportQuery = new URLSearchParams(filterQuery(filters));

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#E8E1E2] bg-white p-5 shadow-[0_1px_3px_rgba(101,16,21,0.05)]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F7E7E8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A51F27]">Synthetic financial sample</span>
          <span className="text-xs text-[#737373]">Cutoff: 10 Oct 2026</span>
        </div>
        <h1 className="text-xl font-extrabold text-[#24252B]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#667085]">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="secondary-button gap-2" href={`${base}/dashboard?${query}`}><ExternalLink size={14} /> Dashboard</Link>
        {allowExport && <a className="samtl-primary-button gap-2" href={`/api/financial-sample/export?${exportQuery}`}><Download size={14} /> Download scoped CSV</a>}
      </div>
    </div>

    {dashboardKey === "financial_sample_profitability" && <p className="rounded-lg border border-[#E8D5D7] bg-[#FCF6F6] px-4 py-3 text-xs leading-5 text-[#651015]">WHT, OPEX, management margin and final profitability are illustrative demo calculations. Deal margin remains separate. Calculation base meaning and production policies still require Finance approval.</p>}

    <section className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white" aria-label={`${title} in Apache Superset`}>
      <SupersetEmbed dashboardKey={dashboardKey} title={title} filters={filters} fullDashboard />
    </section>
    <p className="text-[11px] text-[#737373]">Synthetic demonstration data · Configured SAMTL product presentation mapping · Original source products retained for audit</p>
  </div>;
}
