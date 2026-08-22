"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/config/nav";

interface SidebarLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}

export default function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: SidebarLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-icon",
        collapsed && "justify-center px-0",
        active
          ? "bg-icon/15 font-extrabold text-icon"
          : "font-semibold text-icon/70 hover:bg-icon/10 hover:text-icon",
      )}
    >
      {/* شريط المؤشر على جهة البداية (اليمين بالعربي) */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 start-0 w-1 rounded-full bg-icon"
        />
      )}
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
