import { CustomerRecords } from "@/components/customers/customer-records";
import { getCurrentSession } from "@/lib/server/security/auth";
import { getPerformanceRepository } from "@/lib/server/repository/repository-factory";
import type { GlobalFilters } from "@/types/filter";
import { redirect } from "next/navigation";
import { FinancialSampleSection } from "@/components/financial-sample/financial-sample-section";
import type { SearchParams } from "@/lib/filters";

export default async function RoCustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const session = await getCurrentSession();
  if (!session) return null;
  if (session.user.role !== "RO") redirect("/forbidden");
  const filters = { regionId: session.scope.effectiveRegionId, roId: session.user.roId!, asOfDate: "2026-09-30", productCode: "PROD-ALL", periodMode: "MTD", roleView: "portfolio-overview" } satisfies GlobalFilters;
  const customers = await getPerformanceRepository().getCustomerList(session.scope, filters);
  if (raw.source !== "built-in") return <div className="space-y-8">
    <FinancialSampleSection raw={raw} regional={false} dashboardKey="financial_sample_customers" title="Customer Portfolio Analysis" description="My customer concentration and product analytics alongside the existing searchable customer records and detail workflow." />
    <div className="mx-auto max-w-[1500px]"><CustomerRecords customers={customers} basePath="/ro/customers" /></div>
  </div>;
  return <CustomerRecords customers={customers} basePath="/ro/customers" />;
}
