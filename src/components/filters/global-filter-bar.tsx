"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, RefreshCw, Check, SlidersHorizontal } from "lucide-react";
import { AuthorizedScope } from "@/types/auth";
import { GlobalFilters, PeriodMode } from "@/types/filter";
import { MOCK_PRODUCTS, MOCK_REGIONS, MOCK_USERS } from "@/mocks/fixtures";

interface GlobalFilterBarProps {
  scope: AuthorizedScope;
  initialFilters: GlobalFilters;
}

export function GlobalFilterBar({ scope, initialFilters }: GlobalFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [regionId, setRegionId] = useState(initialFilters.regionId);
  const [roId, setRoId] = useState(initialFilters.roId);
  const [asOfDate, setAsOfDate] = useState(initialFilters.asOfDate);
  const [productCode, setProductCode] = useState(initialFilters.productCode);
  const [periodMode, setPeriodMode] = useState<PeriodMode>(initialFilters.periodMode);

  // Available RO list for Regional Manager based on selected region
  const availableRos = Object.values(MOCK_USERS).filter(
    (u) => u.role === "RO" && scope.allowedRoIds.includes(u.roId || "")
  );

  const handleApply = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("regionId", scope.isLockedRegion ? scope.effectiveRegionId : regionId);
      params.set("roId", scope.isLockedRo ? scope.effectiveRoIds[0] : roId);
      params.set("asOfDate", asOfDate);
      params.set("productCode", productCode);
      params.set("periodMode", periodMode);

      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setRegionId(scope.effectiveRegionId);
    setRoId(scope.isLockedRo ? scope.effectiveRoIds[0] : "ALL");
    setAsOfDate("2026-09-30");
    setProductCode("PROD-ALL");
    setPeriodMode("MTD");

    startTransition(() => {
      router.push(pathname);
    });
  };

  const activeRegion = MOCK_REGIONS.find((r) => r.id === (scope.isLockedRegion ? scope.effectiveRegionId : regionId));

  return (
    <div className="bg-white border border-[#E4E7EC] rounded-xl p-4 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E7EC] pb-3 mb-3">
        <div className="flex items-center gap-2 text-[#24252B] font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-[#CF2E2E]" />
          <span>Global Filter Bar</span>
          <span className="text-xs font-normal text-[#667085] ml-2">
            Applies to all cards, tables and Superset visuals
          </span>
        </div>

        {/* MTD / YTD Toggle Switch */}
        <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 border border-[#E4E7EC] rounded-lg">
          <button
            onClick={() => setPeriodMode("MTD")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              periodMode === "MTD"
                ? "bg-[#CF2E2E] text-white shadow-xs"
                : "text-[#667085] hover:text-[#24252B]"
            }`}
          >
            MTD (Month-to-Date)
          </button>
          <button
            onClick={() => setPeriodMode("YTD")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              periodMode === "YTD"
                ? "bg-[#CF2E2E] text-white shadow-xs"
                : "text-[#667085] hover:text-[#24252B]"
            }`}
          >
            YTD (Year-to-Date)
          </button>
        </div>
      </div>

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
        {/* 1. Region Selector */}
        <div>
          <label className="block text-[11px] font-bold text-[#24252B] mb-1 flex items-center gap-1">
            Region
            {scope.isLockedRegion && <Lock className="w-3 h-3 text-[#667085]" />}
          </label>
          {scope.isLockedRegion ? (
            <div className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E4E7EC] rounded-lg text-xs font-semibold text-[#667085] flex items-center justify-between">
              <span>{activeRegion?.name || scope.effectiveRegionId}</span>
              <span className="text-[10px] bg-[#E4E7EC] px-1.5 py-0.5 rounded">Locked</span>
            </div>
          ) : (
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs font-medium text-[#24252B] focus:ring-2 focus:ring-[#CF2E2E] focus:outline-none"
            >
              {MOCK_REGIONS.filter((r) => scope.allowedRegionIds.includes(r.id)).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. RO Selector */}
        <div>
          <label className="block text-[11px] font-bold text-[#24252B] mb-1 flex items-center gap-1">
            Relationship Officer
            {scope.isLockedRo && <Lock className="w-3 h-3 text-[#667085]" />}
          </label>
          {scope.isLockedRo ? (
            <div className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E4E7EC] rounded-lg text-xs font-semibold text-[#667085] flex items-center justify-between">
              <span>{MOCK_USERS[scope.userId]?.name || scope.effectiveRoIds[0]}</span>
              <span className="text-[10px] bg-[#E4E7EC] px-1.5 py-0.5 rounded">Locked</span>
            </div>
          ) : (
            <select
              value={roId}
              onChange={(e) => setRoId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs font-medium text-[#24252B] focus:ring-2 focus:ring-[#CF2E2E] focus:outline-none"
            >
              <option value="ALL">All Officers in Region</option>
              {availableRos.map((ro) => (
                <option key={ro.roId} value={ro.roId}>
                  {ro.name} ({ro.roId})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 3. As-Of Date */}
        <div>
          <label className="block text-[11px] font-bold text-[#24252B] mb-1 flex items-center gap-1">
            As-Of Reporting Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs font-medium text-[#24252B] focus:ring-2 focus:ring-[#CF2E2E] focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Product Selector */}
        <div>
          <label className="block text-[11px] font-bold text-[#24252B] mb-1 flex items-center gap-1">
            Product Category
          </label>
          <select
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#E4E7EC] rounded-lg text-xs font-medium text-[#24252B] focus:ring-2 focus:ring-[#CF2E2E] focus:outline-none"
          >
            {MOCK_PRODUCTS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 lg:col-span-2">
          <button
            onClick={handleApply}
            disabled={isPending}
            className="flex-1 bg-[#CF2E2E] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#AA2227] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {isPending ? "Applying..." : "Apply Filters"}
          </button>
          <button
            onClick={handleReset}
            disabled={isPending}
            className="px-3 py-2 bg-[#F8F9FA] text-[#667085] border border-[#E4E7EC] rounded-lg text-xs font-semibold hover:bg-[#E4E7EC] transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Reset filters to default"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {scope.isLockedRo && (
        <p className="text-[11px] text-[#667085] mt-2 italic flex items-center gap-1">
          <Lock className="w-3 h-3 text-[#CF2E2E]" />
          <span>Restricted to your assigned Relationship Officer portfolio and region.</span>
        </p>
      )}
    </div>
  );
}
