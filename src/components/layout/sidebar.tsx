"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Briefcase,
  TrendingUp,
  Target,
  CalendarCheck,
  FileText,
  UserCheck,
  Shield,
  Layers,
  LayoutDashboard,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";

interface SidebarProps {
  role: UserRole;
  userName: string;
  userTitle: string;
  regionName: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function Sidebar({ role, userName, userTitle, regionName }: SidebarProps) {
  const pathname = usePathname();

  const roNavItems: NavItem[] = [
    { title: "My Dashboard", href: "/ro/dashboard", icon: LayoutDashboard },
    { title: "Portfolio Movement", href: "/ro/portfolio-movement", icon: TrendingUp },
    { title: "My Portfolio", href: "/ro/portfolio", icon: Layers },
    { title: "My Customers", href: "/ro/customers", icon: Users },
    { title: "Investments & Deals", href: "/ro/investments", icon: Briefcase },
    { title: "Profitability Analysis", href: "/ro/profitability", icon: BarChart3 },
    { title: "My Targets & Pace", href: "/ro/targets", icon: Target },
    { title: "Maturities & Rollovers", href: "/ro/maturities", icon: CalendarCheck },
    { title: "My Reports", href: "/ro/reports", icon: FileText },
  ];

  const regionalNavItems: NavItem[] = [
    { title: "Regional Dashboard", href: "/regional/dashboard", icon: Building2 },
    { title: "Portfolio Movement", href: "/regional/portfolio-movement", icon: TrendingUp },
    { title: "RO Performance", href: "/regional/relationship-officers", icon: UserCheck, badge: "Directory" },
    { title: "Regional Portfolio", href: "/regional/portfolio", icon: Layers },
    { title: "Customers Directory", href: "/regional/customers", icon: Users },
    { title: "Investments & Deals", href: "/regional/investments", icon: Briefcase },
    { title: "Profitability Analysis", href: "/regional/profitability", icon: BarChart3 },
    { title: "Targets & Pace", href: "/regional/targets", icon: Target },
    { title: "Maturities & Rollovers", href: "/regional/maturities", icon: CalendarCheck },
    { title: "Regional Reports", href: "/regional/reports", icon: FileText },
  ];

  const navItems = role === "REGIONAL_MANAGER" ? regionalNavItems : roNavItems;

  return (
    <aside className="w-64 bg-[#333333] text-white flex flex-col min-h-screen shrink-0 border-r border-[#444444] shadow-md select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#444444] flex items-center gap-3 bg-[#2A2A2A]">
        <div className="w-9 h-9 rounded-lg bg-[#CF2E2E] flex items-center justify-center font-bold text-white shadow-sm">
          PIS
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white leading-tight">
            PIS <span className="text-[#CF8D4D] text-xs font-normal ml-1">Enterprise</span>
          </h1>
          <p className="text-[11px] text-[#A0A0A0]">Performance Information System</p>
        </div>
      </div>

      {/* User Scope Badge */}
      <div className="px-4 py-3 bg-[#262626] border-b border-[#3E3E3E] text-xs">
        <div className="flex items-center gap-2 text-[#E0E0E0] font-medium">
          <Shield className="w-3.5 h-3.5 text-[#CF2E2E]" />
          <span>{role === "REGIONAL_MANAGER" ? "Regional Manager" : "Relationship Officer"}</span>
        </div>
        <p className="text-[11px] text-[#9E9E9E] mt-0.5 truncate">{regionName}</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-[#888888] uppercase">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-[#CF2E2E] text-white shadow-sm font-semibold"
                  : "text-[#D0D0D0] hover:bg-[#404040] hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-[#A0A0A0] group-hover:text-white"
                )}
              />
              <span className="truncate flex-1">{item.title}</span>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                    isActive ? "bg-white text-[#CF2E2E]" : "bg-[#4A4A4A] text-[#CF8D4D]"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Profile Link */}
      <div className="p-3 border-t border-[#444444] bg-[#2A2A2A]">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 p-2 rounded-md hover:bg-[#3E3E3E] transition-colors",
            pathname === "/profile" ? "bg-[#CF2E2E] text-white" : "text-[#E0E0E0]"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#741F24] border border-[#CF2E2E] flex items-center justify-center font-bold text-xs text-white">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate leading-tight text-white">{userName}</p>
            <p className="text-[11px] text-[#A0A0A0] truncate">{userTitle}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
