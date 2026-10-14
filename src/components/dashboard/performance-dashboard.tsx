import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { MonthlyPerformanceClient } from "@/components/dashboard/monthly-performance-client";
import { OfficerComparisonView } from "@/components/dashboard/officer-comparison-view";
import { ErrorPanel } from "@/components/ui/error-panel";
import { FILTER_KEYS, type SearchParams } from "@/lib/filters";
import { getPerformanceRepository } from "@/lib/server/repository/repository-factory";
import { getCurrentSession } from "@/lib/server/security/auth";
import { getFilterOptions } from "@/lib/server/security/filter-options";
import { FilterError, normalizeAuthorizedScope, ScopeError } from "@/lib/server/security/scope";
import type { GlobalFilters } from "@/types/filter";
import type { KpiSummary, MonthlyMovement, RoPerformanceItem } from "@/types/repository";

interface Props { searchParams: Promise<SearchParams>; regional?: boolean; roId?: string; comparisonOnly?: boolean }

export async function PerformanceDashboard({ searchParams, regional = false, roId, comparisonOnly = false }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (regional !== (session.user.role === "REGIONAL_MANAGER")) redirect("/forbidden");
  const raw = await searchParams;
  const source = raw.source === "csv" ? "csv" : raw.source === "built-in" ? "built-in" : "financial-sample";
  const options = getFilterOptions(session.user);
  let context;
  try {
    const requested: Record<string, string> = {};
    for (const key of FILTER_KEYS) {
      if (Array.isArray(raw[key])) throw new FilterError("Use only one value per filter.");
      if (typeof raw[key] === "string") requested[key] = raw[key];
    }
    if (roId) {
      if (!options.officers.some(officer => officer.id === roId)) throw new ScopeError("Officer is outside your authorized scope.");
      if (requested.roId && requested.roId !== roId) throw new ScopeError("Officer URL and filter do not match.");
      requested.roId = roId;
    }
    if (source === "financial-sample") {
      requested.startDate ??= "2026-01-01";
      requested.asOfDate = "2026-10-10";
    }
    context = normalizeAuthorizedScope(session.user, {
      ...requested,
      roId: requested.roId ?? (regional ? "ALL" : session.user.roId),
      periodMode: "YTD",
    } as Partial<GlobalFilters>);
  } catch (error) {
    if (error instanceof ScopeError) redirect("/forbidden");
    if (!(error instanceof FilterError)) throw error;
    return <><ErrorPanel title="Invalid dashboard filters" message={error.message} /><Link className="primary-button mt-4" href={regional ? "/regional/dashboard" : "/ro/dashboard"}>Reset dashboard filters</Link></>;
  }
  const repository = getPerformanceRepository();
  let kpis: KpiSummary | null = null;
  let repositoryMovement: MonthlyMovement[] = [];
  let officers: RoPerformanceItem[] = [];
  if (source === "built-in" || comparisonOnly) {
    [kpis, repositoryMovement, officers] = await Promise.all([
      repository.getKpiSummary(context.scope, context.filters),
      repository.getMonthlyMovement(context.scope, context.filters),
      comparisonOnly ? repository.getRoPerformanceComparison(context.scope, context.filters) : Promise.resolve([]),
    ]);
  }
  const startMonth = context.filters.startDate!.slice(0, 7);
  const endMonth = context.filters.asOfDate.slice(0, 7);
  const movement = repositoryMovement.filter(row => row.month >= startMonth && row.month <= endMonth);

  if (comparisonOnly) {
    return <OfficerComparisonView filters={context.filters} options={options} kpis={kpis} rows={officers} />;
  }

  return <MonthlyPerformanceClient
    filters={context.filters}
    options={options}
    scope={context.scope}
    source={source}
    kpis={kpis}
    movement={movement}
    regional={regional}
    selectedRoId={roId}
  />;
}
