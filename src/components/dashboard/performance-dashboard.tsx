import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { MonthlyPerformanceClient } from "@/components/dashboard/monthly-performance-client";
import { ErrorPanel } from "@/components/ui/error-panel";
import { FILTER_KEYS, type SearchParams } from "@/lib/filters";
import { getCurrentSession } from "@/lib/server/security/auth";
import { getFilterOptions } from "@/lib/server/security/filter-options";
import { FilterError, normalizeAuthorizedScope, ScopeError } from "@/lib/server/security/scope";
import type { GlobalFilters } from "@/types/filter";

interface Props { searchParams: Promise<SearchParams>; regional?: boolean; roId?: string; comparisonOnly?: boolean }

export async function PerformanceDashboard({ searchParams, regional = false, roId }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (regional !== (session.user.role === "REGIONAL_MANAGER")) redirect("/forbidden");
  const raw = await searchParams;
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
  const source = raw.source === "csv" ? "csv" : "built-in";
  return <MonthlyPerformanceClient filters={context.filters} options={options} scope={context.scope} source={source} />;
}
