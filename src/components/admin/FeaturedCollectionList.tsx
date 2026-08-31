"use client";

import {
  Eye,
  EyeOff,
  FolderHeart,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatNumber } from "@/lib/format";
import type { FeaturedCollection } from "@/lib/admin/types";

interface FeaturedCollectionListProps {
  collections: FeaturedCollection[];
  searchQuery: string;
  disabled: boolean;
  onAddNew: () => void;
  onEdit: (item: FeaturedCollection) => void;
  onToggleActive: (item: FeaturedCollection) => void;
  onDelete: (item: FeaturedCollection) => void;
}

export default function FeaturedCollectionList({
  collections,
  searchQuery,
  disabled,
  onAddNew,
  onEdit,
  onToggleActive,
  onDelete,
}: FeaturedCollectionListProps) {
  const query = searchQuery.trim().toLowerCase();

  const filtered = collections.filter((item) => {
    if (!query) return true;
    return (
      item.title.toLowerCase().includes(query) ||
      item.slug.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query) ||
      (item.badge && item.badge.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <FolderHeart className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-heading">
          {searchQuery ? "لا توجد مجموعات مطابقة للبحث" : "لا توجد مجموعات مميزة بعد"}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-text-secondary">
          {searchQuery
            ? "جرّب البحث باسم آخر أو مسح حقل البحث."
            : "أضف مجموعات خاصة (مثل: تشكيلة العيد، إطلالات العمل، سهرات 2026) لعرضها في الصفحة الرئيسية."}
        </p>
        {!searchQuery && (
          <Button
            className="mt-5"
            onClick={onAddNew}
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            إضافة مجموعة مميزة جديدة
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((item) => {
        return (
          <div
            key={item.id}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-surface shadow-2xs transition-all hover:shadow-md ${
              item.isActive ? "border-border" : "border-border/60 opacity-75"
            }`}
          >
            {/* رأس البطاقة مع الصورة إن وُجدت */}
            {item.imageUrl ? (
              <div className="relative h-32 w-full overflow-hidden bg-field-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {item.badge && (
                  <span className="absolute top-3 right-3 rounded-xl bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
            ) : (
              <div className="relative flex h-24 items-center justify-between bg-gradient-to-br from-primary-soft/50 to-primary/10 px-5">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="size-6" />
                  <span className="text-xs font-bold">مجموعة مميزة</span>
                </div>
                {item.badge && (
                  <Badge tone="primary">
                    {item.badge}
                  </Badge>
                )}
              </div>
            )}

            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-heading">{item.title}</h3>
                  <p className="text-[11px] font-medium text-text-secondary dir-ltr text-right">
                    /{item.slug}
                  </p>
                </div>
                <Badge tone={item.isActive ? "success" : "neutral"}>
                  {item.isActive ? "نشط" : "معطل"}
                </Badge>
              </div>

              {item.subtitle && (
                <p className="mt-2.5 text-xs leading-relaxed text-text-secondary line-clamp-2">
                  {item.subtitle}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
                <span className="text-xs font-semibold text-text-secondary">
                  <span className="font-extrabold text-heading">
                    {formatNumber(item.productsCount)}
                  </span>{" "}
                  منتج مشمول
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleActive(item)}
                    disabled={disabled}
                    title={item.isActive ? "تعطيل المجموعة" : "تفعيل المجموعة"}
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
          </div>
        );
      })}
    </div>
  );
}
