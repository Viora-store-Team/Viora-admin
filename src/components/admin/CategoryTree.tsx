"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, Pencil, Plus } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { AdminCategoryRoot } from "@/lib/admin/types";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";

interface CategoryTreeProps {
  roots: AdminCategoryRoot[];
  disabled?: boolean;
  onAddChild: (root: AdminCategoryRoot) => void;
  onEdit: (id: number, name: string, imageUrl: string | null) => void;
}

/**
 * شجرة التصنيفات بمستويين — نفس بنية GET /categories الحقيقية:
 * جذر بلا sizeGroup، وأبناء كل واحد منهم بمجموعة مقاسات إلزامية.
 *
 * ما في زر حذف عمداً: قواعد الحذف (شو بيصير للمنتجات تحت التصنيف) لسا ما
 * تحدّدت مع الباك إند، وزر بيحذف بلا قاعدة واضحة أخطر من غيابه.
 */
export default function CategoryTree({
  roots,
  disabled = false,
  onAddChild,
  onEdit,
}: CategoryTreeProps) {
  // كل الجذور مفتوحة بالبداية — الشجرة صغيرة والطيّ للتنظيم مش للأداء
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className="flex flex-col gap-3">
      {roots.map((root) => {
        const isOpen = !collapsed.has(root.id);

        return (
          <li
            key={root.id}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(root.id)}
                aria-expanded={isOpen}
                aria-label={
                  isOpen ? t.admin.categories.collapse : t.admin.categories.expand
                }
                className="grid size-8 shrink-0 place-items-center rounded-lg text-text-secondary transition hover:bg-field-bg hover:text-heading"
              >
                {isOpen ? (
                  <ChevronDown className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="size-4" aria-hidden="true" />
                )}
              </button>

              <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-heading">
                {root.name}
              </span>

              <Badge tone="neutral">
                <span className="ltr-nums">
                  {formatNumber(root.productsCount)}
                </span>
                {t.admin.categories.productsUnit}
              </Badge>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onEdit(root.id, root.name, root.imageUrl)}
                  icon={<Pencil className="size-3.5" aria-hidden="true" />}
                >
                  {t.common.edit}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onAddChild(root)}
                  icon={<Plus className="size-3.5" aria-hidden="true" />}
                >
                  {t.admin.categories.addChild}
                </Button>
              </div>
            </div>

            {isOpen && (
              <ul className="border-t border-border/70 bg-field-bg/40">
                {root.children.length === 0 ? (
                  <li className="px-4 py-3 ps-14 text-xs text-text-secondary">
                    {t.admin.categories.noChildren}
                  </li>
                ) : (
                  root.children.map((child) => (
                    <li
                      key={child.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2 px-4 py-2.5 ps-14",
                        "border-b border-border/50 last:border-b-0",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-heading">
                        {child.name}
                      </span>

                      {/* مجموعة المقاسات ظاهرة دايماً — هي اللي بتربط التصنيف بنظام المنتجات */}
                      <Badge tone="info">
                        {t.admin.sizeGroups[child.sizeGroup]}
                      </Badge>

                      <Badge tone="neutral">
                        <span className="ltr-nums">
                          {formatNumber(child.productsCount)}
                        </span>
                        {t.admin.categories.productsUnit}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onEdit(child.id, child.name, child.imageUrl)}
                        icon={<Pencil className="size-3.5" aria-hidden="true" />}
                      >
                        {t.common.edit}
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
