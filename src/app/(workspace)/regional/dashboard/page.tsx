import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import type { SearchParams } from "@/lib/filters";
export default function RegionalDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <PerformanceDashboard regional searchParams={searchParams} />;
}
