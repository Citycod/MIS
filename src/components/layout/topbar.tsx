"use client";

import { useState } from "react";
import { LogOut, UserCheck, ShieldCheck, ChevronDown } from "lucide-react";
import { User } from "@/types/auth";
import { MOCK_USERS } from "@/mocks/fixtures";

interface TopbarProps {
  user: User;
}

export function Topbar({ user }: TopbarProps) {
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [error, setError] = useState("");

  const handleSwitchUser = async (newUserId: string) => {
    setIsSwitching(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUserId }),
      });
      if (!response.ok) throw new Error("Unable to switch demo persona");
      const targetUser = MOCK_USERS[newUserId];
      const targetRoute = targetUser?.role === "REGIONAL_MANAGER" ? "/regional/dashboard" : "/ro/dashboard";
      window.location.assign(targetRoute);
    } catch {
      setError("Could not switch persona. Please retry.");
    } finally {
      setIsSwitching(false);
      setShowSwitchMenu(false);
    }
  };

  const handleLogout = async () => {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      // Clear the previous persona's client router cache with a full document navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {
      setError("Could not sign out. Please retry.");
    }
  };

  return (
    <header className="min-h-16 bg-white border-b border-[#E4E7EC] pl-16 pr-3 lg:px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      <div className="hidden text-xs font-semibold tracking-wide text-[#667085] xl:block">MANAGEMENT INFORMATION SYSTEM</div>
      <span className="rounded border border-[#E4E7EC] bg-[#F8F9FA] px-2 py-1 text-[10px] font-semibold text-[#667085] xl:hidden">MIS · DEMO</span>

      {error && <p role="alert" className="text-xs text-[#B42318]">{error}</p>}
      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
            disabled={isSwitching}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#FFF1EE] border border-[#CF2E2E]/20 text-[#CF2E2E] rounded-md text-xs font-semibold hover:bg-[#CF2E2E] hover:text-white transition-colors cursor-pointer"
            title="Switch demo persona for testing"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Demo persona</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showSwitchMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E4E7EC] rounded-lg shadow-lg py-2 z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#667085] border-b border-[#E4E7EC]">
                Select Demo Persona
              </div>
              {Object.values(MOCK_USERS).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-[#F8F9FA] transition-colors cursor-pointer ${
                    u.id === user.id ? "bg-[#FFF1EE] border-l-2 border-[#CF2E2E]" : ""
                  }`}
                >
                  <span className="font-semibold text-[#24252B] flex items-center justify-between">
                    {u.name}
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F0F0F0] text-[#667085]">
                      {u.role === "REGIONAL_MANAGER" ? "Manager" : "RO"}
                    </span>
                  </span>
                  <span className="text-[11px] text-[#667085]">{u.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="hidden items-center gap-2 border-l border-[#E4E7EC] pl-4 md:flex">
          <div className="w-8 h-8 rounded-full bg-[#741F24] text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-[#24252B] leading-tight flex items-center gap-1">
              {user.name}
              <ShieldCheck className="w-3.5 h-3.5 text-[#16794A]" />
            </p>
            <p className="text-[11px] text-[#667085] truncate">{user.title}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 text-[#667085] hover:text-[#CF2E2E] hover:bg-[#FFF1EE] rounded-md transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
