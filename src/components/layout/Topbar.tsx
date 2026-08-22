"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { getActiveNavItem, NAV_ITEMS, type NavItem } from "@/config/nav";
import { t } from "@/lib/strings";

interface TopbarProps {
  onOpenMenu: () => void;
  mobileOpen: boolean;
  /** نفس القائمة اللي بالسايدبار — العنوان بينشتق منها */
  items?: NavItem[];
}

export default function Topbar({
  onOpenMenu,
  mobileOpen,
  items = NAV_ITEMS,
}: TopbarProps) {
  const pathname = usePathname();
  const current = getActiveNavItem(pathname, items);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-app-bg/80 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t.nav.openMenu}
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
        className="grid size-10 place-items-center rounded-xl bg-field-bg text-field-label transition hover:bg-primary-soft hover:text-primary lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <p className="truncate text-base font-extrabold text-heading">
        {current?.label ?? t.app.name}
      </p>

      <div className="ms-auto flex items-center gap-2">
        <button
          type="button"
          aria-label={t.nav.notifications}
          className="relative grid size-10 place-items-center rounded-xl bg-field-bg text-field-label transition hover:bg-primary-soft hover:text-primary"
        >
          <Bell className="size-5" aria-hidden="true" />
          <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-danger ring-2 ring-app-bg" />
        </button>
      </div>
    </header>
  );
}
