import { CustomerRecords } from "@/components/customers/customer-records";
import { getCurrentSession } from "@/lib/server/security/auth";
import { getPerformanceRepository } from "@/lib/server/repository/repository-factory";
import type { GlobalFilters } from "@/types/filter";
import { redirect } from "next/navigation";

export default async function RoCustomersPage() {
  const session = await getCurrentSession();
  if (!session) return null;
  if (session.user.role !== "RO") redirect("/forbidden");
  const filters = { regionId: session.scope.effectiveRegionId, roId: session.user.roId!, asOfDate: "2026-09-30", productCode: "PROD-ALL", periodMode: "MTD", roleView: "portfolio-overview" } satisfies GlobalFilters;
  const customers = await getPerformanceRepository().getCustomerList(session.scope, filters);
  return <CustomerRecords customers={customers} basePath="/ro/customers" />;
}
