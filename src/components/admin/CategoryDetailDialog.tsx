"use client";

import {
  Calendar,
  Eye,
  EyeOff,
  FolderTree,
  GitBranch,
  Layers,
  Package,
  Pencil,
  Plus,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { AdminCategoryNode, SizeGroup } from "@/lib/admin/types";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";

interface CategoryDetailDialogProps {
  node: AdminCategoryNode | null;
  parentName?: string | null;
  onClose: () => void;
  onEdit: (node: AdminCategoryNode) => void;
  onToggleActive: (node: AdminCategoryNode) => void;
  onDelete: (node: AdminCategoryNode) => void;
  onAddChild?: (node: AdminCategoryNode) => void;
}

function getSizeGroupBadge(group: SizeGroup | null) {
  if (!group) return null;

  const toneMap: Record<SizeGroup, "info" | "success" | "warning" | "neutral"> = {
    CLOTHING: "info",
    SHOES: "warning",
    KIDS: "success",
    ONE_SIZE: "neutral",
  };

  return (
    <Badge tone={toneMap[group] ?? "neutral"}>
      <Tag className="size-3" aria-hidden="true" />
      <span>{t.admin.sizeGroups[group] ?? group}</span>
    </Badge>
  );
}

export default function CategoryDetailDialog({
  node,
  parentName,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
  onAddChild,
}: CategoryDetailDialogProps) {
  if (!node) return null;

  const isRoot = node.parentId === null;

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
                {node.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={node.imageUrl}
                    alt={node.name}
                    className="size-full rounded-2xl object-cover"
                  />
                ) : isRoot ? (
                  <Layers className="size-6" />
                ) : (
                  <FolderTree className="size-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-heading">{node.name}</h2>
                  <Badge tone={node.isActive ? "success" : "warning"}>
                    {node.isActive ? "نشط" : "مخفي"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs font-mono text-text-secondary dir-ltr text-right">
                  /{node.slug}
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
            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-field-bg p-3">
                <p className="text-[11px] font-semibold text-text-secondary">نوع التصنيف</p>
                <p className="mt-1 text-xs font-bold text-heading">
                  {isRoot ? "تصنيف رئيسي" : "تصنيف فرعي"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-field-bg p-3">
                <p className="text-[11px] font-semibold text-text-secondary">مجموعة المقاسات</p>
                <div className="mt-1">
                  {node.sizeGroup ? (
                    getSizeGroupBadge(node.sizeGroup)
                  ) : (
                    <span className="text-xs text-text-secondary">تعتمد على الفروع</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-field-bg p-3">
                <p className="text-[11px] font-semibold text-text-secondary">ترتيب العرض</p>
                <p className="mt-1 text-xs font-bold text-heading ltr-nums">
                  #{node.sortOrder}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-field-bg p-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
                  <Package className="size-3.5 text-primary" />
                  <span>المنتجات المرتبطة</span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-heading ltr-nums">
                  {formatNumber(node.productsCount)} منتج
                </p>
              </div>

              <div className="rounded-xl border border-border bg-field-bg p-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
                  <Store className="size-3.5 text-text-secondary" />
                  <span>المتاجر النشطة</span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-heading ltr-nums">
                  {formatNumber(node.storesCount)} متجر
                </p>
              </div>

              {isRoot && "childrenCount" in node && (
                <div className="rounded-xl border border-border bg-field-bg p-3">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary">
                    <GitBranch className="size-3.5 text-info" />
                    <span>الفروع التابعة</span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-heading ltr-nums">
                    {formatNumber((node as { childrenCount?: number }).childrenCount ?? 0)} فرعي
                  </p>
                </div>
              )}
            </div>

            {/* الأب إذا كان فرعياً */}
            {!isRoot && parentName && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-xs">
                <span className="font-semibold text-text-secondary">يتبع للتصنيف الرئيسي:</span>
                <span className="font-bold text-primary">{parentName}</span>
              </div>
            )}

            {/* معلومات التواريخ */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-field-bg/50 p-3 text-[11px] text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3 text-text-secondary" />
                <span>تاريخ الإضافة:</span>
                <span className="font-semibold text-heading dir-ltr">{node.createdAt}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3 text-text-secondary" />
                <span>آخر تعديل:</span>
                <span className="font-semibold text-heading dir-ltr">{node.updatedAt}</span>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  onDelete(node);
                }}
                icon={<Trash2 className="size-3.5" />}
              >
                حذف التصنيف
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onToggleActive(node);
                }}
                icon={node.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              >
                {node.isActive ? "إخفاء" : "إظهار"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {isRoot && onAddChild && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onClose();
                    onAddChild(node);
                  }}
                  icon={<Plus className="size-3.5" />}
                >
                  إضافة فرعي
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(node);
                }}
                icon={<Pencil className="size-3.5" />}
              >
                تعديل
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
