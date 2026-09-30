"use client";

import { usePathname } from "next/navigation";
import { Headphones, Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { InstallButton } from "@/components/pwa/PwaProvider";
import { getActiveNavItem, NAV_ITEMS, type NavItem } from "@/config/nav";
import { t } from "@/lib/strings";
import NotificationsDropdown from "@/components/layout/NotificationsDropdown";
import { fetchSupportTickets } from "@/lib/admin/api";

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
  const [openTickets, setOpenTickets] = useState(0);

  useEffect(() => {
    let active = true;
    const loadOpenTickets = async () => {
      const res = await fetchSupportTickets({ page: 1, limit: 1, status: "OPEN" });
      if (active && res.success) setOpenTickets(res.pagination?.total ?? 0);
    };
    void loadOpenTickets();
    const interval = setInterval(() => void loadOpenTickets(), 45_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

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
        {current?.label ?? (pathname.startsWith("/support") ? t.admin.nav.support : t.app.name)}
      </p>

      <div className="ms-auto flex items-center gap-2">
        <InstallButton />
        <Link
          href="/support"
          aria-label={openTickets ? `تذاكر الدعم، ${openTickets} مفتوحة` : "تذاكر الدعم"}
          title="تذاكر الدعم"
          className="relative grid size-10 place-items-center rounded-xl bg-field-bg text-field-label transition hover:bg-primary-soft hover:text-primary"
        >
          <Headphones className="size-5" aria-hidden="true" />
          {openTickets > 0 && <span className="absolute -end-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-black leading-none text-white">{openTickets > 99 ? "99+" : openTickets}</span>}
        </Link>
        <NotificationsDropdown />
      </div>
    </header>
  );
}
