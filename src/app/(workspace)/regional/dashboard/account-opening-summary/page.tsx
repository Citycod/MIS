import { MprDashboardSection } from "@/components/dashboard/mpr-dashboard-section";
import type { SearchParams } from "@/lib/filters";

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <MprDashboardSection raw={await searchParams} regional
    dashboardKey="financial_sample_mpr_accounts" title="YTD ACCOUNT OPENING SUMMARY"
    description="Unique accounts opened through the selected cutoff, compared with the same prior-year window and the annual account target."
    note="This report uses a separate isolated synthetic account-opening dataset. Investment transactions are not counted as opened accounts." />;
}
