"use client";

import { usePathname } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { isLivePage } from "@/lib/admin/client";
import { t } from "@/lib/strings";

/**
 * تنبيه إن أرقام **هالصفحة** تجريبية.
 *
 * موجود عشان ما حدا يقرأ "البلاغات المفتوحة: 7" ويحسبها حقيقية. بيقرأ من
 * `isLivePage` بدل علم عام، لأن القسم مربوط على مرحلتين: النظرة العامة
 * والمتاجر بتقرأ من السيرفر، والباقي لسا تجريبي. أول ما ينضاف مسار جديد
 * لـ `LIVE_PAGES` بالـ client، التنبيه بيختفي عن صفحته لحاله.
 */
export default function MockNotice() {
  const pathname = usePathname();

  if (isLivePage(pathname)) return null;

  return (
    <div
      role="note"
      className="mb-4 flex items-center gap-2 rounded-xl border border-warning/20 bg-warning-soft/70 px-4 py-2.5 text-xs font-bold text-warning"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      {t.admin.common.mockNotice}
    </div>
  );
}
