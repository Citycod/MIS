import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import type { SearchParams } from "@/lib/filters";
export default function RoDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <PerformanceDashboard searchParams={searchParams} />;
}
