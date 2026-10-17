import { MprDashboardSection } from "@/components/dashboard/mpr-dashboard-section";
import type { SearchParams } from "@/lib/filters";

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <MprDashboardSection raw={await searchParams} regional={false}
    dashboardKey="financial_sample_mpr_profitability" title="RO PROFITABILITY SUMMARY"
    description="Relationship Officer income, funding cost, margins and illustrative profitability from the central financial reporting view."
    note="WHT and OPEX are synthetic policy assumptions for demonstration. Final profitability is illustrative until Finance approves the production calculation base and allocation rules." />;
}
