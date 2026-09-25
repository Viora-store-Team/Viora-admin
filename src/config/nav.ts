import {
  FileText,
  Flag,
  ImageIcon,
  FolderTree,
  LayoutDashboard,
  Star,
  Store,
  Headphones,
  ShoppingBag,
  Truck,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/strings";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** المصدر الوحيد لروابط السايدبار — نفس المصفوفة بتغذّي عنوان الصفحة بالتوب-بار */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: t.admin.nav.dashboard, icon: LayoutDashboard },
  { href: "/stores", label: t.admin.nav.stores, icon: Store },
  { href: "/users", label: t.admin.nav.users, icon: Users },
  { href: "/categories", label: t.admin.nav.categories, icon: FolderTree },
  { href: "/reviews", label: t.admin.nav.reviews, icon: Star },
  { href: "/reports", label: t.admin.nav.reports, icon: Flag },
  { href: "/orders", label: t.admin.nav.orders, icon: ShoppingBag },
  { href: "/support", label: t.admin.nav.support, icon: Headphones },
  { href: "/banners", label: "بنرات التطبيق", icon: ImageIcon },
  { href: "/content", label: t.admin.nav.content, icon: FileText },
  { href: "/delivery", label: t.admin.nav.delivery, icon: Truck },
  { href: "/finance", label: t.admin.nav.finance, icon: Wallet },
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
