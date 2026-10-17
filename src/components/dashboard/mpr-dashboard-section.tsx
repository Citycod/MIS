import "server-only";

import { redirect } from "next/navigation";
import { SupersetEmbed } from "@/components/superset/superset-embed";
import { getCurrentSession } from "@/lib/server/security/auth";
import { normalizeAuthorizedScope } from "@/lib/server/security/scope";
import type { SearchParams } from "@/lib/filters";
import type { GlobalFilters } from "@/types/filter";

export type MprDashboardKey =
  | "financial_sample_mpr_profitability"
  | "financial_sample_mpr_accounts"
  | "financial_sample_mpr_position";

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export async function MprDashboardSection({
  raw,
  regional,
  dashboardKey,
  title,
  description,
  note,
}: {
  raw: SearchParams;
  regional: boolean;
  dashboardKey: MprDashboardKey;
  title: string;
  description: string;
  note: string;
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

  return <div className="mx-auto max-w-[1500px] space-y-4">
    <header className="rounded-xl border border-[#E8E1E2] bg-white p-5 shadow-[0_1px_3px_rgba(101,16,21,0.05)]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#F7E7E8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A51F27]">YTD</span>
        <span className="text-xs text-[#737373]">1 Jan – 10 Oct 2026 · Synthetic demonstration data</span>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-[#24252B]">{title}</h1>
      <p className="mt-1 max-w-4xl text-sm leading-6 text-[#667085]">{description}</p>
      <p className="mt-3 rounded-lg bg-[#FCF6F6] px-3 py-2 text-xs leading-5 text-[#651015]">{note}</p>
    </header>

    <section className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-white" aria-label={`${title} in Apache Superset`}>
      <SupersetEmbed dashboardKey={dashboardKey} title={title} filters={filters} fullDashboard />
    </section>
  </div>;
}
