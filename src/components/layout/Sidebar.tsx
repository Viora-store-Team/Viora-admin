"use client";

import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { getActiveNavItem, NAV_ITEMS, type NavItem } from "@/config/nav";
import { t } from "@/lib/strings";
import { cn } from "@/lib/cn";
import SidebarLink from "./SidebarLink";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** الافتراضي كل روابط اللوحة — القشرة بتمرّرها صراحةً */
  items?: NavItem[];
  tagline?: string;
  roleLabel?: string;
  /** الاسم اللي بينعرض لما ما في جلسة محمّلة بعد */
  userFallback?: string;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  items = NAV_ITEMS,
  tagline = t.admin.tagline,
  roleLabel,
  userFallback = t.admin.owner,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const userName = user?.name || userFallback;
  const userInitial = userName.charAt(0).toUpperCase();
  const userRole = roleLabel ?? user?.role ?? t.admin.ownerRole;

  // نفس الدالة اللي بتشتق عنوان التوب-بار — مصدر واحد لمنطق "الرابط النشط"
  const activeHref = getActiveNavItem(pathname, items)?.href;

  // الدروار بالموبايل بيضل موسّع دايماً — الطيّ ميزة خاصة بسطح المكتب
  const renderContent = (collapsed: boolean) => (
    <>
      {/* البراند */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5",
          collapsed && "flex-col gap-4 px-2",
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/95 p-1.5">
          <Image src="/icons/original-logo.png" width={40} height={40} alt="شعار فيورا" className="size-full object-contain" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-icon">
              {t.app.name}
            </p>
            <p className="truncate text-xs text-icon/60">{tagline}</p>
          </div>
        )}

        {/*
          زر الطيّ — سطح المكتب فقط، جوّا السايدبار مش معلّق على حافته
          (بره كان بينحجب تحت التوب-بار لأن التوب-بار z-30).
          أيقونات PanelRight* بتوصف الحالة مباشرة، فما بنحتاج نلعب باتجاه سهم.
        */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t.nav.expand : t.nav.collapse}
          aria-expanded={!collapsed}
          title={collapsed ? t.nav.expand : t.nav.collapse}
          className="hidden size-9 shrink-0 place-items-center rounded-xl text-icon/70 transition hover:bg-icon/10 hover:text-icon lg:grid"
        >
          {collapsed ? (
            <PanelRightOpen className="size-5" aria-hidden="true" />
          ) : (
            <PanelRightClose className="size-5" aria-hidden="true" />
          )}
        </button>

        {/* زر إغلاق الدروار — موبايل فقط */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label={t.nav.closeMenu}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-icon/70 transition hover:bg-icon/10 hover:text-icon lg:hidden"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* الروابط */}
      <nav
        aria-label={tagline}
        className={cn("flex flex-1 flex-col gap-1 px-3", collapsed && "px-2")}
      >
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={activeHref === item.href}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
        ))}
      </nav>

      {/* أسفل السايدبار */}
      <div className="mt-auto border-t border-icon/10 p-3">
        <div className="relative">
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => setProfileOpen((open) => !open)}
            title={collapsed ? userName : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors hover:bg-icon/10",
              collapsed && "justify-center px-0",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-icon/15 text-sm font-bold text-icon">
              {userInitial}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-icon">{userName}</span>
                <span className="block truncate text-xs text-icon/60">{userRole}</span>
              </span>
            )}
            {!collapsed && <ChevronDown className={cn("size-4 shrink-0 text-icon/70 transition-transform", profileOpen && "rotate-180")} aria-hidden="true" />}
          </button>
          {profileOpen && (
            <div role="menu" className={cn("absolute bottom-full z-20 mb-2 min-w-48 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl", collapsed ? "start-full ms-2" : "inset-x-0")}>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setProfileOpen(false); setLogoutConfirmOpen(true); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span>{t.nav.logout}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── سطح المكتب: عمود ثابت ────────────────────────── */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col bg-primary transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        {renderContent(collapsed)}
      </aside>

      {/* ── الموبايل: دروار + طبقة تعتيم ─────────────────── */}
      <button
        type="button"
        onClick={onCloseMobile}
        aria-label={t.nav.closeMenu}
        tabIndex={mobileOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id="mobile-sidebar"
        role="dialog"
        aria-modal={mobileOpen}
        aria-label={t.nav.openMenu}
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 flex-col bg-primary shadow-2xl transition-transform duration-300 lg:hidden",
          // بالـ RTL الدروار بيطلع من اليمين، فالإخفاء لازم يكون بالاتجاه المعاكس
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full",
        )}
      >
        {renderContent(false)}
      </aside>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="تسجيل الخروج"
        body="هل أنت متأكد أنك تريد تسجيل الخروج؟"
        confirmLabel={t.nav.logout}
        onConfirm={() => { setLogoutConfirmOpen(false); onCloseMobile(); void logout(); }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}
