import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import type { SearchParams } from "@/lib/filters";
export default function OfficerComparisonPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <PerformanceDashboard regional comparisonOnly searchParams={searchParams} />;
}
