"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChartNoAxesCombined,
  ClipboardList,
  ChevronDown,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";
import { csrfFetch } from "@/lib/client/csrf";

interface SidebarProps { role: UserRole; canManageUsers?: boolean }
type NavigationItem = { title: string; href: string; icon: LucideIcon; matches: string[] };

export function Sidebar({ role, canManageUsers = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const base = role === "REGIONAL_MANAGER" ? "/regional" : "/ro";
  const dashboardChildren = [
    { title: "RO Profitability Summary", href: `${base}/dashboard/profitability-summary` },
    { title: "YTD Account Opening Summary", href: `${base}/dashboard/account-opening-summary` },
    { title: "RO Position Summary", href: `${base}/dashboard/position-summary` },
  ];
  const dashboardActive = pathname === `${base}/dashboard` || dashboardChildren.some(item => pathname.startsWith(item.href));
  const [dashboardOpen, setDashboardOpen] = useState(dashboardActive);
  const workspaceItems: NavigationItem[] = [
    { title: "Investment", href: `${base}/investments?source=financial-sample`, icon: FolderKanban, matches: [`${base}/investments`] },
    { title: "Customers", href: `${base}/customers?source=financial-sample`, icon: UsersRound, matches: [`${base}/customers`] },
    { title: "Concentration Risk", href: `${base}/concentration-risk?source=financial-sample`, icon: BarChart3, matches: [`${base}/concentration-risk`] },
    { title: "Target & Run Rate", href: `${base}/targets?source=financial-sample`, icon: Target, matches: [`${base}/targets`] },
    { title: "Export Data", href: `${base}/reports?source=financial-sample`, icon: ClipboardList, matches: [`${base}/reports`] },
  ];

  async function logout() {
    const response = await csrfFetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      dialog.current?.close();
      router.push("/login");
      router.refresh();
    }
  }

  function navigationLink(item: NavigationItem) {
    const active = item.matches.some(match => pathname === match || pathname.startsWith(`${match}/`));
    const Icon = item.icon;
    return <Link
      key={item.title}
      href={item.href}
      title={collapsed ? item.title : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
        active ? "bg-[#A51F27] text-white" : "text-[#252525] hover:bg-white",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon size={17} strokeWidth={1.8} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </Link>;
  }

  const navigation = (
    <aside
      className={cn("flex h-dvh shrink-0 flex-col overflow-hidden border-r border-[#F0DEDF] bg-[#FCF6F6] text-[#252525] transition-[width]", collapsed ? "w-[76px]" : "w-[240px]")}
      onClick={event => { if ((event.target as HTMLElement).closest("a")) dialog.current?.close(); }}
    >
      <div className={cn("flex h-[84px] shrink-0 items-center border-b border-[#F0DEDF]", collapsed ? "flex-col justify-center gap-1 px-2" : "justify-between px-5")}>
        <div className={cn("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
          <ChartNoAxesCombined size={28} strokeWidth={2.3} className="shrink-0 text-[#A51F27]" aria-hidden="true" />
          {!collapsed && <div className="min-w-0">
            <p className="text-[22px] font-bold leading-none tracking-[0.03em] text-[#651015]">SAMTL</p>
            <p className="mt-1 truncate text-[9px] text-[#737373]">Management Information System</p>
          </div>}
        </div>
        <button
          className="hidden rounded-md p-1.5 text-[#651015] hover:bg-white min-[1024px]:grid"
          onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5" aria-label="Primary navigation">
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A51F27]">Workspace</p>}
        <div className="space-y-1">
          <button
            type="button"
            title={collapsed ? "Dashboard" : undefined}
            aria-expanded={dashboardOpen}
            aria-controls="dashboard-submenu"
            className={cn(
              "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
              dashboardActive ? "bg-[#A51F27] text-white" : "text-[#252525] hover:bg-white",
              collapsed && "justify-center px-0",
            )}
            onClick={() => {
              if (collapsed) setCollapsed(false);
              setDashboardOpen(value => !value);
            }}
          >
            <LayoutGrid size={17} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <><span className="min-w-0 flex-1 truncate text-left">Dashboard</span><ChevronDown size={15} className={cn("shrink-0 transition-transform", dashboardOpen && "rotate-180")} /></>}
          </button>
          {!collapsed && dashboardOpen && <div id="dashboard-submenu" className="space-y-1 border-l border-[#E5C8CA] pl-3 ml-5">
            {dashboardChildren.map(item => {
              const active = pathname.startsWith(item.href);
              return <Link
                key={item.title}
                href={`${item.href}?source=financial-sample`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center rounded-lg px-3 text-[12px] font-medium leading-4 transition-colors",
                  active ? "bg-[#F2DADD] text-[#7A171D]" : "text-[#4B4B4B] hover:bg-white hover:text-[#651015]",
                )}
              >{item.title}</Link>;
            })}
          </div>}
          {workspaceItems.map(navigationLink)}
        </div>
      </nav>

      <div className="shrink-0 border-t border-[#F0DEDF] px-3 py-4">
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A51F27]">My account</p>}
        <div className="space-y-1">
          {navigationLink({ title: "My Profile", href: "/profile", icon: UserRound, matches: ["/profile"] })}
          {canManageUsers && navigationLink({ title: "User Administration", href: "/admin/users", icon: UsersRound, matches: ["/admin/users"] })}
          <button
            type="button"
            title={collapsed ? "Log Out" : undefined}
            className={cn("flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-[#252525] transition-colors hover:bg-white", collapsed && "justify-center px-0")}
            onClick={logout}
          >
            <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );

  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
    <div className="sticky top-0 hidden h-dvh min-[1024px]:block">{navigation}</div>
    <button className="fixed left-4 top-4 z-40 rounded-lg border border-[#E5E5E5] bg-white p-2.5 text-[#651015] shadow-sm min-[1024px]:hidden" aria-label="Open navigation" onClick={() => dialog.current?.showModal()}><Menu size={19} /></button>
    <dialog ref={dialog} aria-label="Main navigation" className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none bg-transparent p-0 backdrop:bg-black/35" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onClose={() => document.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')?.focus()}>
      <button autoFocus aria-label="Close navigation" className="absolute right-3 top-3 z-10 rounded-lg bg-white p-2 text-[#651015]" onClick={() => dialog.current?.close()}><X size={18} /></button>
      {navigation}
    </dialog>
  </>;
}
