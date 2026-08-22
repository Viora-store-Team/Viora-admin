"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationInfo } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import Button from "./Button";

interface PaginationProps {
  pagination: PaginationInfo;
  disabled?: boolean;
  onChange: (page: number) => void;
}

/**
 * ترقيم الصفحات المشترك.
 *
 * كان مكوّن خاص بالمنتجات (`products/ProductPagination`) لكنه ما كان فيه أي
 * إشي خاص فيها — بينقرأ page/totalPages وبيرجّع الرقم الجديد. صار هون عشان
 * صفحات الأدمن تستخدمه بدل نسخة ثانية منه.
 */
export default function Pagination({
  pagination,
  disabled = false,
  onChange,
}: PaginationProps) {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={t.common.page}
      className="mt-4 flex items-center justify-center gap-3"
    >
      {/* بالـ RTL السهم لليمين بيعني "رجوع" — لهيك ChevronRight للسابق */}
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        icon={<ChevronRight className="size-4" aria-hidden="true" />}
      >
        {t.common.prev}
      </Button>

      <span className="ltr-nums text-xs font-bold text-text-secondary">
        {formatNumber(page)} / {formatNumber(totalPages)}
      </span>

      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        icon={<ChevronLeft className="size-4" aria-hidden="true" />}
      >
        {t.common.next}
      </Button>
    </nav>
  );
}
