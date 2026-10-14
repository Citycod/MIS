"use client";

import { useEffect, useRef, useState } from "react";
import type { EmbeddedDashboard } from "@superset-ui/embedded-sdk";
import type { GlobalFilters } from "@/types/filter";

export function SupersetEmbed({ dashboardKey, title, filters, fullDashboard = false }: { dashboardKey: string; title: string; filters: GlobalFilters; fullDashboard?: boolean }) {
  const mount = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const serialized = JSON.stringify(filters);
  const financialSample = dashboardKey.startsWith("financial_sample_");
  useEffect(() => {
    const controller = new AbortController();
    let embedded: EmbeddedDashboard | undefined;
    async function credentials() {
      const response = await fetch("/api/superset/guest-token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardKey, filters: JSON.parse(serialized) }),
        signal: controller.signal, cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Sign in again." : "Charts are temporarily unavailable. Check the local analytics service.");
      return response.json();
    }
    async function start() {
      try {
        const initial = await credentials();
        const { embedDashboard } = await import("@superset-ui/embedded-sdk");
        if (controller.signal.aborted || !mount.current) return;
        let first = true;
        embedded = await embedDashboard({
          id: initial.dashboardId, supersetDomain: initial.supersetDomain, mountPoint: mount.current,
          iframeTitle: `${title} — synthetic data`, referrerPolicy: "strict-origin-when-cross-origin",
          fetchGuestToken: async () => {
            if (first) { first = false; return initial.token; }
            try { return (await credentials()).token; }
            catch (failure) {
              if (!controller.signal.aborted) { embedded?.unmount(); setError(failure instanceof Error ? failure.message : "Analytics session ended."); }
              throw failure;
            }
          },
          dashboardUiConfig: {
            hideTitle: true, hideTab: true, hideChartControls: !financialSample,
            filters: { visible: financialSample, expanded: false },
            urlParams: { show_filters: financialSample ? "1" : "0", expand_filters: "0" },
          },
        });
        if (controller.signal.aborted) { embedded.unmount(); return; }
        // Superset renders its own query loading, empty and error states inside the frame.
        // getChartStates represents interactive chart state, not request completion.
        setReady(true);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to load analytics.");
      }
    }
    void start();
    return () => { controller.abort(); embedded?.unmount(); };
  }, [dashboardKey, title, serialized, attempt, fullDashboard, financialSample]);
  const height = financialSample
    ? dashboardKey === "financial_sample_overview"
      ? "h-[2200px] sm:h-[1800px] lg:h-[1450px]"
      : "h-[1500px] sm:h-[1200px] lg:h-[980px]"
    : fullDashboard ? "h-[1280px] sm:h-[980px] lg:h-[700px]" : "h-[320px]";
  return <div className={fullDashboard ? "relative" : "relative m-3"} data-superset-state={error ? "error" : ready ? "ready" : "loading"}>
    <div ref={mount} className={`${height} w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0 ${error ? "hidden" : ""}`} />
    {!ready && !error && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/95 text-sm text-[#667085]">Loading synthetic analytics…</div>}
    {error && <div role="alert" className={`flex ${height} flex-col items-center justify-center gap-3 px-4 text-center text-sm text-[#737373]`}><p>{error}</p><button className="primary-button" onClick={() => { setError(""); setReady(false); setAttempt(value => value + 1); }}>Retry analytics</button></div>}
    {!fullDashboard && <p className="px-2 pt-1 text-[10px] text-[#737373]">Synthetic development data · Apache Superset</p>}
  </div>;
}
