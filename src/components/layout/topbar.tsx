"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import type { User } from "@/types/auth";

const pageNames: Record<string, string> = {
  dashboard: "Management Information System", customers: "Customer Records", "concentration-risk": "Concentration Risk",
  profitability: "Profitability", investments: "Investment Details", targets: "Targets",
  maturities: "Maturities", portfolio: "Portfolio", "relationship-officers": "Relationship Officers",
};

export function Topbar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname.split("/").filter(Boolean)[1] ?? "dashboard";
  const title = pageNames[segment] ?? "Management Information System";

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b border-[#F0DEDF] bg-[#FCF6F6] pl-20 pr-4 min-[1024px]:px-8">
      <h1 className="text-base font-semibold text-[#252525] sm:text-lg">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-[#252525]">{user.name}</p>
          <p className="text-xs text-[#737373]">{user.role === "REGIONAL_MANAGER" ? "Regional Manager" : "Relationship Officer"}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#A51F27] text-white" aria-hidden="true"><UserRound size={18} /></div>
        <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-lg text-[#651015] hover:bg-white" aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
      </div>
    </header>
  );
}
