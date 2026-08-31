"use client";

import {
  Activity,
  Briefcase,
  Coffee,
  Eye,
  EyeOff,
  Heart,
  Home,
  Moon,
  PartyPopper,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Tags,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatNumber } from "@/lib/format";
import type { OccasionFilter } from "@/lib/admin/types";

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

interface OccasionFilterListProps {
  occasions: OccasionFilter[];
  searchQuery: string;
  disabled: boolean;
  onSelectOccasion?: (item: OccasionFilter) => void;
  onAddNew: () => void;
  onEdit: (item: OccasionFilter) => void;
  onToggleActive: (item: OccasionFilter) => void;
  onToggleFeatured: (item: OccasionFilter) => void;
  onDelete: (item: OccasionFilter) => void;
}

export default function OccasionFilterList({
  occasions,
  searchQuery,
  disabled,
  onSelectOccasion,
  onAddNew,
  onEdit,
  onToggleActive,
  onToggleFeatured,
  onDelete,
}: OccasionFilterListProps) {
  const query = searchQuery.trim().toLowerCase();

  const filtered = occasions.filter((item) => {
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      item.slug.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Tags className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-heading">
          {searchQuery ? "لا توجد نتائج مطابقة للبحث" : "لا توجد وسوم وفلاتر مناسبات بعد"}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-text-secondary">
          {searchQuery
            ? "جرّب البحث باسم آخر أو مسح حقل البحث."
            : "أضف فلاتر المناسبات (مثل: عمل، سهرة، أعياد) لتسهيل تصفية الملابس حسب المناسبة."}
        </p>
        {!searchQuery && (
          <Button
            className="mt-5"
            onClick={onAddNew}
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            إضافة فلتر مناسبة جديد
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((item) => {
        const IconComponent = ICON_MAP[item.icon] || Sparkles;

        return (
          <div
            key={item.id}
            className={`group relative flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-2xs transition-all hover:shadow-md ${
              item.isActive ? "border-border" : "border-border/60 opacity-75"
            }`}
          >
            <div
              onClick={() => onSelectOccasion?.(item)}
              className="cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${
                      item.isActive
                        ? "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white"
                        : "bg-field-bg text-text-secondary"
                    }`}
                  >
                    <IconComponent className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-heading group-hover:text-primary transition">
                      {item.name}
                    </h3>
                    <p className="text-[11px] font-medium text-text-secondary dir-ltr text-right">
                      /{item.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.isFeaturedOnHome && (
                    <Badge tone="primary">
                      <Home className="ml-1 size-3" />
                      الرئيسية
                    </Badge>
                  )}
                  <Badge tone={item.isActive ? "success" : "neutral"}>
                    {item.isActive ? "نشط" : "معطل"}
                  </Badge>
                </div>
              </div>

              {item.description && (
                <p className="mt-3 text-xs leading-relaxed text-text-secondary line-clamp-2">
                  {item.description}
                </p>
              )}

              {item.targetCategories && item.targetCategories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.targetCategories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-lg bg-field-bg px-2 py-0.5 text-[10px] font-semibold text-text-secondary"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
              <span className="text-xs font-semibold text-text-secondary">
                <span className="font-extrabold text-heading">
                  {formatNumber(item.productsCount)}
                </span>{" "}
                منتج مرتبط
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggleActive(item)}
                  disabled={disabled}
                  title={item.isActive ? "تعطيل الفلتر" : "تفعيل الفلتر"}
                  className="h-8 px-2 text-text-secondary hover:text-heading"
                >
                  {item.isActive ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(item)}
                  disabled={disabled}
                  title="تعديل"
                  className="h-8 px-2 text-text-secondary hover:text-heading"
                >
                  <Pencil className="size-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(item)}
                  disabled={disabled}
                  title="حذف"
                  className="h-8 px-2 text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
