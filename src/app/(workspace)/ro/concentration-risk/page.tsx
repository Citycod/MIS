import { BarChart3 } from "lucide-react";
import { UnavailableReport } from "@/components/ui/unavailable-report";
import { FinancialSampleSection } from "@/components/financial-sample/financial-sample-section";
import type { SearchParams } from "@/lib/filters";
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  if (raw.source !== "built-in") return <FinancialSampleSection raw={raw} regional={false} dashboardKey="financial_sample_concentration" title="Concentration Risk Analysis" description="My product and customer allocation views based on the authorized synthetic event scope." />;
  return <UnavailableReport title="Concentration Risk" icon={BarChart3} message="An approved concentration-risk reporting source has not been supplied for this portfolio." />;
}
