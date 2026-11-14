"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Headphones, Menu } from "lucide-react";
import { InstallButton } from "@/components/pwa/PwaProvider";
import IconButton from "@/components/ui/IconButton";
import { getActiveNavItem, NAV_ITEMS, type NavCountKey, type NavItem } from "@/config/nav";
import { t } from "@/lib/strings";
import NotificationsDropdown from "@/components/layout/NotificationsDropdown";

interface TopbarProps {
  onOpenMenu: () => void;
  mobileOpen: boolean;
  items?: NavItem[];
  counts: Partial<Record<NavCountKey, number>>;
}

export default function Topbar({ onOpenMenu, mobileOpen, items = NAV_ITEMS, counts }: TopbarProps) {
  const pathname = usePathname();
  const current = getActiveNavItem(pathname, items);
  const openTickets = counts.support;
  return <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
    <IconButton label={t.nav.openMenu} icon={<Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />} onClick={onOpenMenu} aria-expanded={mobileOpen} aria-controls="mobile-sidebar" className="lg:hidden" />
    <p className="truncate text-xl font-bold text-heading">{current?.label ?? (pathname.startsWith("/support") ? t.admin.nav.support : t.app.name)}</p>
    <div className="ms-auto flex items-center gap-2">
      <InstallButton />
      <Link href="/support" aria-label={openTickets ? `تذاكر الدعم، ${openTickets} مفتوحة` : "تذاكر الدعم"} title="تذاكر الدعم" className="relative inline-grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-icon transition-colors duration-150 hover:bg-primary-soft hover:text-primary">
        <Headphones className="size-5" strokeWidth={1.75} aria-hidden="true" />
        {!!openTickets && <span className="absolute -end-1 -top-1 rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary">{openTickets > 99 ? "99+" : openTickets}</span>}
      </Link>
      <NotificationsDropdown />
    </div>
  </header>;
}
