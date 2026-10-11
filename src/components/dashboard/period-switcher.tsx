"use client";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { GlobalFilters } from "@/types/filter";
import { filterQuery } from "@/lib/filters";
export function PeriodSwitcher({ filters }: { filters: GlobalFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return <div className="inline-flex shrink-0 gap-1 rounded-lg border border-[#E4E7EC] bg-white p-1" role="group" aria-label="Performance and investment mix period" aria-busy={pending}>
    {(["MTD", "YTD"] as const).map(period => <button key={period} disabled={pending} aria-pressed={period === filters.periodMode} className={`min-h-8 rounded-md px-4 text-xs font-semibold ${period === filters.periodMode ? "bg-[#CF2E2E] text-white" : "text-[#667085] hover:bg-[#F8F9FA]"}`} onClick={() => startTransition(() => router.push(`${pathname}?${filterQuery({ ...filters, periodMode: period })}`, { scroll: false }))}>{period}</button>)}
  </div>;
}
