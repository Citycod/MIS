import { MprDashboardSection } from "@/components/dashboard/mpr-dashboard-section";
import type { SearchParams } from "@/lib/filters";

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <MprDashboardSection raw={await searchParams} regional
    dashboardKey="financial_sample_mpr_position" title="RO POSITION SUMMARY"
    description="TEAM PERFORMANCE SUMMARY with targets, balance-sheet positions, signed gaps and the required monthly run rate."
    note="Negative gaps and run rates mean the target has been exceeded; they are preserved as reported and do not recommend reducing investments." />;
}
