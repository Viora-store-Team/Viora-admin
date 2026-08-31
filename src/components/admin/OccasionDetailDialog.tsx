"use client";

import {
  Activity,
  Briefcase,
  Calendar,
  Coffee,
  Eye,
  EyeOff,
  Heart,
  Home,
  Moon,
  Package,
  PartyPopper,
  Pencil,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { OccasionFilter } from "@/lib/admin/types";
import { formatNumber } from "@/lib/format";

const ICON_MAP: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  briefcase: Briefcase,
  coffee: Coffee,
  heart: Heart,
  "party-popper": PartyPopper,
  moon: Moon,
  activity: Activity,
  sun: Sun,
};

interface OccasionDetailDialogProps {
  occasion: OccasionFilter | null;
  onClose: () => void;
  onEdit: (item: OccasionFilter) => void;
  onToggleActive: (item: OccasionFilter) => void;
  onToggleFeatured: (item: OccasionFilter) => void;
  onDelete: (item: OccasionFilter) => void;
}

export default function OccasionDetailDialog({
  occasion,
  onClose,
  onEdit,
  onToggleActive,
  onToggleFeatured,
  onDelete,
}: OccasionDetailDialogProps) {
  if (!occasion) return null;

  const IconComp = ICON_MAP[occasion.icon] || Sparkles;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* رأس النافذة */}
          <div className="flex items-start justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <IconComp className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-heading">{occasion.name}</h2>
                  <Badge tone={occasion.isActive ? "success" : "neutral"}>
                    {occasion.isActive ? "نشط" : "معطل"}
                  </Badge>
                  {occasion.isFeaturedOnHome && (
                    <Badge tone="primary">
                      <Home className="ml-1 size-3" />
                      الرئيسية
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-mono text-text-secondary dir-ltr text-right">
                  /{occasion.slug}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-text-secondary hover:bg-field-bg hover:text-heading"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* محتوى التفاصيل */}
          <div className="mt-5 flex flex-col gap-4">
            {/* الوصف */}
            {occasion.description && (
              <div className="rounded-xl border border-border bg-field-bg p-3.5">
                <p className="text-[11px] font-semibold text-text-secondary">الوصف التوضيحي</p>
                <p className="mt-1 text-xs leading-relaxed text-heading font-medium">
                  {occasion.description}
                </p>
              </div>
            )}

            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-field-bg p-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
                  <Package className="size-3.5 text-primary" />
                  <span>المنتجات المرتبطة</span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-heading ltr-nums">
                  {formatNumber(occasion.productsCount)} منتج
                </p>
              </div>

              <div className="rounded-xl border border-border bg-field-bg p-3">
                <p className="text-[11px] font-semibold text-text-secondary">ترتيب العرض</p>
                <p className="mt-1 text-xs font-bold text-heading ltr-nums">
                  #{occasion.sortOrder}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-field-bg p-3">
                <p className="text-[11px] font-semibold text-text-secondary">الظهور بالرئيسية</p>
                <p className="mt-1 text-xs font-bold text-heading">
                  {occasion.isFeaturedOnHome ? "مفعّل" : "غير مفعّل"}
                </p>
              </div>
            </div>

            {/* التصنيفات المشمولة */}
            {occasion.targetCategories && occasion.targetCategories.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-3.5">
                <p className="mb-2 text-[11px] font-semibold text-text-secondary">
                  التصنيفات المشمولة بهذا الفلتر:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {occasion.targetCategories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-lg bg-primary-soft/60 px-2.5 py-1 text-xs font-bold text-primary"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* أزرار الإجراءات */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  onDelete(occasion);
                }}
                icon={<Trash2 className="size-3.5" />}
              >
                حذف الفلتر
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onToggleActive(occasion);
                }}
                icon={occasion.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              >
                {occasion.isActive ? "تعطيل الفلتر" : "تفعيل الفلتر"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(occasion);
                }}
                icon={<Pencil className="size-3.5" />}
              >
                تعديل الفلتر
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
