import { notFound, redirect } from "next/navigation";
import { CustomerDetail } from "@/components/customers/customer-detail";
import { getCurrentSession } from "@/lib/server/security/auth";
import { getPerformanceRepository } from "@/lib/server/repository/repository-factory";

export default async function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return null;
  if (session.user.role !== "REGIONAL_MANAGER") redirect("/forbidden");
  const { customerId } = await params;
  const filters = { regionId: session.scope.effectiveRegionId, roId: "ALL", asOfDate: "2026-09-30", productCode: "PROD-ALL", periodMode: "MTD" as const, roleView: "portfolio-overview" as const };
  const repo = getPerformanceRepository();
  const [customers, investments] = await Promise.all([repo.getCustomerList(session.scope, filters), repo.getInvestmentList(session.scope, filters)]);
  const customer = customers.find(item => item.customerId === customerId);
  if (!customer) notFound();
  return <CustomerDetail customer={customer} investments={investments.filter(item => item.customerId === customerId)} backHref="/regional/customers" />;
}
