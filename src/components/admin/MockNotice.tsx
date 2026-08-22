"use client";

import { TriangleAlert } from "lucide-react";
import { ADMIN_USING_MOCK } from "@/lib/admin/client";
import { t } from "@/lib/strings";

/**
 * تنبيه دائم إن الأرقام تجريبية.
 *
 * موجود عشان ما حدا يقرأ "المتاجر النشطة: 19" ويحسبها حقيقية. بيختفي لحاله
 * أول ما ينحط NEXT_PUBLIC_ADMIN_MOCK=false — بلا تعديل ولا حذف يدوي.
 */
export default function MockNotice() {
  if (!ADMIN_USING_MOCK) return null;

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
