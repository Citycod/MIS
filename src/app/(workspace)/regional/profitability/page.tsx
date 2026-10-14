import { TrendingUp } from "lucide-react";
import { UnavailableReport } from "@/components/ui/unavailable-report";
import { FinancialSampleSection } from "@/components/financial-sample/financial-sample-section";
import type { SearchParams } from "@/lib/filters";
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  if (raw.source !== "built-in") return <FinancialSampleSection raw={raw} regional dashboardKey="financial_sample_profitability" title="Profitability Analysis" description="Recalculated WACC, pool rate, interest income and expense, and separately labelled margin and profitability levels." />;
  return <UnavailableReport title="Profitability" icon={TrendingUp} message="Approved regional profitability and WACC reporting values are not available in the current source." />;
}
