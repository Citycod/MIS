"use client";

import { useEffect, useState } from "react";
import { BarChart2, Server, ShieldCheck, AlertCircle, PieChart, LineChart } from "lucide-react";
import { SupersetDashboardConfig } from "@/types/superset";

interface SupersetDashboardPlaceholderProps {
  config: SupersetDashboardConfig;
  className?: string;
}

export function SupersetDashboardPlaceholder({ config, className = "" }: SupersetDashboardPlaceholderProps) {
  const [tokenStatus, setTokenStatus] = useState<string>("Initializing guest token broker...");
  const [guestToken, setGuestToken] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch("/api/superset/guest-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dashboardId: config.id }),
        });
        const data = await res.json();
        if (data.token) {
          setGuestToken(data.token);
          setTokenStatus("Guest Token Broker Verified (Development Mode)");
        } else {
          setTokenStatus("Token generation response pending");
        }
      } catch {
        setTokenStatus("Token broker unavailable");
      }
    }
    fetchToken();
  }, [config.id]);

  return (
    <div className={`bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFF1EE] border border-[#CF2E2E]/20 flex items-center justify-center text-[#CF2E2E]">
            {config.metricType === "product-mix" && <PieChart className="w-4 h-4" />}
            {config.metricType === "portfolio-movement" && <LineChart className="w-4 h-4" />}
            {config.metricType !== "product-mix" && config.metricType !== "portfolio-movement" && (
              <BarChart2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#24252B] leading-tight">{config.title}</h3>
            <p className="text-[11px] text-[#667085]">
              Apache Superset Embedded Analytics • Guest Token Security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF1EE] text-[#CF2E2E] border border-[#CF2E2E]/20 uppercase tracking-wider">
            Superset Only
          </span>
        </div>
      </div>

      {/* Placeholder Body */}
      <div className="bg-[#F8F9FA] border border-dashed border-[#CBD5E1] rounded-lg p-8 text-center flex flex-col items-center justify-center min-h-[260px]">
        <div className="w-12 h-12 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-3">
          <Server className="w-6 h-6 text-[#CF2E2E]" />
        </div>

        <h4 className="font-bold text-sm text-[#1E293B] mb-1">
          Apache Superset Embedded Canvas Placeholder
        </h4>
        <p className="text-xs text-[#64748B] max-w-md mb-4 leading-relaxed">
          This container embeds Apache Superset dashboard <code className="bg-[#E2E8F0] px-1.5 py-0.5 rounded text-[#0F172A] font-mono text-[11px]">{config.id}</code> via <code className="bg-[#E2E8F0] px-1.5 py-0.5 rounded text-[#0F172A] font-mono text-[11px]">@superset-ui/embedded-sdk</code>.
        </p>

        {/* Security Broker Status Badge */}
        <div className="bg-white border border-[#E4E7EC] rounded-md px-4 py-2 text-left w-full max-w-lg mb-4 text-xs">
          <div className="flex items-center justify-between text-[#24252B] font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-[#16794A]">
              <ShieldCheck className="w-4 h-4" />
              BFF Guest Token Security
            </span>
            <span className="text-[10px] text-[#667085]">RLS Filter Injected</span>
          </div>
          <p className="text-[11px] text-[#667085] truncate font-mono bg-[#F8F9FA] p-1.5 rounded border border-[#E4E7EC]">
            {tokenStatus}: {guestToken || "Processing..."}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#64748B]">
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-[#CF8D4D]" />
            Strictly No Frontend Math / No Fallback Chart Libraries
          </span>
        </div>
      </div>
    </div>
  );
}
