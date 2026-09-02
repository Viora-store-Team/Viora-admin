"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/nav";
import { t } from "@/lib/strings";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * قشرة لوحة التحكم.
 *
 * بتملك حالة الدروار وحالة الطيّ وبتمرّرهن للسايدبار والتوب-بار، عشان ما نحتاج context.
 * الـ children بتيجي كـ prop من الـ layout (وهو Server Component)، فالصفحات بتضل تترندر
 * على السيرفر رغم إن هذا الملف "use client".
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /*
    القائمة بتنقرأ هون جوّا العميل مش بتنمرّر كـ prop من الـ layout —
    أيقونات lucide دوال، والدوال ما بتعبر حدود Server → Client. تمريرها
    كـ prop بيرمي "Functions cannot be passed directly to Client Components".
  */
  const items = NAV_ITEMS;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /*
    إغلاق الدروار عند تغيّر المسار (بيغطي كمان رجوع/تقدّم المتصفح).
    هذا تعديل حالة أثناء الرندر — النمط اللي بتوصي فيه React لاشتقاق حالة من قيمة متغيّرة،
    وأفضل من useEffect لأنه بينفّذ قبل ما المتصفح يرسم فما بيصير رندر زائد.
  */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  // إغلاق بـ Escape + منع تمرير الصفحة خلف الدروار
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-dvh bg-app-bg">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        items={items}
        tagline={t.admin.tagline}
        roleLabel={t.admin.ownerRole}
        userFallback={t.admin.owner}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMenu={() => setMobileOpen(true)}
          mobileOpen={mobileOpen}
          items={items}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
