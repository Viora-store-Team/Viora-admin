"use client";

import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { getActiveNavItem, NAV_GROUP_LABELS, NAV_ITEMS, type NavCountKey, type NavGroup, type NavItem } from "@/config/nav";
import { t } from "@/lib/strings";
import { cn } from "@/lib/cn";
import SidebarLink from "./SidebarLink";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import IconButton from "@/components/ui/IconButton";
import Button from "@/components/ui/Button";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  items?: NavItem[];
  counts: Partial<Record<NavCountKey, number>>;
  tagline?: string;
  roleLabel?: string;
  userFallback?: string;
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, items = NAV_ITEMS, counts, tagline = t.admin.tagline, roleLabel, userFallback = t.admin.owner }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const userName = user?.name || userFallback;
  const userInitial = userName.charAt(0).toUpperCase();
  const userRole = roleLabel ?? user?.role ?? t.admin.ownerRole;
  const activeHref = getActiveNavItem(pathname, items)?.href;

  const renderContent = (isCollapsed: boolean) => {
    let lastGroup: NavGroup | null = null;
    return <>
      <div className={cn("flex items-center gap-3 px-4 py-5", isCollapsed && "flex-col gap-3 px-2")}>
        <Image src="/icons/original-logo.png" width={36} height={36} alt="شعار فيورا" className="size-9 shrink-0 object-contain" />
        {!isCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold text-heading">{t.app.name}</p><p className="truncate text-xs text-text-tertiary">{tagline}</p></div>}
        <IconButton label={isCollapsed ? t.nav.expand : t.nav.collapse} icon={isCollapsed ? <PanelRightOpen className="size-5" strokeWidth={1.75} aria-hidden="true" /> : <PanelRightClose className="size-5" strokeWidth={1.75} aria-hidden="true" />} variant="ghost" size="sm" onClick={onToggleCollapse} aria-expanded={!isCollapsed} className="hidden lg:inline-grid" />
        <IconButton label={t.nav.closeMenu} icon={<X className="size-5" strokeWidth={1.75} aria-hidden="true" />} variant="ghost" size="sm" onClick={onCloseMobile} className="lg:hidden" />
      </div>
      <nav aria-label={tagline} className={cn("flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3", isCollapsed && "px-2")}>
        {items.map((item) => {
          const groupChanged = item.group !== lastGroup;
          lastGroup = item.group;
          return <div key={item.href}>
            {groupChanged && item.group && (isCollapsed ? <div aria-hidden="true" className="mx-3 mt-4 mb-2 border-t border-border" /> : <p className="px-3 pt-4 pb-1.5 text-xs font-medium text-text-tertiary">{NAV_GROUP_LABELS[item.group]}</p>)}
            <SidebarLink item={item} active={activeHref === item.href} collapsed={isCollapsed} count={item.countKey ? counts[item.countKey] : undefined} onNavigate={onCloseMobile} />
          </div>;
        })}
      </nav>
      <div className="mt-auto border-t border-border p-3">
        <div className="relative min-w-0">
          <button type="button" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen((open) => !open)} title={isCollapsed ? userName : undefined}
            className={cn("flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl border border-border px-2 py-2 text-start transition-colors hover:bg-surface-muted", isCollapsed && "justify-center px-0")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{userInitial}</span>
            {!isCollapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-heading">{userName}</span><span className="block truncate text-xs text-text-tertiary">{userRole}</span></span>}
            {!isCollapsed && <ChevronDown className={cn("size-4 shrink-0 text-text-tertiary transition-transform", profileOpen && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />}
          </button>
          {profileOpen && <div role="menu" className={cn("absolute bottom-full z-20 mb-2 min-w-48 overflow-hidden rounded-2xl border border-border bg-surface p-1 shadow-pop animate-[viora-drop-in_200ms_ease-out]", isCollapsed ? "start-full ms-2" : "inset-x-0")}>
            <Button role="menuitem" variant="ghost" size="sm" onClick={() => { setProfileOpen(false); setLogoutConfirmOpen(true); }} className="w-full justify-start text-danger hover:bg-danger-soft hover:text-danger" icon={<LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />}>{t.nav.logout}</Button>
          </div>}
        </div>
      </div>
    </>;
  };

  return <>
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-border bg-surface transition-[width] duration-200 lg:flex", collapsed ? "w-[76px]" : "w-66")}>{renderContent(collapsed)}</aside>
    <button type="button" onClick={onCloseMobile} aria-label={t.nav.closeMenu} tabIndex={mobileOpen ? 0 : -1} className={cn("fixed inset-0 z-40 bg-heading/40 transition-opacity duration-200 lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} />
    <aside id="mobile-sidebar" role="dialog" aria-modal={mobileOpen} aria-label={t.nav.openMenu} aria-hidden={!mobileOpen}
      className={cn("fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e border-border bg-surface shadow-pop transition-transform duration-[250ms] lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full")}>{renderContent(false)}</aside>
    <ConfirmDialog open={logoutConfirmOpen} title="تسجيل الخروج" body="هل أنت متأكد أنك تريد تسجيل الخروج؟" confirmLabel={t.nav.logout} onConfirm={() => { setLogoutConfirmOpen(false); onCloseMobile(); void logout(); }} onCancel={() => setLogoutConfirmOpen(false)} />
  </>;
}
