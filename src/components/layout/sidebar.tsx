"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, FolderOpen, Gauge, Menu, PanelLeftClose, PanelLeftOpen, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

interface SidebarProps { role: UserRole }

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const base = role === "REGIONAL_MANAGER" ? "/regional" : "/ro";
  const items = [
    { title: "Dashboard", href: `${base}/dashboard`, icon: Gauge, matches: [`${base}/dashboard`, `${base}/relationship-officers`] },
    { title: "Customer Records", href: `${base}/customers`, icon: FolderOpen, matches: [`${base}/customers`, `${base}/investments`, `${base}/portfolio`] },
    { title: "Concentration Risk", href: `${base}/concentration-risk`, icon: BarChart3, matches: [`${base}/concentration-risk`] },
    { title: "Profitability", href: `${base}/profitability`, icon: TrendingUp, matches: [`${base}/profitability`] },
  ];

  const navigation = (
    <aside className={cn("flex h-dvh shrink-0 flex-col border-r border-[#F0DEDF] bg-[#FCF6F6] text-[#252525] transition-[width]", collapsed ? "w-[84px]" : "w-[248px]")} onClick={event => { if ((event.target as HTMLElement).closest("a")) dialog.current?.close(); }}>
      <div className={cn("flex h-24 items-center border-b border-[#F0DEDF]", collapsed ? "justify-center px-3" : "justify-between px-6")}>
        <div className={cn("samtl-wordmark text-lg!", collapsed && "sr-only")}>SAMTL</div>
        <button className="hidden rounded-lg p-2 text-[#651015] hover:bg-white min-[1024px]:grid" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
      </div>
      <nav className="flex-1 space-y-2 px-3 py-10" aria-label="Primary navigation">
        {items.map(item => {
          const active = item.matches.some(match => pathname === match || pathname.startsWith(`${match}/`));
          const Icon = item.icon;
          return <Link key={item.title} href={item.href} title={collapsed ? item.title : undefined} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center gap-4 rounded-md px-4 text-sm font-medium transition-colors", active ? "bg-[#A51F27] text-white" : "text-[#252525] hover:bg-white", collapsed && "justify-center px-0")}>
            <Icon size={19} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </Link>;
        })}
      </nav>
      {!collapsed && <div className="border-t border-[#F0DEDF] px-6 py-5"><p className="text-[11px] text-[#737373]">Authorized access only</p></div>}
    </aside>
  );

  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
    <div className="sticky top-0 hidden h-dvh min-[1024px]:block">{navigation}</div>
    <button className="fixed left-4 top-4 z-40 rounded-lg border border-[#E5E5E5] bg-white p-2.5 min-[1024px]:hidden" aria-label="Open navigation" onClick={() => dialog.current?.showModal()}><Menu size={19} /></button>
    <dialog ref={dialog} aria-label="Main navigation" className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none bg-transparent p-0 backdrop:bg-black/35" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onClose={() => document.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')?.focus()}>
      <button autoFocus aria-label="Close navigation" className="absolute right-3 top-3 z-10 rounded-lg bg-white p-2 text-[#651015]" onClick={() => dialog.current?.close()}><X size={18} /></button>
      {navigation}
    </dialog>
  </>;
}
