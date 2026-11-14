"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/config/nav";

interface SidebarLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  count?: number;
  onNavigate: () => void;
}

export default function SidebarLink({ item, active, collapsed, count, onNavigate }: SidebarLinkProps) {
  const Icon = item.icon;
  return <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
    title={collapsed ? item.label : undefined}
    className={cn("flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-heading", active && "bg-primary-soft font-bold text-primary hover:bg-primary-soft hover:text-primary", collapsed && "relative justify-center px-0")}>
    <span className="relative shrink-0">
      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      {collapsed && !!count && <span aria-hidden="true" className="absolute -end-1 -top-1 size-2 rounded-full bg-primary" />}
    </span>
    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
    {!collapsed && !!count && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-on-primary">{count > 99 ? "99+" : count}</span>}
  </Link>;
}
