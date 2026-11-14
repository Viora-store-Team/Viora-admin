import {
  FileText,
  Flag,
  Image as ImageIcon,
  Headphones,
  Layers,
  LayoutGrid,
  Megaphone,
  Star,
  Store,
  ShoppingBag,
  TicketPercent,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/strings";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup | null;
  countKey?: NavCountKey;
}

export type NavCountKey = "stores" | "reports" | "support";
export type NavGroup = "manage" | "monitor" | "marketing" | "settings";
export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  manage: "الإدارة", monitor: "المراقبة", marketing: "التسويق", settings: "الإعدادات والمالية",
};

/** المصدر الوحيد لروابط السايدبار — نفس المصفوفة بتغذّي عنوان الصفحة بالتوب-بار */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: t.admin.nav.dashboard, icon: LayoutGrid, group: null },
  { href: "/stores", label: t.admin.nav.stores, icon: Store, group: "manage", countKey: "stores" },
  { href: "/users", label: t.admin.nav.users, icon: Users, group: "manage" },
  { href: "/orders", label: t.admin.nav.orders, icon: ShoppingBag, group: "manage" },
  { href: "/categories", label: t.admin.nav.categories, icon: Layers, group: "manage" },
  { href: "/reviews", label: t.admin.nav.reviews, icon: Star, group: "monitor" },
  { href: "/reports", label: t.admin.nav.reports, icon: Flag, group: "monitor", countKey: "reports" },
  { href: "/support", label: t.admin.nav.support, icon: Headphones, group: "monitor", countKey: "support" },
  { href: "/promo-codes", label: "أكواد الخصم", icon: TicketPercent, group: "marketing" },
  { href: "/broadcasts", label: "إشعارات للزبائن", icon: Megaphone, group: "marketing" },
  { href: "/banners", label: "بنرات التطبيق", icon: ImageIcon, group: "marketing" },
  { href: "/content", label: t.admin.nav.content, icon: FileText, group: "settings" },
  { href: "/finance", label: t.admin.nav.finance, icon: Wallet, group: "settings" },
];

/**
 * بيرجّع عنصر القائمة المطابق للمسار الحالي — **الأطول أولاً**.
 *
 * الترتيب مش تفصيل: `/` بادئة لكل مسار بالتطبيق. الشرط تحت بيحمي الجذر
 * لحاله (`${"/"}/` = `//` وما بتطابق شي، فـ `/` بينشط بالمطابقة التامة بس)،
 * بس الفرز بيضل ضروري لو انضافت لاحقاً روابط متداخلة زي `/reports/spam`.
 */
export function getActiveNavItem(
  pathname: string,
  items: NavItem[] = NAV_ITEMS,
): NavItem | undefined {
  return items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
