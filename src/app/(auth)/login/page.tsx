"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { MOCK_USERS } from "@/mocks/fixtures";

export default function LoginPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState<string | null>(null);

  const handleLogin = async (userId: string) => {
    setLoadingUser(userId);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        const user = MOCK_USERS[userId];
        const targetRoute = user?.role === "REGIONAL_MANAGER" ? "/regional/dashboard" : "/ro/dashboard";
        router.push(targetRoute);
        router.refresh();
      }
    } finally {
      setLoadingUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl bg-white border border-[#E4E7EC] rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Branding Panel */}
        <div className="md:col-span-5 bg-[#741F24] text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#CF2E2E]/20 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#CF2E2E] flex items-center justify-center font-bold text-white shadow-md text-lg">
                MIS
              </div>
              <div>
                <h1 className="font-extrabold text-xl tracking-tight leading-tight">MIS Enterprise</h1>
                <p className="text-xs text-[#CF8D4D] font-medium">Management Information System</p>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight mb-3 text-white leading-snug">
              Relationship Officer & Regional Analytics Portal
            </h2>
            <p className="text-xs text-[#E0E0E0] leading-relaxed mb-6">
              Finance-grade monthly portfolio movement, target tracking, customer positions, and embedded Apache Superset reporting for Nigerian banking operations.
            </p>
          </div>

          <div className="pt-6 border-t border-white/10 text-[11px] text-[#D0D0D0] space-y-1">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#CF8D4D]" />
              Role-Based Access Control (RBAC)
            </p>
            <p>Direct CRM Database View Integration • Server-Side Security</p>
          </div>
        </div>

        {/* Right Authentication Panel */}
        <div className="md:col-span-7 p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-xl font-extrabold text-[#24252B] tracking-tight">Sign In to Your Workspace</h3>
            <p className="text-xs text-[#667085] mt-1">
              Select a development persona below to test role-aware data access.
            </p>
          </div>

          {/* Quick Persona Selectors */}
          <div className="space-y-3 mb-6">
            <p className="text-[11px] font-bold text-[#24252B] uppercase tracking-wider">
              1-Click Demo Personas
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {/* RO 1 */}
              <button
                onClick={() => handleLogin("USR-RO-001")}
                disabled={loadingUser !== null}
                className="w-full text-left p-3 rounded-xl border border-[#E4E7EC] hover:border-[#CF2E2E] hover:bg-[#FFF1EE] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F8F9FA] group-hover:bg-[#CF2E2E] group-hover:text-white text-[#24252B] flex items-center justify-center font-bold text-xs transition-colors">
                    RO
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#24252B] group-hover:text-[#CF2E2E]">
                      Adebayo Sterling
                    </p>
                    <p className="text-[11px] text-[#667085]">
                      Senior RO • Victoria Island (Lagos Region)
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#CF2E2E] transition-transform group-hover:translate-x-1" />
              </button>

              {/* RO 2 */}
              <button
                onClick={() => handleLogin("USR-RO-002")}
                disabled={loadingUser !== null}
                className="w-full text-left p-3 rounded-xl border border-[#E4E7EC] hover:border-[#CF2E2E] hover:bg-[#FFF1EE] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F8F9FA] group-hover:bg-[#CF2E2E] group-hover:text-white text-[#24252B] flex items-center justify-center font-bold text-xs transition-colors">
                    RO
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#24252B] group-hover:text-[#CF2E2E]">
                      Chioma Okonkwo
                    </p>
                    <p className="text-[11px] text-[#667085]">
                      RO • Ikeja Branch (Lagos Region)
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#CF2E2E] transition-transform group-hover:translate-x-1" />
              </button>

              {/* Regional Manager 1 */}
              <button
                onClick={() => handleLogin("USR-RM-001")}
                disabled={loadingUser !== null}
                className="w-full text-left p-3 rounded-xl border border-[#CF8D4D]/40 bg-[#FFFDF9] hover:border-[#CF2E2E] hover:bg-[#FFF1EE] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#CF8D4D]/10 text-[#CF8D4D] group-hover:bg-[#CF2E2E] group-hover:text-white flex items-center justify-center font-bold text-xs transition-colors">
                    RM
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#24252B] group-hover:text-[#CF2E2E] flex items-center gap-1.5">
                      Babatunde Folorunsho
                      <span className="text-[10px] bg-[#CF8D4D]/20 text-[#A96514] font-bold px-1.5 py-0.2 rounded uppercase">
                        Regional Manager
                      </span>
                    </p>
                    <p className="text-[11px] text-[#667085]">
                      Lagos Region (Controls RO-001 & RO-002)
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#CF2E2E] transition-transform group-hover:translate-x-1" />
              </button>

              {/* Regional Manager 2 */}
              <button
                onClick={() => handleLogin("USR-RM-002")}
                disabled={loadingUser !== null}
                className="w-full text-left p-3 rounded-xl border border-[#E4E7EC] hover:border-[#CF2E2E] hover:bg-[#FFF1EE] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F8F9FA] group-hover:bg-[#CF2E2E] group-hover:text-white text-[#24252B] flex items-center justify-center font-bold text-xs transition-colors">
                    RM
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#24252B] group-hover:text-[#CF2E2E]">
                      Aisha Bello
                    </p>
                    <p className="text-[11px] text-[#667085]">
                      Regional Manager • Abuja Region
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#667085] group-hover:text-[#CF2E2E] transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-[#667085] text-center">
            Development Mode • Authenticated via secure HTTP-only cookies
          </div>
        </div>
      </div>
    </div>
  );
}
