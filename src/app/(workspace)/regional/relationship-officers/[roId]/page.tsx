import { PerformanceDashboard } from "@/components/dashboard/performance-dashboard";
import type { SearchParams } from "@/lib/filters";
export default async function OfficerDetailPage({ params, searchParams }: { params: Promise<{ roId: string }>; searchParams: Promise<SearchParams> }) {
  const { roId } = await params;
  return <PerformanceDashboard regional roId={roId} searchParams={searchParams} />;
}
